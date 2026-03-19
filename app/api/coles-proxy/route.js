import "server-only";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CACHE_FILE = join(process.cwd(), ".coles-build-id-cache.json");
const COLES_CACHE_TTL = 30 * 60 * 1000; // 30 min

let memCache = { buildId: null, cachedAt: null };

function loadDiskCache() {
  try {
    const raw = readFileSync(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.buildId && parsed.cachedAt) {
      memCache = parsed;
    }
  } catch {
    // No cache file yet — that's fine
  }
}

function saveDiskCache(buildId) {
  const entry = { buildId, cachedAt: Date.now() };
  memCache = entry;
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(entry), "utf8");
  } catch (e) {
    console.warn("Could not write Coles buildId cache:", e.message);
  }
}

loadDiskCache();

const COLES_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
  "Accept-Language": "en-AU,en;q=0.9",
  Referer: "https://www.coles.com.au/",
};

async function getColesBuildId() {
  const now = Date.now();
  if (memCache.buildId && memCache.cachedAt && now - memCache.cachedAt < COLES_CACHE_TTL) {
    console.log("Coles buildId from memory cache:", memCache.buildId);
    return memCache.buildId;
  }

  console.log("Fetching fresh Coles buildId from homepage...");
  try {
    const res = await fetch("https://www.coles.com.au", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-AU,en;q=0.9",
      },
    });
    console.log("Coles homepage response status:", res.status);
    if (res.ok) {
      const html = await res.text();
      console.log("Coles homepage HTML length:", html.length);
      const match =
        html.match(/"buildId"\s*:\s*"([^"]+)"/) ||
        html.match(/<script id="__NEXT_DATA__"[^>]*>[\s\S]*?"buildId"\s*:\s*"([^"]+)"/);
      if (match?.[1]) {
        console.log("Coles buildId found:", match[1]);
        saveDiskCache(match[1]);
        return match[1];
      } else {
        console.warn("Coles buildId not found in HTML. First 500 chars:", html.slice(0, 500));
      }
    }
  } catch (e) {
    console.warn("Coles homepage fetch failed:", e.message);
  }

  if (memCache.buildId) {
    console.warn("Using stale Coles buildId as fallback:", memCache.buildId);
    return memCache.buildId;
  }

  console.warn("No Coles buildId available at all");
  return null;
}

// ─── Normalisation ────────────────────────────────────────────────────────────

function extractQuantity(name) {
  const weightVol = name.match(/(\d+(\.\d+)?)\s*(ml|l|g|kg)/i);
  if (weightVol) return { value: parseFloat(weightVol[1]), unit: weightVol[3].toLowerCase() };
  const sheets = name.match(/(\d+(\.\d+)?)\s*(sheets?)/i);
  if (sheets) return { value: parseFloat(sheets[1]), unit: "sheets" };
  const pack = name.match(/(\d+(\.\d+)?)\s*(pk|pack|rolls?)/i);
  if (pack) return { value: parseFloat(pack[1]), unit: pack[3].toLowerCase() };
  return null;
}

function toBaseUnit(value, unit) {
  switch (unit) {
    case "ml": return { value: value / 1000, unit: "l" };
    case "l": return { value, unit: "l" };
    case "g": return { value: value / 1000, unit: "kg" };
    case "kg": return { value, unit: "kg" };
    case "sheets":
    case "sheet": return { value: value / 100, unit: "100 sheets" };
    default: return { value, unit };
  }
}

function getNormalisedPrice(price, name) {
  const raw = extractQuantity(name);
  if (!raw) return null;
  const base = toBaseUnit(raw.value, raw.unit);
  if (base.value === 0) return null;
  return { normalisedPrice: price / base.value, unit: base.unit };
}

const REJECT_KEYWORDS = [
  "frother", "maker", "machine", "appliance", "grinder", "blender",
  "chocolate", "syrup", "supplement", "protein", "candle", "soap",
  "detergent", "cleaner", "bleach", "wrap", "foil", "sponge", "brush",
];
const VAGUE_UNITS = ["each", "ea", "1each", "per each"];

function isRelevantProduct(name, query) {
  const lname = name.toLowerCase();
  if (!lname.includes(query.toLowerCase())) return false;
  if (REJECT_KEYWORDS.some((kw) => lname.includes(kw))) return false;
  return true;
}

function scoreCandidate(p, query) {
  if (!isRelevantProduct(p.name, query)) return Infinity;
  const norm = getNormalisedPrice(p.price, p.name);
  const isVague = !norm || VAGUE_UNITS.some((u) => p.name.toLowerCase().includes(u));
  const base = norm ? norm.normalisedPrice : p.price * 10;
  return isVague ? base + 10000 : base;
}

function buildResult(best, query) {
  if (!best) return null;
  const norm = getNormalisedPrice(best.price, best.name);
  // Fall back to pre-calculated unit price from Coles API if we couldn't parse it
  const normalisedPrice = norm?.normalisedPrice ?? best.unitPrice ?? null;
  const normalisedUnit = norm?.unit ?? best.unitPriceLabel ?? null;
  return {
    price: best.price,
    normalisedPrice,
    normalisedUnit,
    productName: best.name,
    url: best.url ?? `https://www.coles.com.au/search?q=${encodeURIComponent(query)}`,
  };
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) {
    return Response.json({ error: "Missing q param" }, { status: 400 });
  }

  const buildId = await getColesBuildId();
  console.log("Coles buildId result:", buildId);
  console.log("Coles cache state:", JSON.stringify(memCache));

  if (!buildId) {
    return Response.json({ error: "Could not fetch Coles buildId" }, { status: 502 });
  }

  const url = `https://www.coles.com.au/_next/data/${buildId}/en/search/products.json?q=${encodeURIComponent(q)}`;
  console.log("Coles search URL:", url);

  try {
    const res = await fetch(url, { headers: COLES_HEADERS });
    console.log("Coles search response status:", res.status, "for query:", q);

    if (!res.ok) {
      // BuildId likely expired — clear cache so next request refreshes
      memCache = { buildId: null, cachedAt: null };
      saveDiskCache(null);
      return Response.json({ error: `Coles returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const results = data?.pageProps?.searchResults?.results;
    console.log("Coles results count:", Array.isArray(results) ? results.length : "not array");

    if (!Array.isArray(results) || results.length === 0) {
      return Response.json({ result: null });
    }

    const candidates = results
      .map((r) => {
        const baseName = r.name ?? r.Name ?? "";
        const size = r.size ?? r.Size ?? r.packageSize ?? r.PackageSize ?? "";
        // Append size to name if not already present — needed for normalisation
        const fullName = size && !baseName.toLowerCase().includes(size.toLowerCase())
          ? `${baseName} ${size}`
          : baseName;
        return {
          name: fullName,
          price: r?.pricing?.now ?? r?.Price?.now ?? r?.price ?? null,
          url: r.slug ? `https://www.coles.com.au/product/${r.slug}` : null,
        };
      })
      .filter((c) => typeof c.price === "number" && c.price > 0);

    console.log("Coles candidates:", candidates.slice(0, 3).map(c => `${c.name} $${c.price}`));

    if (candidates.length === 0) return Response.json({ result: null });

    let best = null, bestScore = Infinity;
    for (const c of candidates) {
      const score = scoreCandidate(c, q);
      if (score < bestScore) { bestScore = score; best = c; }
    }

    console.log("Coles best pick:", best?.name, "$" + best?.price);
    return Response.json({ result: buildResult(best, q) });
  } catch (e) {
    console.error("Coles proxy error:", e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
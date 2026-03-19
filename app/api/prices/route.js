/**
 * Live price lookup: Woolworths and Aldi server-side.
 * Coles is proxied via /api/coles-proxy (see that route file).
 */

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-AU,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.woolworths.com.au/",
  Origin: "https://www.woolworths.com.au",
  "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

// ─── Quantity normalisation ───────────────────────────────────────────────────

// Prioritise weight/volume over pack count.
// e.g. "Roti Bread 8 Pack 640g" should match 640g, not 8 Pack.
function extractQuantity(name) {
  // First pass: look for weight or volume (preferred)
  const weightVol = name.match(/(\d+(\.\d+)?)\s*(ml|l|g|kg)/i);
  if (weightVol) {
    return { value: parseFloat(weightVol[1]), unit: weightVol[3].toLowerCase() };
  }
  // Second pass: sheets
  const sheets = name.match(/(\d+(\.\d+)?)\s*(sheets?)/i);
  if (sheets) {
    return { value: parseFloat(sheets[1]), unit: "sheets" };
  }
  // Last resort: pack/roll count
  const pack = name.match(/(\d+(\.\d+)?)\s*(pk|pack|rolls?)/i);
  if (pack) {
    return { value: parseFloat(pack[1]), unit: pack[3].toLowerCase() };
  }
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

function getNormalisedPrice(price, productName) {
  const raw = extractQuantity(productName);
  if (!raw) return null;
  const base = toBaseUnit(raw.value, raw.unit);
  if (base.value === 0) return null;
  return { normalisedPrice: price / base.value, unit: base.unit };
}

// ─── Relevance filtering ──────────────────────────────────────────────────────

const REJECT_KEYWORDS = [
  "frother", "maker", "machine", "appliance", "grinder", "blender",
  "chocolate", "syrup", "supplement", "protein", "candle", "soap",
  "detergent", "cleaner", "bleach", "wrap", "foil", "sponge", "brush",
];

const REJECT_CATEGORIES = [
  "tea, coffee", "kitchenware", "appliance", "cleaning",
  "electronics", "clothing", "toys", "garden", "tools",
];

const VAGUE_UNITS = ["each", "ea", "1each", "per each"];

function isRelevantProduct(name, categories, query) {
  const lname = name.toLowerCase();
  if (!lname.includes(query.toLowerCase())) return false;
  if (REJECT_KEYWORDS.some((kw) => lname.includes(kw))) return false;
  if (categories?.length) {
    const catStr = categories.map((c) => (c.name || c).toLowerCase()).join(" ");
    if (REJECT_CATEGORIES.some((rc) => catStr.includes(rc))) return false;
  }
  return true;
}

function scoreCandidate(p) {
  const norm = getNormalisedPrice(p.price, p.name);
  const isVague = !norm || VAGUE_UNITS.some((u) => p.name.toLowerCase().includes(u));
  const base = norm ? norm.normalisedPrice : p.price * 10;
  return isVague ? base + 10000 : base;
}

function pickBestProduct(candidates, query) {
  const relevant = candidates.filter((p) =>
    isRelevantProduct(p.name, p.categories ?? [], query)
  );
  const pool = relevant.length > 0 ? relevant : candidates;
  let best = null, bestScore = Infinity;
  for (const p of pool) {
    const score = scoreCandidate(p);
    if (score < bestScore) { bestScore = score; best = p; }
  }
  return best;
}

function buildResult(best) {
  if (!best) return null;
  const norm = getNormalisedPrice(best.price, best.name);
  return {
    price: best.price,
    normalisedPrice: norm?.normalisedPrice ?? null,
    normalisedUnit: norm?.unit ?? null,
    productName: best.name,
    url: best.url ?? null,
  };
}

// ─── Woolworths ───────────────────────────────────────────────────────────────

async function searchWoolworths(searchTerm) {
  const url = `https://www.woolworths.com.au/apis/ui/Search/products?searchTerm=${encodeURIComponent(searchTerm)}&pageNumber=1`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  const topLevel = data.Products ?? data.products ?? [];
  const candidates = [];

  for (const entry of topLevel) {
    const nested = entry.Products ?? entry.products;
    if (Array.isArray(nested)) {
      for (const p of nested) {
        const price = p.Price ?? p.SalePrice ?? p.Pricing?.SalePrice ?? p.Pricing?.Now ?? p.price;
        const slug = p.UrlFriendlyName ?? p.urlFriendlyName ?? null;
        const stockcode = p.Stockcode ?? p.stockcode ?? "";
        if (typeof price === "number" && price > 0) {
          const baseName = p.Name ?? p.name ?? "";
          const packageSize = p.PackageSize ?? p.packageSize ?? "";
          const fullName = packageSize && !baseName.toLowerCase().includes(packageSize.toLowerCase())
            ? `${baseName} ${packageSize}`
            : baseName;
          candidates.push({
            name: fullName,
            price,
            categories: [],
            url: slug
              ? `https://www.woolworths.com.au/shop/productdetails/${stockcode}/${slug}`
              : null,
          });
        }
      }
    } else {
      const price = entry.Price ?? entry.SalePrice ?? entry.price ?? entry.salePrice;
      const slug = entry.UrlFriendlyName ?? entry.urlFriendlyName ?? null;
      const stockcode = entry.Stockcode ?? entry.stockcode ?? "";
      if (typeof price === "number" && price > 0) {
        const baseName = entry.Name ?? entry.name ?? "";
        const packageSize = entry.PackageSize ?? entry.packageSize ?? "";
        const fullName = packageSize && !baseName.toLowerCase().includes(packageSize.toLowerCase())
          ? `${baseName} ${packageSize}`
          : baseName;
        candidates.push({
          name: fullName,
          price,
          categories: [],
          url: slug
            ? `https://www.woolworths.com.au/shop/productdetails/${stockcode}/${slug}`
            : null,
        });
      }
    }
  }

  if (candidates.length === 0) return null;
  return buildResult(pickBestProduct(candidates, searchTerm));
}

// ─── Aldi ─────────────────────────────────────────────────────────────────────

async function searchAldi(searchTerm) {
  const url = `https://api.aldi.com.au/v3/product-search-suggestion?serviceType=walk-in&q=${encodeURIComponent(searchTerm)}&servicePoint=G452`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  const products = data?.data?.products;
  if (!Array.isArray(products) || products.length === 0) return null;

  const allCandidates = products
    .filter((p) => p?.price?.amount != null)
    .map((p) => ({
      name: p.name ?? "",
      price: p.price.amount / 100,
      categories: p.categories ?? [],
      notForSale: p.notForSale === true,
      // Use a search URL — Aldi product slugs don't resolve to stable product pages
      url: `https://www.aldi.com.au/en/search/?q=${encodeURIComponent(p.name ?? searchTerm)}`,
    }));

  if (allCandidates.length === 0) return null;
  const forSale = allCandidates.filter((p) => !p.notForSale);
  const pool = forSale.length > 0 ? forSale : allCandidates;
  return buildResult(pickBestProduct(pool, searchTerm));
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

async function fetchPricesForItem(searchTerm) {
  const [woolworths, aldi] = await Promise.allSettled([
    searchWoolworths(searchTerm).catch((e) => {
      console.warn("Woolworths error:", e.message);
      return null;
    }),
    searchAldi(searchTerm).catch((e) => {
      console.warn("Aldi error:", e.message);
      return null;
    }),
  ]);
  return {
    woolworths: woolworths.status === "fulfilled" ? woolworths.value : null,
    coles: null,
    aldi: aldi.status === "fulfilled" ? aldi.value : null,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return Response.json(
        { pricesByItem: {}, errors: ["No items provided"] },
        { status: 400 }
      );
    }

    const errors = [];
    const pricesByItem = {};
    const terms = [
      ...new Set(items.map((i) => (i.name || "").trim().toLowerCase()).filter(Boolean)),
    ];

    for (const term of terms) {
      try {
        const prices = await fetchPricesForItem(term);
        pricesByItem[term] = prices;
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        errors.push(`${term}: ${e.message || "fetch failed"}`);
        pricesByItem[term] = { woolworths: null, coles: null, aldi: null };
      }
    }

    return Response.json({ pricesByItem, errors });
  } catch (e) {
    return Response.json(
      { pricesByItem: {}, errors: [e.message || "Server error"] },
      { status: 500 }
    );
  }
}
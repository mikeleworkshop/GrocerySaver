"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { AppNav } from "../components/AppNav";
import { dummyPriceDatabase, getCheapestStore } from "../data/dummyPrices";
import { useGroceryListFirestore } from "../hooks/useGroceryListFirestore";
import { calculateBasketTotals } from "../lib/cheapestBasket";
import { useAuth } from "../contexts/AuthContext";

const STORE_LABELS = { aldi: "Aldi", coles: "Coles", woolworths: "Woolworths" };
const STORES = ["aldi", "coles", "woolworths"];

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatNormalisedAsStandard(normalisedPrice, normalisedUnit) {
  if (normalisedPrice == null || normalisedUnit == null) return null;
  return `$${Number(normalisedPrice).toFixed(2)}/${normalisedUnit}`;
}

function formatPrice(value) {
  return value == null ? "N/A" : `$${Number(value).toFixed(2)}`;
}

// ─── Price lookup helpers ─────────────────────────────────────────────────────

function flattenForBasket(livePricesByItem) {
  const out = {};
  for (const [item, stores] of Object.entries(livePricesByItem)) {
    out[item] = {};
    for (const store of STORES) {
      const price = stores[store]?.price;
      if (typeof price === "number" && price > 0) {
        out[item][store] = price;
      }
    }
  }
  return out;
}

function getStorePrices(itemName, livePricesByItem) {
  const key = itemName.trim().toLowerCase();
  if (livePricesByItem) {
    return livePricesByItem[key] ?? { aldi: null, coles: null, woolworths: null };
  }
  const dummy = dummyPriceDatabase[key];
  if (!dummy) return { aldi: null, coles: null, woolworths: null };
  return {
    aldi:       dummy.aldi       != null ? { price: dummy.aldi,       normalisedPrice: null, normalisedUnit: null, productName: null, url: null } : null,
    coles:      dummy.coles      != null ? { price: dummy.coles,      normalisedPrice: null, normalisedUnit: null, productName: null, url: null } : null,
    woolworths: dummy.woolworths != null ? { price: dummy.woolworths, normalisedPrice: null, normalisedUnit: null, productName: null, url: null } : null,
  };
}

// ─── PriceCell ────────────────────────────────────────────────────────────────

function PriceCell({ storeResult, quantity }) {
  if (!storeResult || storeResult.price == null) {
    return <span className="text-muted">N/A</span>;
  }

  const actualTotal = storeResult.price * quantity;
  const normLabel = formatNormalisedAsStandard(storeResult.normalisedPrice, storeResult.normalisedUnit);

  const inner = (
    <span>
      <span className="fw-semibold" style={{ fontSize: "0.95rem" }}>
        {formatPrice(actualTotal)}
      </span>
      {normLabel && (
        <span className="d-block" style={{ fontSize: "0.72rem", color: "var(--ss-muted)" }}>
          {normLabel}
        </span>
      )}
      {storeResult.productName && (
        <span className="d-block" style={{ fontSize: "0.72rem", color: "var(--ss-muted)" }}>
          {storeResult.productName}
        </span>
      )}
    </span>
  );

  if (storeResult.url) {
    return (
      <a
        href={storeResult.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {inner}
        <span style={{ fontSize: "0.68rem", color: "var(--ss-primary)", display: "block" }}>
          ↗ view
        </span>
      </a>
    );
  }
  return inner;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StorePricesPage() {
  const { user, authLoading } = useAuth();
  const { list, loading } = useGroceryListFirestore(user);
  const year = new Date().getFullYear();
  const [livePricesByItem, setLivePricesByItem] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const flatPrices = livePricesByItem ? flattenForBasket(livePricesByItem) : dummyPriceDatabase;
  const basketResult = list.length > 0 ? calculateBasketTotals(list, flatPrices) : null;

  const fetchLivePrices = useCallback(async () => {
    if (!list.length) return;
    setFetchLoading(true);
    setFetchError(null);
    try {
      // Step 1: Woolworths + Aldi server-side
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: list }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data?.errors?.join(" ") || "Failed to fetch prices");
        return;
      }

      const combined = data.pricesByItem || {};

      // Step 2: Coles via server-side proxy (avoids CORS)
      const terms = [
        ...new Set(list.map((i) => (i.name || "").trim().toLowerCase()).filter(Boolean)),
      ];
      await Promise.all(
        terms.map(async (term) => {
          try {
            const colesRes = await fetch(`/api/coles-proxy?q=${encodeURIComponent(term)}`);
            if (colesRes.ok) {
              const colesData = await colesRes.json();
              const colesResult = colesData.result ?? null;
              if (combined[term]) {
                combined[term].coles = colesResult;
              } else {
                combined[term] = { woolworths: null, coles: colesResult, aldi: null };
              }
            }
          } catch (e) {
            console.warn("Coles proxy fetch failed for", term, e.message);
          }
        })
      );

      setLivePricesByItem({ ...combined });
      if (data.errors?.length) setFetchError(data.errors.join(" "));
    } catch (e) {
      setFetchError(e.message || "Network error");
    } finally {
      setFetchLoading(false);
    }
  }, [list]);

  const rows = list.map((item) => {
    const storePrices = getStorePrices(item.name, livePricesByItem);
    const priceMap = {};
    if (storePrices.aldi?.price != null)       priceMap.aldi       = storePrices.aldi.price;
    if (storePrices.coles?.price != null)      priceMap.coles      = storePrices.coles.price;
    if (storePrices.woolworths?.price != null) priceMap.woolworths = storePrices.woolworths.price;
    const cheapestStore = Object.keys(priceMap).length > 0 ? getCheapestStore(priceMap) : null;
    return { ...item, storePrices, cheapestStore };
  });

  const totals = basketResult?.totalsByStore ?? { aldi: 0, coles: 0, woolworths: 0 };
  const bestStore = basketResult?.bestStore ?? null;
  const hasLivePrices = livePricesByItem != null;

  return (
    <>
      <AppNav currentPath="/store-prices" />
      <main className="hero-section">
        <div className="container">
          <div className="mb-4">
            <h1 className="hero-title mb-2">
              Store <span className="hero-highlight">price comparison</span>
            </h1>
            <p className="hero-subtitle mb-0">
              See how much each item costs at Aldi, Coles, and Woolworths.
              Totals show the cheapest basket for your list.
            </p>
          </div>

          {/* Recommendation banner */}
          {!loading && list.length > 0 && basketResult && (
            <div
              className="hero-card p-4 mb-4 border-2"
              style={{ borderColor: "var(--ss-accent)", borderStyle: "solid", borderRadius: "1rem" }}
            >
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    backgroundColor: "var(--ss-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    flexShrink: 0,
                  }}
                >
                  🏆
                </div>
                <div className="flex-grow-1">
                  <h5 className="mb-1 fw-bold">
                    Shop at <span style={{ color: "var(--ss-accent)" }}>{STORE_LABELS[bestStore]}</span> to save the most
                  </h5>
                  <p className="mb-0 text-muted small">
                    Your cheapest basket is{" "}
                    <strong className="text-dark">{formatPrice(totals[bestStore])}</strong>
                    {(() => {
                      const worstTotal = Math.max(...Object.values(totals).filter(Boolean));
                      const savings = worstTotal - totals[bestStore];
                      return savings > 0 ? (
                        <> — you save <strong className="text-success">{formatPrice(savings)}</strong> vs the most expensive option</>
                      ) : null;
                    })()}
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  {Object.entries(totals)
                    .sort((a, b) => a[1] - b[1])
                    .map(([store, total], i) => (
                      <div
                        key={store}
                        className="text-center px-3 py-2 rounded-3"
                        style={{
                          backgroundColor: store === bestStore ? "var(--ss-accent)" : "#f1f3f5",
                          color: store === bestStore ? "#fff" : "#555",
                          minWidth: 90,
                        }}
                      >
                        <div className="fw-bold small">{STORE_LABELS[store]}</div>
                        <div className="fw-semibold">{formatPrice(total)}</div>
                        {i === 0 && <div style={{ fontSize: 10 }}>CHEAPEST</div>}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div className="hero-card p-4 mb-4">
            {authLoading || loading ? (
              <p className="text-muted small mb-0">Loading your list…</p>
            ) : list.length === 0 ? (
              <div className="text-center py-3">
                <p className="mb-2">Your list is empty.</p>
                <Link href="/" className="btn btn-primary btn-sm"
                  style={{ backgroundColor: "var(--ss-primary)", borderColor: "var(--ss-primary)" }}>
                  Add items on Grocery List
                </Link>
              </div>
            ) : (
              <>
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <p className="text-muted small mb-0">
                    {hasLivePrices
                      ? "Live prices shown — normalised to standard units. Click a price to view the product."
                      : "Sample prices shown. Click below to fetch live prices."}
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ backgroundColor: "var(--ss-primary)", borderColor: "var(--ss-primary)" }}
                    onClick={fetchLivePrices}
                    disabled={fetchLoading}
                  >
                    {fetchLoading ? "Fetching…" : "Fetch live prices"}
                  </button>
                </div>

                {fetchError && (
                  <div className="alert alert-warning py-2 mb-3 small" role="alert">
                    {fetchError}
                  </div>
                )}

                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="text-center">Qty</th>
                        <th className="text-end">Aldi</th>
                        <th className="text-end">Coles</th>
                        <th className="text-end">Woolworths</th>
                        <th>Cheapest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td className="fw-semibold">{row.name}</td>
                          <td className="text-center">{row.quantity}</td>
                          <td className="text-end">
                            <PriceCell storeResult={row.storePrices.aldi} quantity={row.quantity} />
                          </td>
                          <td className="text-end">
                            <PriceCell storeResult={row.storePrices.coles} quantity={row.quantity} />
                          </td>
                          <td className="text-end">
                            <PriceCell storeResult={row.storePrices.woolworths} quantity={row.quantity} />
                          </td>
                          <td>
                            {row.cheapestStore
                              ? <span className="pill text-nowrap">{STORE_LABELS[row.cheapestStore]}</span>
                              : <span className="text-muted">N/A</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light">
                      <tr className="fw-bold">
                        <td colSpan={2}>Basket total</td>
                        <td className="text-end">{totals.aldi       ? formatPrice(totals.aldi)       : "N/A"}</td>
                        <td className="text-end">{totals.coles      ? formatPrice(totals.coles)      : "N/A"}</td>
                        <td className="text-end">{totals.woolworths ? formatPrice(totals.woolworths) : "N/A"}</td>
                        <td>
                          {bestStore
                            ? <span className="badge rounded-pill"
                                style={{ backgroundColor: "var(--ss-accent)", color: "#fff" }}>
                                Best: {STORE_LABELS[bestStore]}
                              </span>
                            : "N/A"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>

          {list.length > 0 && (
            <div className="hero-card p-4">
              <h5 className="mb-2">Summary</h5>
              <ul className="list-unstyled mb-0 text-muted small">
                {STORES.map((store) => (
                  <li key={store} className="mb-1">
                    <strong className="text-dark">{STORE_LABELS[store]}</strong> →{" "}
                    {totals[store] ? formatPrice(totals[store]) : "N/A"}
                  </li>
                ))}
                {bestStore && (
                  <li className="mt-2 pt-2 border-top">
                    <strong className="text-dark">Cheapest basket:</strong>{" "}
                    {STORE_LABELS[bestStore]} at {formatPrice(totals[bestStore])}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* <div className="mt-4 p-3 rounded-3 bg-light border">
            <h6 className="mb-2">How prices are fetched</h6>
            <p className="small text-muted mb-0">
              Woolworths and Aldi are fetched server-side. Coles is fetched via
              a server-side proxy to avoid browser CORS restrictions. All prices
              are normalised to standard units (per kg, per L, per 100 sheets)
              — weight and volume always take priority over pack counts. Click
              any price to view the product listing. If no match is found, that
              cell shows N/A.
            </p>
          </div> */}
        </div>
      </main>

      <footer className="footer py-4">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <span className="text-muted small">
            © <span>{year}</span> StudentSaver. All rights reserved.
          </span>
          <span className="text-muted small">
            Prices fetched live from Aldi, Coles &amp; Woolworths.
          </span>
        </div>
      </footer>
    </>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppNav } from "../components/AppNav";
import { useGroceryListFirestore } from "../hooks/useGroceryListFirestore";
import { useAuth } from "../contexts/AuthContext";
import { calculateBasketTotals } from "../lib/cheapestBasket";
import { dummyPriceDatabase } from "../data/dummyPrices";

const STORE_LABELS = { aldi: "Aldi", coles: "Coles", woolworths: "Woolworths" };

export default function BudgetPage() {
  const year = new Date().getFullYear();
  const { user, authLoading } = useAuth();
  const { list, loading, firebaseError } = useGroceryListFirestore(user);
  const [budget, setBudget] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const saved = localStorage.getItem("studentSaver_budget");
    if (saved !== null && saved !== "") setBudget(saved);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || budget === "") return;
    localStorage.setItem("studentSaver_budget", budget);
  }, [mounted, budget]);

  const budgetNum = parseFloat(String(budget).replace(/[^0-9.]/g, "")) || 0;
  const basketResult = list.length > 0 ? calculateBasketTotals(list, dummyPriceDatabase) : null;
  const basketTotal = basketResult?.bestTotal ?? null;
  const remaining = basketTotal != null && budgetNum > 0 ? budgetNum - basketTotal : null;
  const mostExpensiveStore = basketResult?.totalsByStore
    ? Object.entries(basketResult.totalsByStore).reduce((a, b) => (b[1] > a[1] ? b : a), ["", 0])[0]
    : null;
  const savingsVsWorst = basketTotal != null && mostExpensiveStore
    ? (basketResult.totalsByStore[mostExpensiveStore] ?? 0) - basketTotal
    : 0;
  const fillPct =
    basketTotal != null && budgetNum > 0
      ? Math.min(100, (basketTotal / budgetNum) * 100)
      : 0;

  return (
    <>
      <AppNav currentPath="/budget" />

      <main className="ss-page">
        <div className="container">

          {/* Page heading */}
          <div className="mb-4">
            <h1 className="ss-page-title mb-1">
              Your <span className="ss-highlight">budget</span>
            </h1>
            <p className="ss-page-sub">
              Set your weekly grocery budget and track spending across stores.
            </p>
          </div>

          {firebaseError && (
            <div className="ss-warning" role="alert">
              List may not be synced: {firebaseError}
            </div>
          )}

          {/* Sign-in gate */}
          {!authLoading && !user && (
            <div className="ss-card mb-4 d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3">
              <div style={{ flex: 1 }}>
                <p className="fw-semibold mb-1" style={{ fontSize: "0.95rem" }}>Sign in required</p>
                <p className="mb-0" style={{ fontSize: "0.85rem", color: "var(--ss-muted)" }}>
                  Please sign in on the Grocery List page to use budget tracking.
                </p>
              </div>
              <Link href="/" className="btn-ss-primary" style={{ textDecoration: "none", flexShrink: 0 }}>
                Go to sign in
              </Link>
            </div>
          )}

          <div className="row g-4">
            {/* Budget input card */}
            <div className="col-lg-6">
              <div className="ss-card h-100">
                <p className="ss-card-title">Weekly budget</p>
                <label htmlFor="budget-input" className="ss-label">Amount ($)</label>
                <div className="ss-input-group mb-2">
                  <span className="ss-input-prefix">$</span>
                  <input
                    id="budget-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 50"
                    className="ss-input"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    aria-label="Weekly budget in dollars"
                  />
                </div>
                {budgetNum > 0 && (
                  <p style={{ fontSize: "0.84rem", color: "var(--ss-muted)", marginTop: "0.5rem" }}>
                    You're budgeting <strong style={{ color: "var(--ss-dark)" }}>${budgetNum.toFixed(2)}</strong> for this shop.
                  </p>
                )}
              </div>
            </div>

            {/* Summary card */}
            <div className="col-lg-6">
              <div className="ss-card h-100">
                <p className="ss-card-title">Summary</p>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <div className="ss-metric">
                    <span className="ss-metric-label">Budget</span>
                    <span className="ss-metric-value">
                      {budgetNum > 0 ? `$${budgetNum.toFixed(2)}` : "—"}
                    </span>
                  </div>
                  <div className="ss-metric">
                    <span className="ss-metric-label">Basket</span>
                    <span className="ss-metric-value">
                      {basketTotal != null ? `$${basketTotal.toFixed(2)}` : "—"}
                    </span>
                  </div>
                  <div className="ss-metric">
                    <span className="ss-metric-label">Remaining</span>
                    <span
                      className="ss-metric-value"
                      style={{
                        color:
                          remaining != null
                            ? remaining >= 0
                              ? "var(--ss-accent)"
                              : "#ef4444"
                            : "var(--ss-dark)",
                      }}
                    >
                      {remaining != null ? `$${remaining.toFixed(2)}` : "—"}
                    </span>
                  </div>
                </div>

                {budgetNum > 0 && (
                  <div className="ss-progress">
                    <div className="ss-progress-fill" style={{ width: `${fillPct}%` }} />
                  </div>
                )}
                {basketResult?.bestStore && (
                  <p className="small text-success mt-2 mb-0">
                    Cheapest basket: <strong>{STORE_LABELS[basketResult.bestStore]}</strong> — ${basketTotal.toFixed(2)}
                  </p>
                )}

                <p style={{ fontSize: "0.8rem", color: "var(--ss-muted)", marginTop: "0.6rem", marginBottom: 0 }}>
                  Basket total will appear once the pricing engine is connected.
                </p>
              </div>
            </div>
          </div>

          {savingsVsWorst > 0 && mostExpensiveStore && basketResult?.bestStore && (
            <div className="ss-card mt-4" style={{ borderColor: "#bbf7d0", borderWidth: 2 }}>
              <h5 className="mb-2">Savings &amp; insights</h5>
              <p className="mb-1">
                You save <strong style={{ color: "var(--ss-accent)" }}>${savingsVsWorst.toFixed(2)}</strong> by shopping at {STORE_LABELS[basketResult.bestStore]} instead of {STORE_LABELS[mostExpensiveStore]}.
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--ss-muted)", marginBottom: 0 }}>
                Budget: ${budgetNum.toFixed(2)} · Cheapest basket: ${basketTotal.toFixed(2)} · Remaining: ${remaining?.toFixed(2) ?? "—"}
              </p>
            </div>
          )}

          {/* Grocery list card */}
          <div className="ss-card mt-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <p className="ss-card-title mb-0">Grocery list</p>
              {list.length > 0 && (
                <Link href="/" style={{ fontSize: "0.82rem", color: "var(--ss-primary)", textDecoration: "none", fontWeight: 600 }}>
                  Edit list
                </Link>
              )}
            </div>

            {authLoading || loading ? (
              <div className="d-flex align-items-center gap-2" style={{ color: "var(--ss-muted)", fontSize: "0.9rem" }}>
                <span className="ss-spinner" />
                Loading your list…
              </div>
            ) : !user ? (
              <p style={{ fontSize: "0.85rem", color: "var(--ss-muted)", marginBottom: 0 }}>
                Sign in to load your grocery list.
              </p>
            ) : list.length === 0 ? (
              <div className="ss-empty">
                <div className="ss-empty-icon">🛒</div>
                <p className="fw-semibold mb-1" style={{ fontSize: "0.95rem" }}>Your list is empty</p>
                <p style={{ fontSize: "0.85rem", color: "var(--ss-muted)", marginBottom: "1rem" }}>
                  Add items on the Grocery List page, then come back to track your budget.
                </p>
                <Link href="/" className="btn-ss-primary" style={{ textDecoration: "none" }}>
                  Go to Grocery List
                </Link>
              </div>
            ) : (
              <>
                <div>
                  {list.map((item, i) => (
                    <div
                      key={item.id}
                      className="d-flex align-items-center justify-content-between py-2"
                      style={{
                        borderBottom: i < list.length - 1 ? "1px solid var(--ss-border)" : "none",
                        fontSize: "0.9rem",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span
                        style={{
                          fontFamily: "monospace",
                          color: "var(--ss-muted)",
                          background: "var(--ss-surface-2)",
                          borderRadius: "999px",
                          padding: "0.15rem 0.6rem",
                          fontSize: "0.82rem",
                        }}
                      >
                        ×{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--ss-muted)", marginTop: "0.75rem", marginBottom: 0 }}>
                  <Link href="/store-prices" style={{ color: "var(--ss-primary)", textDecoration: "none", fontWeight: 600 }}>
                    Compare store prices →
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="ss-footer">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <span style={{ fontSize: "0.82rem", color: "var(--ss-muted)" }}>
            © {year} StudentSaver. All rights reserved.
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--ss-muted)" }}>
            Pricing engine coming soon.
          </span>
        </div>
      </footer>
    </>
  );
}

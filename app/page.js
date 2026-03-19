"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AppNav } from "./components/AppNav";
import { AuthCard } from "./components/AuthCard";
import { useAuth } from "./contexts/AuthContext";

const GroceryListPage = dynamic(
  () => import("./GroceryListPage"),
  { ssr: false }
);

export default function HomePage() {
  const { user, authLoading } = useAuth();
  const year = new Date().getFullYear();

  return (
    <>
      <AppNav currentPath="/" />

      <main className="ss-page">
        <div className="container">
          {authLoading ? (
            <div className="ss-card text-center" style={{ maxWidth: 460, margin: "0 auto" }}>
              <span className="ss-spinner" style={{ margin: "0 auto 0.75rem" }} />
              <p style={{ color: "var(--ss-muted)", marginBottom: 0, fontSize: "0.9rem" }}>
                Checking authentication…
              </p>
            </div>
          ) : user ? (
            <>
              <GroceryListPage />
              <div className="ss-card mt-4 text-center">
                <Link
                  href="/budget"
                  className="btn-ss-primary lg"
                  style={{ textDecoration: "none", display: "inline-flex" }}
                >
                  Finalise list &amp; go to Budget →
                </Link>
              </div>
            </>
          ) : (
            <AuthCard />
          )}
        </div>
      </main>

      <footer className="ss-footer">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
          <span style={{ fontSize: "0.82rem", color: "var(--ss-muted)" }}>
            © {year} StudentSaver. All rights reserved.
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--ss-muted)" }}>
            Grocery list → pricing engine (coming soon).
          </span>
        </div>
      </footer>
    </>
  );
}

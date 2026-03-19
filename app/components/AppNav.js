"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const NAV_LINKS = [
  { href: "/", label: "Grocery List" },
  { href: "/budget", label: "Budget" },
  { href: "/store-prices", label: "Store Prices" },
];

export function AppNav({ currentPath = "/" }) {
  const { user, authLoading, signOutUser } = useAuth();
  const [authError, setAuthError] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSignOut() {
    setAuthError("");
    try {
      await signOutUser();
    } catch (err) {
      setAuthError(err?.message || "Failed to sign out.");
    }
  }

  return (
    <>
      <nav className={`ss-navbar${scrolled ? " scrolled" : ""}`}>
        <div className="container d-flex align-items-center justify-content-between gap-3">
          {/* Brand */}
          <Link className="ss-brand" href="/">
            <span className="ss-brand-icon">SS</span>
            <span style={{ fontSize: "0.95rem" }}>StudentSaver</span>
          </Link>

          {/* Nav links */}
          <ul className="d-none d-md-flex align-items-center gap-1 list-unstyled mb-0">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`ss-nav-link${currentPath === href ? " active" : ""}`}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Auth section */}
          <div className="d-flex align-items-center gap-2">
            {authLoading ? (
              <span className="ss-spinner" />
            ) : user ? (
              <>
                <span className="ss-nav-user d-none d-sm-block">{user.email}</span>
                <button className="btn-ss-ghost" type="button" onClick={handleSignOut}>
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/" className="btn-ss-primary" style={{ textDecoration: "none" }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {authError && (
        <div className="container" style={{ marginTop: "72px" }}>
          <div className="ss-error" role="alert">{authError}</div>
        </div>
      )}
    </>
  );
}

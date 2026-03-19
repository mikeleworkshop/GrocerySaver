"use client";

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

function getFriendlyError(message = "") {
  if (message.includes("auth/email-already-in-use"))
    return "This email is already registered. Try signing in instead.";
  if (message.includes("auth/invalid-credential"))
    return "Incorrect email or password.";
  if (message.includes("auth/invalid-email"))
    return "Please enter a valid email address.";
  if (message.includes("auth/weak-password"))
    return "Password must be at least 6 characters.";
  if (message.includes("auth/too-many-requests"))
    return "Too many attempts. Please try again later.";
  return "Authentication failed. Please try again.";
}

export function AuthCard() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function switchMode(next) {
    setMode(next);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "signUp" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signUp") {
        await signUpWithEmail(trimmedEmail, password);
      } else {
        await signInWithEmail(trimmedEmail, password);
      }
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getFriendlyError(err?.message || ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ss-auth-wrap ss-fade-in">
      {/* Logo + heading */}
      <div className="ss-auth-logo">
        <div className="ss-auth-logo-icon">SS</div>
        <h1 className="ss-auth-heading">
          {mode === "signIn" ? "Welcome back" : "Create account"}
        </h1>
        <p className="ss-auth-sub">
          {mode === "signIn"
            ? "Sign in to access your grocery list."
            : "Start saving smarter today."}
        </p>
      </div>

      <div className="ss-card">
        {/* Tab switcher */}
        <div className="ss-tab-bar" role="group" aria-label="Auth mode">
          <button
            type="button"
            className={`ss-tab${mode === "signIn" ? " active" : ""}`}
            onClick={() => switchMode("signIn")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`ss-tab${mode === "signUp" ? " active" : ""}`}
            onClick={() => switchMode("signUp")}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ss-field">
            <label htmlFor="auth-email" className="ss-label">Email</label>
            <input
              id="auth-email"
              type="email"
              className="ss-input"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="ss-field">
            <label htmlFor="auth-password" className="ss-label">Password</label>
            <input
              id="auth-password"
              type="password"
              className="ss-input"
              placeholder="At least 6 characters"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === "signUp" && (
            <div className="ss-field">
              <label htmlFor="auth-confirm-password" className="ss-label">
                Confirm password
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                className="ss-input"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="ss-error" role="alert">{error}</div>
          )}

          <button
            type="submit"
            className="btn-ss-primary lg w-100"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className="ss-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Please wait…
              </>
            ) : mode === "signIn" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </button>
        </form>
      </div>

      <p className="text-center mt-3" style={{ fontSize: "0.8rem", color: "var(--ss-muted)" }}>
        {mode === "signIn" ? "Don't have an account? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => switchMode(mode === "signIn" ? "signUp" : "signIn")}
          style={{ background: "none", border: "none", color: "var(--ss-primary)", fontWeight: 600, cursor: "pointer", padding: 0, fontSize: "inherit" }}
        >
          {mode === "signIn" ? "Register" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

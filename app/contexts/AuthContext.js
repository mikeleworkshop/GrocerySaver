"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../../firebase/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => {};

    async function initAuth() {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.warn("Auth persistence setup failed:", err);
      }

      const authUnsubscribe = onAuthStateChanged(auth, (nextUser) => {
        if (!isMounted) return;
        setUser(nextUser);
        setAuthLoading(false);
      });
      if (isMounted) {
        unsubscribe = authUnsubscribe;
      } else {
        authUnsubscribe();
      }
    }

    initAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signUpWithEmail = useCallback((email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const signInWithEmail = useCallback((email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOutUser = useCallback(() => signOut(auth), []);

  const value = useMemo(
    () => ({
      user,
      authLoading,
      signUpWithEmail,
      signInWithEmail,
      signOutUser,
    }),
    [authLoading, signInWithEmail, signOutUser, signUpWithEmail, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

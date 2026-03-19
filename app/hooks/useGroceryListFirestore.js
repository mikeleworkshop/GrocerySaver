"use client";

import { useState, useEffect, useCallback } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";

const COLLECTION = "groceryLists";

function useGroceryListFirestore(user) {
  const [list, setListState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState(null);

  const writeList = useCallback(async (uid, newList) => {
    try {
      const ref = doc(db, COLLECTION, uid);
      await setDoc(ref, {
        items: newList,
        updatedAt: serverTimestamp(),
      });
      setFirebaseError(null);
    } catch (err) {
      console.warn("Firestore write failed:", err);
      setFirebaseError(err.message || "Failed to save list");
    }
  }, []);

  const setList = useCallback(
    (nextList) => {
      setListState((prevList) => {
        const newList =
          typeof nextList === "function" ? nextList(prevList) : nextList;

        if (user?.uid) {
          writeList(user.uid, newList);
        }
        return newList;
      });
    },
    [user, writeList]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadList() {
      if (!user?.uid) {
        setListState([]);
        setFirebaseError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const ref = doc(db, COLLECTION, user.uid);
        const snap = await getDoc(ref);

        if (cancelled) return;

        if (snap.exists() && Array.isArray(snap.data().items)) {
          setListState(snap.data().items);
        }
        setFirebaseError(null);
      } catch (err) {
        if (!cancelled) {
          console.warn("Firestore read failed:", err);
          setFirebaseError(err.message || "Failed to load list");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadList();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { list, setList, loading, firebaseError };
}

export { useGroceryListFirestore };

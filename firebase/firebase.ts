// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBntoQSzPqeoEVpR0Vo-pMSENbTqkMtBhc",
  authDomain: "studentsaver-af691.firebaseapp.com",
  projectId: "studentsaver-af691",
  storageBucket: "studentsaver-af691.firebasestorage.app",
  messagingSenderId: "888791190500",
  appId: "1:888791190500:web:249f0cc2b7ec5b0d5415f1",
  measurementId: "G-WZVSEPVM66"
};
//
// Initialize Firebase (only in browser to avoid SSR errors)
const app = initializeApp(firebaseConfig);
const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, inMemoryPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBruIJj35M-2N8y0TQlFuyuCpcYfo_hjrc",
  authDomain: "fluffy-949ed.firebaseapp.com",
  projectId: "fluffy-949ed",
  storageBucket: "fluffy-949ed.firebasestorage.app",
  messagingSenderId: "726393645260",
  appId: "1:726393645260:web:cd047d32468474a0107a69",
  measurementId: "G-5EMG23FCXN"
};

// Prevent duplicate initialization in fast-refresh cycles
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore
export const db = getFirestore(app);

// Auth — inMemoryPersistence for RN JS SDK / Web
export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
});

export default app;

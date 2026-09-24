// ****************** firbase imports
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB6pHje3a6b_TL5QGVIiZ-9m-73IsjE6cs",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cuttr-c1515.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cuttr-c1515",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cuttr-c1515.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "179583977080",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:179583977080:web:7a52382ef91964690a4f8d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9RBDMNLCRQ",
};

const app = initializeApp(firebaseConfig);

export default app;

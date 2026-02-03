// lib/firebase.ts
import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAI } from "firebase/ai";

// 1. Your web app's Firebase configuration
// Explicitly typed as FirebaseOptions for type safety
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBM57BKmjjxcb0YOY4QqjviQW4UYe8XGFg",
  authDomain: "brainfairt.firebaseapp.com",
  projectId: "brainfairt",
  storageBucket: "brainfairt.firebasestorage.app",
  messagingSenderId: "1042258624226",
  appId: "1:1042258624226:web:2ec8b7ad63afb3c3ea28bb",
  measurementId: "G-F7EEWLQXFC"
};

// 2. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 3. Initialize Analytics (checks if window is available for SSR safety)
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// 4. Initialize AI
const AI = getAI(app);

// 5. Export the instances to use in other files
export { app, analytics, AI };

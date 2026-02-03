"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Analytics } from "firebase/analytics";
import { logEvent } from "firebase/analytics";

export default function Home() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    // Dynamically import firebase and analytics only on the client-side
    import("@/lib/firebase").then((firebaseModule) => {
      // Create a local variable to help TypeScript narrow the type
      const analyticsInstance = firebaseModule.analytics;
      if (analyticsInstance) {
        setAnalytics(analyticsInstance);
        logEvent(analyticsInstance, "page_view", {
          page_path: "/",
        });
        console.log("Firebase Analytics event logged: page_view");
      }
    });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900 font-sans text-white">
      <main className="flex w-full max-w-4xl flex-col items-center justify-center p-8 text-center">
        <div className="mb-8 animate-fade-in-down">
          <Image
            className="invert"
            src="/next.svg"
            alt="Next.js Logo"
            width={180}
            height={37}
            priority
          />
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 animate-fade-in">
          Firebase Integration Successful
        </h1>

        <p className="mb-12 max-w-2xl text-lg text-zinc-400 animate-fade-in-up">
          Your Next.js application is now connected to Firebase. The following services have been initialized and are ready to use.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl animate-fade-in-up animation-delay-300">
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-800 rounded-xl border border-zinc-700 shadow-lg transition-transform hover:scale-105">
            <h2 className="text-2xl font-semibold text-green-400 mb-2">Firebase Analytics</h2>
            <p className="text-zinc-400">
              {analytics ? "Initialized successfully. A 'page_view' event has been logged." : "Initializing..."}
            </p>
          </div>
        </div>

        <footer className="mt-16 text-zinc-500 animate-fade-in animation-delay-600">
          <p>Powered by Next.js and Firebase</p>
        </footer>
      </main>
    </div>
  );
}

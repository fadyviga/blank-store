"use client";

import { useRouter } from "next/navigation";

export default function ThanksPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">

      <div className="text-center">

        <h1 className="text-5xl font-bold mb-6">
          Thank You 🤍
        </h1>

        <p className="text-zinc-400 mb-10">
          Your order has been placed successfully.
        </p>

        <button
          onClick={() => router.push("/")}
          className="bg-white text-black px-8 py-4 rounded-full font-bold"
        >
          Back Home
        </button>

      </div>

    </main>
  );
}
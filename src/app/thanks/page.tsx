"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ThanksPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) setOrderId(id);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6">
          Thank You 🤍
        </h1>

        <p className="text-zinc-400 mb-4">
          Your order has been placed successfully.
        </p>

        {orderId && (
          <p className="text-zinc-500 text-sm mb-10 font-mono tracking-widest">
            Order #{orderId}
          </p>
        )}

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

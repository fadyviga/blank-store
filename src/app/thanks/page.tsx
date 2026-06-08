"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ThanksPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) setOrderId(id);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-md">
        {/* Checkmark */}
        <div
          className={`mb-8 transition-all duration-1000 ease-out ${
            mounted ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        >
          <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center mx-auto">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline
                points="20 6 9 17 4 12"
                className="animate-checkmark-draw"
                style={{
                  strokeDasharray: 30,
                  strokeDashoffset: 30,
                }}
              />
            </svg>
          </div>
        </div>

        {/* Order confirmed heading */}
        <h1
          className={`text-4xl md:text-5xl font-black tracking-tight mb-4 transition-all duration-1000 ease-out delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          ORDER CONFIRMED
        </h1>

        <p
          className={`text-zinc-400 mb-3 transition-all duration-1000 ease-out delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          Thank you for choosing Blank EG.
        </p>

        {orderId && (
          <p
            className={`text-zinc-500 text-xs font-mono tracking-widest mb-10 transition-all duration-1000 ease-out delay-400 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            Order #{orderId}
          </p>
        )}

        <div
          className={`space-y-3 transition-all duration-1000 ease-out delay-500 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <button
            onClick={() => router.push("/register")}
            className="bg-white text-black w-full py-4 rounded-full font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
          >
            Create Account
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full border border-white/20 text-zinc-400 py-4 rounded-full font-bold text-sm hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer active:scale-[0.98]"
          >
            Continue Shopping
          </button>
        </div>

        <p
          className={`text-zinc-600 text-xs mt-8 leading-relaxed transition-all duration-1000 ease-out delay-600 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
        >
          A confirmation message will be sent to your phone shortly.
        </p>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToProducts = useCallback(() => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#000]">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full bg-white/[0.015] blur-[150px] animate-spotlight" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 -mt-16">
        <div
          className={`mb-10 transition-all duration-1000 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="animate-badge-float">
            <div className="px-5 py-3 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] animate-badge-glow">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🔥</span>
                <div className="text-left">
                  <p className="text-white text-sm font-bold leading-tight">
                    Eid Offer &mdash; 10% OFF
                  </p>
                  <p className="text-zinc-600 text-[10px] uppercase tracking-[0.2em]">
                    Limited time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`mb-10 transition-all duration-1200 ease-out delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <Image
            src="/logo.png"
            alt="Blank EG"
            width={200}
            height={55}
            className="object-contain"
            priority
          />
        </div>

        <h1 className="overflow-hidden mb-8">
          <span
            className={`block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight text-white transition-all duration-1000 ease-out delay-400 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            LESS EFFORT,
          </span>
          <span
            className={`block text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tight text-white transition-all duration-1000 ease-out delay-500 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            MORE STYLE.
          </span>
        </h1>

        <p
          className={`max-w-lg text-zinc-500 text-sm md:text-base mb-12 leading-relaxed transition-all duration-1000 ease-out delay-600 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Premium oversized essentials designed for the next generation.
        </p>

        <div
          className={`transition-all duration-1000 ease-out delay-700 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <button
            onClick={scrollToProducts}
            className="group relative inline-flex items-center gap-3 bg-white text-black px-10 py-4 rounded-full font-bold text-sm md:text-base overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_-8px_rgba(255,255,255,0.3)] active:scale-95"
          >
            <span>Shop Now</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </button>
        </div>
      </div>

      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-10 transition-all duration-1000 delay-1000 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-zinc-600">
          <div className="w-px h-10 bg-gradient-to-b from-zinc-600 to-transparent animate-scroll-bounce" />
        </div>
      </div>
    </section>
  );
}

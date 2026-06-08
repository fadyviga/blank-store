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
    <section className="relative w-full overflow-hidden bg-[#000] min-h-[90vh] flex items-center">
      {/* Ambient glow behind logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] rounded-full bg-white/[0.015] blur-[200px] animate-ambient-glow" />
      </div>

      {/* Spotlight sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/[0.015] to-transparent animate-spotlight-sweep" />
      </div>

      {/* Thin accent line top */}
      <div className="absolute top-16 md:top-20 left-[10%] right-[10%] pointer-events-none">
        <div className={`accent-line transition-all duration-1500 delay-300 ${mounted ? "opacity-100" : "opacity-0"}`} />
      </div>

      {/* Thin accent line bottom */}
      <div className="absolute bottom-16 md:bottom-20 left-[10%] right-[10%] pointer-events-none">
        <div className={`accent-line transition-all duration-1500 delay-700 ${mounted ? "opacity-100" : "opacity-0"}`} />
      </div>

      {/* Vertical accent lines */}
      <div className="absolute inset-y-[15%] left-6 md:left-10 w-px pointer-events-none">
        <div className={`h-full w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent transition-all duration-1500 delay-400 ${mounted ? "opacity-100" : "opacity-0"}`} />
      </div>
      <div className="absolute inset-y-[15%] right-6 md:right-10 w-px pointer-events-none">
        <div className={`h-full w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent transition-all duration-1500 delay-600 ${mounted ? "opacity-100" : "opacity-0"}`} />
      </div>

      <div className="relative z-10 w-full">
        <div className="flex flex-col items-center text-center px-6 pt-24 pb-20 md:pb-28">

          {/* Logo with floating animation */}
          <div
            className={`mb-10 md:mb-12 transition-all duration-1000 ease-out delay-200 animate-logo-float ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <Image
              src="/logo.png"
              alt="Blank EG"
              width={240}
              height={66}
              className="object-contain"
              priority
            />
          </div>

          {/* Badge with parallax drift */}
          <div
            className={`mb-10 transition-all duration-800 ease-out delay-300 animate-parallax-drift ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <div className="animate-badge-float">
              <div className="px-5 py-3 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] animate-badge-glow">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">🔥</span>
                  <div className="text-left">
                    <p className="text-white text-sm font-bold leading-tight tracking-tight">
                      Limited Offer &mdash; 10% OFF
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h1 className="mb-10 w-full max-w-5xl">
            <span
              className={`block text-center md:text-left md:pl-[12%] text-[clamp(2.5rem,8vw,5.5rem)] font-black leading-[1.05] tracking-[-0.02em] text-white transition-all duration-1000 ease-out delay-400 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              LESS EFFORT,
            </span>
            <span
              className={`block text-center md:text-right md:pr-[12%] text-[clamp(2.5rem,8vw,5.5rem)] font-black leading-[1.05] tracking-[-0.02em] text-white transition-all duration-1000 ease-out delay-500 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              MORE STYLE.
            </span>
          </h1>

          <p
            className={`max-w-md text-zinc-500 text-sm md:text-base mb-12 leading-relaxed tracking-wide transition-all duration-1000 ease-out delay-600 ${
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
              className="group relative inline-flex items-center gap-3 bg-white text-black px-10 md:px-12 py-4 md:py-4.5 rounded-full font-bold text-sm md:text-base overflow-hidden transition-all duration-500 hover:scale-[1.04] hover:shadow-[0_0_40px_-8px_rgba(255,255,255,0.25)] active:scale-[0.98]"
            >
              <span>Shop Now</span>
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}

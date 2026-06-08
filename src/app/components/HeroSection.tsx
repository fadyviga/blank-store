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
    <section className="relative w-full overflow-hidden bg-[#000] min-h-screen flex items-center">
      {/* Watermark logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[clamp(10rem,22vw,28rem)] font-black text-white/[0.025] tracking-[-0.06em] leading-none animate-watermark-float">
          BLANK
        </span>
      </div>

      {/* Subtle editorial framing */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />
      <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-white/[0.04] to-transparent" />

      {/* Floating product showcase - desktop only */}
      <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none z-10 w-40">
        <div className="animate-product-float opacity-40">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/[0.06]">
            <img
              src="/colors/black.jpeg"
              alt="Black tee"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
      <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none z-10 w-40">
        <div className="animate-product-float-delayed opacity-40">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/[0.06]">
            <img
              src="/colors/white.jpeg"
              alt="White tee"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="relative z-20 w-full">
        <div className="flex flex-col items-center text-center px-6 pt-28 pb-24 md:pb-32">

          {/* Logo */}
          <div
            className={`mb-12 md:mb-16 transition-all duration-1000 ease-out delay-200 ${
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

          {/* Editorial heading - asymmetrical on desktop, centered on mobile */}
          <h1 className="mb-10 w-full max-w-6xl">
            <span
              className={`block text-center md:text-left md:pl-[8%] lg:pl-[12%] text-[clamp(2.5rem,9vw,6rem)] font-black leading-[1.05] tracking-[-0.03em] text-white transition-all duration-1000 ease-out delay-400 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              LESS EFFORT,
            </span>
            <span
              className={`block text-center md:text-right md:pr-[8%] lg:pr-[12%] text-[clamp(2.5rem,9vw,6rem)] font-black leading-[1.05] tracking-[-0.03em] text-white transition-all duration-1000 ease-out delay-500 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              MORE STYLE.
            </span>
          </h1>

          {/* Badge */}
          <div
            className={`mb-12 transition-all duration-800 ease-out delay-300 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <div className="px-5 py-3 rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08]">
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

          <p
            className={`max-w-md text-zinc-500 text-sm md:text-base mb-14 leading-relaxed tracking-wide transition-all duration-1000 ease-out delay-600 ${
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
              className="group relative inline-flex items-center gap-3 bg-white text-black px-10 md:px-14 py-4 md:py-5 rounded-full font-bold text-sm md:text-base overflow-hidden transition-all duration-500 hover:scale-[1.03] active:scale-[0.98]"
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

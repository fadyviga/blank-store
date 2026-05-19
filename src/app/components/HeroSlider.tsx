"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

const PRIMARY_SLIDES = ["/slider/1.jpg", "/slider/2.jpg"];
const FALLBACK_SLIDES = [
  "/colors/black.jpeg",
  "/colors/white.jpeg",
  "/colors/navy.jpeg",
  "/colors/burgundy.jpeg",
  "/colors/gray.jpeg",
];

export default function HeroSlider() {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [slides, setSlides] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const activeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const detect = async () => {
      const results = await Promise.all(
        PRIMARY_SLIDES.map(
          (src) =>
            new Promise<boolean>((resolve) => {
              const img = new window.Image();
              img.onload = () => resolve(true);
              img.onerror = () => resolve(false);
              img.src = src;
            })
        )
      );

      if (cancelled) return;
      setSlides(results.every(Boolean) ? PRIMARY_SLIDES : FALLBACK_SLIDES);
    };

    detect();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const advance = useCallback(() => {
    const len = slides.length;
    if (len === 0) return;
    const current = activeRef.current;
    const next = (current + 1) % len;
    setPrev(current);
    setActive(next);
    activeRef.current = next;
    setTimeout(() => setPrev(null), 1200);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    intervalRef.current = setInterval(advance, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slides.length, advance]);

  const scrollToProducts = useCallback(() => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const goToSlide = useCallback(
    (i: number) => {
      if (i === activeRef.current || slides.length === 0) return;
      setPrev(activeRef.current);
      setActive(i);
      activeRef.current = i;
      setTimeout(() => setPrev(null), 1200);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(advance, 5000);
      }
    },
    [advance, slides.length]
  );

  const hasImages = slides.length > 0;

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <div className="absolute inset-0">
        {hasImages ? (
          slides.map((src, i) => {
            const isActive = i === active;
            const isPrev = i === prev;
            let zIdx = 0;
            let className =
              "object-cover pointer-events-none will-change-transform";
            if (isPrev) {
              zIdx = 2;
              className += " animate-fade-out";
            } else if (isActive) {
              zIdx = 1;
              className += " opacity-100 animate-hero-zoom";
            }
            return (
              <div key={src} className="absolute inset-0" style={{ zIndex: zIdx }}>
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={i === 0}
                  className={className}
                />
              </div>
            );
          })
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-800" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
        <p
          className={`uppercase tracking-[0.4em] text-xs md:text-sm text-zinc-400 mb-6 transition-all duration-1000 ease-out ${
            mounted
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          Blank EG &mdash; 2026 Collection
        </p>

        <h1 className="overflow-hidden">
          <span
            className={`block text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-[0.85] tracking-tighter transition-all duration-1000 ease-out delay-200 ${
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
            style={{ textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}
          >
            LESS EFFORT
          </span>
          <span
            className={`block text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-[0.85] tracking-tighter text-white transition-all duration-1000 ease-out delay-400 ${
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
            style={{ textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}
          >
            MORE STYLE
          </span>
        </h1>

        <p
          className={`max-w-md text-zinc-400 text-sm md:text-base mb-12 leading-relaxed transition-all duration-1000 ease-out delay-600 ${
            mounted
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          Premium oversized essentials designed for the next generation.
        </p>

        <div
          className={`flex flex-col sm:flex-row items-center gap-5 transition-all duration-1000 ease-out delay-800 ${
            mounted
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          <button
            onClick={scrollToProducts}
            className="group relative inline-flex items-center gap-3 bg-white text-black px-10 py-4 rounded-full font-bold text-sm md:text-base overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-[0_0_40px_-8px_rgba(255,255,255,0.4)] active:scale-95"
          >
            <span className="relative z-10">Shop Now</span>
            <span className="relative z-10 inline-block transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5">
              &rarr;
            </span>
          </button>

          <div className="animate-badge-float">
            <div className="relative px-5 py-3 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 animate-badge-glow">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🔥</span>
                <div className="text-left">
                  <p className="text-white text-sm font-bold leading-tight">
                    Eid Offer — 10% OFF
                  </p>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em]">
                    Limited time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`rounded-full transition-all duration-500 ${
                i === active
                  ? "w-10 h-2.5 bg-white animate-dot-pulse"
                  : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      <div
        className={`absolute bottom-8 right-8 z-10 transition-all duration-1000 delay-1000 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-zinc-500">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-zinc-500 to-transparent animate-scroll-bounce" />
        </div>
      </div>
    </section>
  );
}

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

  const advance = useCallback(() => {
    const len = slides.length;
    if (len === 0) return;
    const current = activeRef.current;
    const next = (current + 1) % len;
    setPrev(current);
    setActive(next);
    activeRef.current = next;
    setTimeout(() => setPrev(null), 1000);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    intervalRef.current = setInterval(advance, 4500);
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
      setTimeout(() => setPrev(null), 1000);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(advance, 4500);
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
              "object-cover pointer-events-none will-change-[opacity,transform]";
            if (isPrev) {
              zIdx = 2;
              className += " animate-fade-out";
            } else if (isActive) {
              zIdx = 1;
              className += " opacity-100 animate-zoom";
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

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
        <p className="uppercase tracking-[0.35em] text-xs md:text-sm text-zinc-400 mb-5">
          Blank EG &mdash; 2026 Collection
        </p>

        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-[0.9] tracking-tighter mb-4">
          <span className="block">Less effort.</span>
          <span className="block text-white">More style.</span>
        </h1>

        <p className="max-w-md text-zinc-400 text-sm md:text-base mb-10 leading-relaxed">
          Premium oversized essentials designed for the next generation.
        </p>

        <button
          onClick={scrollToProducts}
          className="group relative inline-flex items-center gap-2 bg-white text-black px-10 py-4 rounded-full font-semibold text-sm md:text-base overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] active:scale-95"
        >
          <span className="relative z-10">Shop Now</span>
          <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">
            &rarr;
          </span>
        </button>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`rounded-full transition-all duration-500 ${
                i === active
                  ? "w-8 h-2.5 bg-white animate-dot-pulse"
                  : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

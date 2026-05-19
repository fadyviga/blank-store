"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ColorCard from "./components/ColorCard";
import PromoPopup from "./components/PromoPopup";

export default function Home() {
  const slides = [
    "/slider/1.jpg",
    "/slider/2.jpg",
  ];

  const [frontSlot, setFrontSlot] = useState(0);
  const [backSlot, setBackSlot] = useState(0);
  const [fading, setFading] = useState(false);
  const [popupActive, setPopupActive] = useState(false);
  const frontRef = useRef(0);

  useEffect(() => {
    slides.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      const current = frontRef.current;
      const next = (current + 1) % slides.length;

      setBackSlot(next);
      requestAnimationFrame(() => setFading(true));

      setTimeout(() => {
        setFrontSlot(next);
        setBackSlot(next);
        setFading(false);
        frontRef.current = next;
      }, 700);
    }, 3000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const handlePopupVisible = useCallback((visible: boolean) => {
    setPopupActive(visible);
  }, []);

  const colors = [
    "Black", "White", "Blue", "Green", "Gray",
    "Brown", "Navy", "Burgundy", "Beige",
  ];

  return (
    <main className="min-h-screen text-white">
      <section className="h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden bg-black">
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <img
            src={slides[backSlot]}
            className="absolute min-w-full min-h-full w-auto h-auto object-cover pointer-events-none"
            style={{ zIndex: 1 }}
            alt="hero slide"
          />
          <img
            key={frontSlot}
            src={slides[frontSlot]}
            className="absolute min-w-full min-h-full w-auto h-auto object-cover pointer-events-none transition-opacity duration-700"
            style={{ opacity: fading ? 0 : 1, zIndex: 2 }}
            alt="hero slide"
          />
        </div>

        {!popupActive && (
          <div className="bg-zinc-950/40 backdrop-blur-sm px-8 py-10 md:px-14 md:py-12 rounded-3xl max-w-lg w-full">
            <div className="mb-6 inline-flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full text-sm font-bold shadow-xl">
              🔥 Limited Offer — 10% OFF
            </div>

            <p className="uppercase tracking-[0.4em] text-sm text-zinc-400 mb-4">
              2026 STREETWEAR
            </p>

            <h1 className="text-6xl md:text-8xl font-black leading-none mb-6">
              BLANK EG
            </h1>

            <p className="max-w-xl text-zinc-300 text-lg mb-8">
              Premium oversized essentials designed for the next generation.
            </p>

            <div className="flex justify-center">
              <button
                onClick={() =>
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-white text-black px-10 py-4 rounded-full font-semibold text-lg hover:scale-105 transition shadow-2xl"
              >
                Shop Now
              </button>
            </div>
          </div>
        )}
      </section>

      <section id="products" className="py-24 px-6 border-t border-white/10 bg-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">
            9 Color Variants
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {colors.map((color) => (
              <ColorCard key={color} color={color} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/10 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-zinc-500 uppercase tracking-[0.3em] mb-4">
            About Blank
          </p>
          <h2 className="text-5xl font-bold leading-tight mb-8">
            Less effort.<br />More style.
          </h2>
          <p className="text-zinc-400 text-lg leading-8">
            Blank is a modern Egyptian streetwear label focused on oversized essentials,
            premium materials, and timeless silhouettes inspired by global fashion culture.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10 text-center text-zinc-500 bg-black">
        © 2026 BLANK — All Rights Reserved
      </footer>

      <PromoPopup onVisibleChange={handlePopupVisible} />
    </main>
  );
}

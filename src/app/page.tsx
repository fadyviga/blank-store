"use client";

import { useEffect, useState } from "react";
import ColorCard from "./components/ColorCard";

export default function Home() {
  const [index, setIndex] = useState(0);

  const slides = [
    "/slider/1.jpg",
    "/slider/2.jpg",
  ];

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const safeIndex = slides.length ? index % slides.length : 0;

  const colors = [
    "Black",
    "White",
    "Blue",
    "Green",
    "Gray",
    "Brown",
    "Navy",
    "Burgundy",
    "Beige",
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {slides.map((src, i) => (
            <img
              key={src}
              src={src}
              style={{ opacity: i === safeIndex ? 1 : 0 }}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none"
              alt="hero slide"
            />
          ))}
        </div>

        <div className="mb-6 inline-flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full text-sm font-bold shadow-xl">
          🔥 Limited Offer — 10% OFF
        </div>

        <p className="uppercase tracking-[0.4em] text-sm text-zinc-400 mb-4">
          2026 STREETWEAR
        </p>

        <h1 className="text-6xl md:text-8xl font-black leading-none mb-6">
          BLANK EG
        </h1>

        <p className="max-w-xl text-zinc-400 text-lg mb-8">
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
      </section>

      <section id="products" className="py-24 px-6 border-t border-white/10">
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

      <section className="py-24 px-6 border-t border-white/10">
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

      <footer className="border-t border-white/10 py-10 text-center text-zinc-500">
        © 2026 BLANK — All Rights Reserved
      </footer>
    </main>
  );
}

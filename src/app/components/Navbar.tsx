"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const slides = [
    "/slider/1.jpg",
    "/slider/2.jpg",
    "/slider/3.jpg",
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-black/40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

        <div className="h-10 flex items-center overflow-visible">
  <img
    src="/logo.png"
    alt="Logo"
    className="h-50 w-auto object-contain scale-110"
  />
</div>

          <div className="flex items-center gap-6">

            <a
              href="https://wa.me/201287659463"
              target="_blank"
              className="text-sm text-zinc-300 hover:text-white transition"
            >
              WhatsApp
            </a>

            <button className="bg-white text-black px-5 py-2 rounded-full text-sm font-medium hover:scale-105 transition">
              Shop Now
            </button>

          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">

        {/* Slider */}
        <div className="absolute inset-0 -z-10">
          <img
            src={slides[index]}
            className="w-full h-full object-cover opacity-40 transition duration-700"
          />
        </div>

        <p className="uppercase tracking-[0.4em] text-sm text-zinc-400 mb-4">
          2026 STREETWEAR
        </p>

        <h1 className="text-6xl md:text-8xl font-black leading-none mb-6">
          BLANK
        </h1>

        <p className="max-w-xl text-zinc-400 text-lg mb-8">
          Premium oversized essentials designed for the next generation.
        </p>

        <div className="flex gap-4">
          <button className="bg-white text-black px-8 py-4 rounded-full font-semibold hover:scale-105 transition">
            Explore Collection
          </button>

          <button className="border border-white/20 px-8 py-4 rounded-full hover:bg-white hover:text-black transition">
            View Colors
          </button>
        </div>
      </section>

      {/* Colors */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">
            9 Color Variants
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">

            {colors.map((color) => (
              <div
                key={color}
                className="border border-white/10 rounded-3xl p-6 hover:border-white transition hover:-translate-y-2"
              >

                {/* صورة اللون */}
                <img
                  src={`/colors/${color.toLowerCase()}.jpeg`}
                  alt={color}
                  className="aspect-square w-full object-cover rounded-2xl mb-4"
                />

                {/* اسم اللون */}
                <h3 className="text-lg font-bold uppercase tracking-[0.2em] text-center">
                  {color}
                </h3>

              </div>
            ))}

          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-32 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">

          <p className="text-zinc-500 uppercase tracking-[0.3em] mb-4">
            About Blank
          </p>

          <h2 className="text-5xl font-bold leading-tight mb-8">
            Minimal pieces.<br />Maximum presence.
          </h2>

          <p className="text-zinc-400 text-lg leading-8">
            Blank is a modern Egyptian streetwear label focused on oversized essentials,
            premium materials, and timeless silhouettes inspired by global fashion culture.
          </p>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10 text-center text-zinc-500">
        © 2026 BLANK — All Rights Reserved
      </footer>

    </main>
  );
}
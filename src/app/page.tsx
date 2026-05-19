"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ColorCard from "./components/ColorCard";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./hooks/useCart";

export default function Home() {
  const router = useRouter();

  const slides = [
    "/slider/1.jpg",
    "/slider/2.jpg",
  ];

  const [index, setIndex] = useState(0);
  const { cartCount } = useCart();

  // slider loop
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const safeIndex = index % slides.length;

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

          {/* Logo */}
          <div className="h-10 flex items-center">
  <img
    src="/logo.png"
    alt="Logo"
    className="h-48 w-auto object-contain"
  />
</div>

          {/* Actions */}
          <div className="flex items-center gap-6">

            <a
              href="https://wa.me/201287659463?text=Hey%20Blank%20EG%20👋%20I%20want%20to%20know%20more%20about%20your%20offers."
              target="_blank"
              className="text-sm text-zinc-300 hover:text-white transition"
            >
              WhatsApp
            </a>

            <button
              onClick={() => router.push("/cart")}
              className="relative flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full text-sm font-medium hover:scale-105 transition"
            >
              <ShoppingCart size={18} />
              Cart

              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">

        {/* Background */}
        <div className="absolute inset-0 -z-10">
        <img
  src={slides[safeIndex]}
  className="w-full h-full object-cover"
/>
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Offer */}
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

        {/* CTA */}
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

      {/* PRODUCTS */}
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

      {/* ABOUT */}
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

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10 text-center text-zinc-500">
        © 2026 BLANK — All Rights Reserved
      </footer>

    </main>
  );
}
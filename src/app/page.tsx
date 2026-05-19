"use client";

import { useCallback, useState } from "react";
import ColorCard from "./components/ColorCard";
import PromoPopup from "./components/PromoPopup";
import HeroSection from "./components/HeroSection";

export default function Home() {
  const [popupActive, setPopupActive] = useState(false);

  const handlePopupVisible = useCallback((visible: boolean) => {
    setPopupActive(visible);
  }, []);

  const colors = [
    "Black", "White", "Blue", "Green", "Gray",
    "Brown", "Navy", "Burgundy", "Beige",
  ];

  return (
    <main className="min-h-screen text-white">
      <HeroSection />

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

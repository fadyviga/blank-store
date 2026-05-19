"use client";

import { useCallback, useState } from "react";
import { Ruler } from "lucide-react";
import ColorCard from "./components/ColorCard";
import PromoPopup from "./components/PromoPopup";
import HeroSection from "./components/HeroSection";
import SizeChart from "./components/SizeChart";

export default function Home() {
  const [popupActive, setPopupActive] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

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
          <div className="flex items-center justify-center gap-4 mb-12">
            <h2 className="text-4xl font-bold text-center">
              9 Color Variants
            </h2>
          </div>
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setSizeGuideOpen(true)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-zinc-500 hover:text-white transition border border-white/10 hover:border-white/30 rounded-full px-5 py-2.5"
            >
              <Ruler size={14} />
              Size Guide
            </button>
          </div>
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
      <SizeChart
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />
    </main>
  );
}

"use client";

import { useState } from "react";
import { Ruler, Package, ChevronRight } from "lucide-react";
import ColorCard from "./components/ColorCard";
import PromoPopup from "./components/PromoPopup";
import HeroSection from "./components/HeroSection";
import SizeChart from "./components/SizeChart";
import {
  BUNDLE_2_PRICE,
  BUNDLE_3_PRICE,
  BUNDLE_4_PRICE,
  BASE_PRICE,
} from "@/types";

const COLORS = [
  "Black", "White", "Blue", "Green", "Gray",
  "Brown", "Navy", "Burgundy", "Beige",
];

const bundleOffers = [
  {
    count: 2,
    price: BUNDLE_2_PRICE,
    regular: 2 * BASE_PRICE,
    label: "2 Tees",
    desc: "Mix & match any colors",
    animClass: "animate-offer-card-in",
  },
  {
    count: 3,
    price: BUNDLE_3_PRICE,
    regular: 3 * BASE_PRICE,
    label: "3 Tees",
    desc: "Build your essential set",
    animClass: "animate-offer-card-in-2",
  },
  {
    count: 4,
    price: BUNDLE_4_PRICE,
    regular: 4 * BASE_PRICE,
    label: "4 Tees",
    desc: "Complete wardrobe staples",
    animClass: "animate-offer-card-in-3",
    bestValue: true,
  },
];

export default function Home() {
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  return (
    <main className="min-h-screen text-white">
      <HeroSection />

      <section className="relative py-28 md:py-32 px-6 bg-black overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.008] blur-[200px]" />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-14 md:mb-16">
            <p className="text-zinc-500 uppercase tracking-[0.3em] text-xs mb-4">
              Premium Bundle
            </p>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-[1.1]">
              BUNDLE OFFERS
            </h2>
            <p className="text-zinc-500 text-sm mt-4 max-w-md mx-auto leading-relaxed">
              Stack your essentials. Pick any colors, any sizes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {bundleOffers.map((offer) => (
              <div
                key={offer.count}
                className={`group relative opacity-0 ${offer.animClass}`}
              >
                {offer.bestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <div className="animate-badge-pop">
                      <span className="inline-block bg-gradient-to-r from-zinc-200 to-white text-black text-[10px] uppercase tracking-[0.2em] font-bold px-4 py-1.5 rounded-full">
                        Best Value
                      </span>
                    </div>
                  </div>
                )}

                <div
                  className={`relative h-full backdrop-blur-xl bg-white/[0.02] border rounded-3xl p-7 md:p-8 transition-all duration-500 ${
                    offer.bestValue
                      ? "border-zinc-500/30 hover:border-zinc-400/50 animate-glass-pulse"
                      : "border-white/[0.07] hover:border-white/20"
                  } hover:scale-[1.02] hover:bg-white/[0.04]`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                        offer.bestValue
                          ? "bg-white text-black"
                          : "bg-white/5 text-zinc-400 group-hover:bg-white/10"
                      }`}
                    >
                      <Package size={20} />
                    </div>
                    <span className="text-xs text-zinc-600 uppercase tracking-[0.15em]">
                      {offer.label}
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl md:text-5xl font-black tracking-tight text-white">
                        {offer.price}
                      </span>
                      <span className="text-zinc-500 text-sm font-medium">
                        EGP
                      </span>
                    </div>
                    <p className="text-zinc-600 text-xs line-through">
                      {offer.regular} EGP regular
                    </p>
                  </div>

                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{offer.desc}</p>

                  <div
                    className={`h-px w-full mb-5 transition-all duration-500 ${
                      offer.bestValue
                        ? "bg-gradient-to-r from-transparent via-zinc-500/30 to-transparent"
                        : "bg-white/5 group-hover:bg-white/10"
                    }`}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 text-xs uppercase tracking-[0.15em]">
                      Save {offer.regular - offer.price} EGP
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500 group-hover:text-white transition-colors duration-300">
                      Shop now
                      <ChevronRight
                        size={14}
                        className="transition-transform duration-300 group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="pb-28 md:pb-32 px-6 bg-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 md:mb-14">
            <p className="text-zinc-500 uppercase tracking-[0.3em] text-xs mb-3">
              Collection
            </p>
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-black tracking-tight leading-[1.1]">
              9 Color Variants
            </h2>
          </div>
          <div className="flex justify-center mb-10">
            <button
              onClick={() => setSizeGuideOpen(true)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-zinc-500 hover:text-white transition-all duration-300 border border-white/[0.08] hover:border-white/30 rounded-full px-5 py-2.5 cursor-pointer"
            >
              <Ruler size={13} />
              Size Guide
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {COLORS.map((color) => (
              <ColorCard key={color} color={color} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-28 md:py-32 px-6 border-t border-white/[0.06] bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-zinc-500 uppercase tracking-[0.3em] text-xs mb-4">
            About Blank
          </p>
          <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight mb-6 tracking-tight">
            Less effort.<br />More style.
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-8 max-w-2xl mx-auto">
            Blank is a modern Egyptian streetwear label focused on oversized essentials,
            premium materials, and timeless silhouettes inspired by global fashion culture.
          </p>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] py-12 md:py-14 text-center bg-black">
        <p className="text-zinc-600 text-xs tracking-widest uppercase">
          &copy; 2026 BLANK &mdash; All Rights Reserved
        </p>
      </footer>

      <PromoPopup />
      <SizeChart
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "blank_popup_seen";

export default function PromoPopup() {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  };

  const handleShopNow = () => {
    handleClose();
    setTimeout(() => {
      document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 350);
  };

  if (!mounted || !show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
    >
      <div
        className="absolute inset-0 backdrop-blur-md"
        onClick={handleClose}
      />

      <div className="relative animate-pop-in bg-zinc-900/95 border border-white/10 rounded-3xl p-8 md:p-10 max-w-sm w-full shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          aria-label="Close"
        >
          <X size={16} className="text-zinc-400" />
        </button>

        <div className="text-center">
          <p className="text-5xl mb-4">🎉</p>

          <h2 className="text-2xl md:text-3xl font-black mb-2">
            Eid Offer
          </h2>

          <p className="text-zinc-400 text-sm md:text-base mb-8 leading-relaxed">
            Get 10% OFF your order today
          </p>

          <button
            onClick={handleShopNow}
            className="w-full bg-white text-black py-4 rounded-xl font-bold text-base hover:scale-[1.02] transition cursor-pointer"
          >
            Shop Now
          </button>
        </div>
      </div>
    </div>
  );
}

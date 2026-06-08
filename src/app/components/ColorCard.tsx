"use client";

import { useState, useRef } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "../hooks/useCart";
import { useToast } from "./Toast";
import { BASE_PRICE, COMPARE_PRICE } from "@/types";

const SIZES = ["M", "L", "XL", "XXL"] as const;

export default function ColorCard({ color }: { color: string }) {
  const router = useRouter();
  const [size, setSize] = useState<string>("M");
  const [added, setAdded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const { addToCart } = useCart();
  const { showToast } = useToast();

  const image = `/colors/${color.toLowerCase()}.jpeg`;

  const handleAddToCart = () => {
    addToCart({
      id: `${color}-${size}-${Date.now()}`,
      name: "Oversized Tee",
      color,
      size,
      price: BASE_PRICE,
      image,
      quantity: 1,
    });
    setAdded(true);
    showToast(`${color} added to cart ✓`);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleBuyNow = () => {
    addToCart({
      id: `${color}-${size}-${Date.now()}`,
      name: "Oversized Tee",
      color,
      size,
      price: BASE_PRICE,
      image,
      quantity: 1,
    });
    router.push("/checkout");
  };

  return (
    <div className="group border border-white/[0.07] rounded-3xl p-5 md:p-6 transition-all duration-700 bg-zinc-950 hover:border-white/25 hover:bg-white/[0.02] hover:shadow-[0_24px_48px_-12px_rgba(255,255,255,0.08)] hover:-translate-y-1.5">
      <div className="overflow-hidden rounded-2xl mb-4 relative">
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.015] transition-all duration-700 z-10 pointer-events-none" />
        <img
          ref={imgRef}
          src={image}
          alt={color}
          onError={() => { if (imgRef.current) imgRef.current.src = "/placeholder.svg"; }}
          className="w-full aspect-square object-cover transition-all duration-800 ease-out group-hover:scale-[1.08]"
        />
      </div>

      <h3 className="text-center font-bold text-lg md:text-xl mb-4 tracking-tight">{color}</h3>

      <div className="flex flex-wrap gap-1.5 justify-center mb-4 w-full">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`px-3 md:px-4 py-1.5 border rounded-full text-xs md:text-sm transition-all duration-300 whitespace-nowrap cursor-pointer ${
              size === s
                ? "bg-white text-black border-white"
                : "border-white/15 text-zinc-400 hover:border-white/40 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="text-center mb-5">
        <p className="text-zinc-600 line-through text-xs tracking-wide">{COMPARE_PRICE} EGP</p>
        <p className="text-2xl font-bold tracking-tight animate-price-glow">{BASE_PRICE} EGP</p>
      </div>

      <button
        onClick={handleAddToCart}
        className={`w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
          added
            ? "bg-green-500 text-white"
            : "bg-white text-black hover:scale-[1.03] hover:shadow-[0_0_32px_-6px_rgba(255,255,255,0.2)] active:scale-[0.98]"
        }`}
      >
        {added ? (
          <>
            <Check size={16} />
            Added ✓
          </>
        ) : (
          <>
            <ShoppingCart size={16} />
            Add to Cart
          </>
        )}
      </button>

      <button
        onClick={handleBuyNow}
        className="w-full mt-2.5 border border-white/15 py-3 rounded-full font-semibold text-sm text-zinc-300 hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer active:scale-[0.98]"
      >
        Buy Now
      </button>
    </div>
  );
}

"use client";

import { ShoppingCart, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "../hooks/useCart";
import { useToast } from "./Toast";
import { BASE_PRICE, COMPARE_PRICE } from "@/types";

export default function ProductCard({
  color,
  productName = "Oversized Tee",
}: {
  color: string;
  productName?: string;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const image = `/colors/${color.toLowerCase()}.jpeg`;

  const handleAddToCart = (selectedSize: string) => {
    addToCart({
      id: `${color}-${selectedSize}-${Date.now()}`,
      name: productName,
      color,
      size: selectedSize,
      price: BASE_PRICE,
      image,
      quantity: 1,
    });
    showToast(`${color} added to cart ✓`);
  };

  const handleBuyNow = (selectedSize: string) => {
    addToCart({
      id: `${color}-${selectedSize}-${Date.now()}`,
      name: productName,
      color,
      size: selectedSize,
      price: BASE_PRICE,
      image,
      quantity: 1,
    });
    router.push("/checkout");
  };

  const sizes = ["M", "L", "XL", "XXL"] as const;

  return (
    <div className="group border border-white/[0.07] rounded-3xl p-5 md:p-6 transition-all duration-700 bg-zinc-950 hover:border-white/25 hover:bg-white/[0.02] hover:shadow-[0_24px_48px_-12px_rgba(255,255,255,0.08)] hover:-translate-y-1.5">
      <div className="overflow-hidden rounded-2xl mb-4 relative">
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.015] transition-all duration-700 z-10 pointer-events-none" />
        <img
          src={image}
          alt={color}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
          className="w-full aspect-square object-cover transition-all duration-800 ease-out group-hover:scale-[1.08]"
        />
      </div>

      <h3 className="text-center font-bold text-lg md:text-xl mb-4 tracking-tight">{color}</h3>

      <SizeSelector sizes={sizes} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} />
    </div>
  );
}

function SizeSelector({
  sizes,
  onAddToCart,
  onBuyNow,
}: {
  sizes: readonly string[];
  onAddToCart: (size: string) => void;
  onBuyNow: (size: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-center">
        {sizes.map((s) => (
          <button
            key={s}
            onClick={() => onAddToCart(s)}
            className="px-3 md:px-4 py-2 border border-white/20 hover:border-white/50 rounded-full text-xs md:text-sm transition-all duration-300 whitespace-nowrap cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="text-center mb-5">
        <p className="text-zinc-500 line-through text-sm">{COMPARE_PRICE} EGP</p>
        <p className="text-2xl font-bold animate-price-glow">{BASE_PRICE} EGP</p>
      </div>

      <button
        onClick={() => {
          const sizeSelect = document.querySelector(
            `[data-size]`
          ) as HTMLElement | null;
          onAddToCart("M");
        }}
        className="w-full py-3 rounded-full font-semibold bg-white text-black hover:scale-[1.03] hover:shadow-[0_0_32px_-6px_rgba(255,255,255,0.2)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
      >
        <ShoppingCart size={18} />
        Add to Cart
      </button>

      <button
        onClick={() => onBuyNow("M")}
        className="w-full border border-white/20 py-3 rounded-full font-semibold hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer active:scale-[0.98]"
      >
        Buy Now
      </button>
    </div>
  );
}

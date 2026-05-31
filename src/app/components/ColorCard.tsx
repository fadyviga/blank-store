"use client";

import { useState, useRef } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "../hooks/useCart";
import { useToast } from "./Toast";
import { BASE_PRICE } from "@/types";

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
    <div className="border border-white/10 rounded-3xl p-6 hover:border-white/30 transition duration-300 bg-zinc-950">
      <div className="overflow-hidden rounded-2xl mb-4">
        <img
          ref={imgRef}
          src={image}
          alt={color}
          onError={() => { if (imgRef.current) imgRef.current.src = "/placeholder.svg"; }}
          className="w-full aspect-square object-cover hover:scale-105 transition duration-500"
        />
      </div>

      <h3 className="text-center font-bold uppercase text-xl mb-4">{color}</h3>

      <div className="flex flex-wrap gap-2 justify-center mb-4 w-full">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`px-3 md:px-4 py-2 border rounded-full text-xs md:text-sm transition whitespace-nowrap ${
              size === s
                ? "bg-white text-black border-white"
                : "border-white/20 hover:border-white/50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="text-center mb-5">
        <p className="text-zinc-500 line-through text-sm">450 EGP</p>
        <p className="text-2xl font-bold">{BASE_PRICE} EGP</p>
      </div>

      <button
        onClick={handleAddToCart}
        className={`w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition ${
          added
            ? "bg-green-500 text-white"
            : "bg-white text-black hover:scale-[1.02]"
        }`}
      >
        {added ? (
          <>
            <Check size={18} />
            Added ✓
          </>
        ) : (
          <>
            <ShoppingCart size={18} />
            Add to Cart
          </>
        )}
      </button>

      <button
        onClick={handleBuyNow}
        className="w-full mt-3 border border-white/20 py-3 rounded-full font-semibold hover:bg-white hover:text-black transition"
      >
        Buy Now
      </button>
    </div>
  );
}

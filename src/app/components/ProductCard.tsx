"use client";

import { ShoppingCart, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "../hooks/useCart";
import { useToast } from "./Toast";

const PRICE = 395;

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
      price: PRICE,
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
      price: PRICE,
      image,
      quantity: 1,
    });
    router.push("/checkout");
  };

  const sizes = ["M", "L", "XL", "XXL"] as const;

  return (
    <div className="border border-white/10 rounded-3xl p-6 hover:border-white/30 transition duration-300 bg-zinc-950">
      <div className="overflow-hidden rounded-2xl mb-4">
        <img
          src={image}
          alt={color}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
          className="w-full aspect-square object-cover hover:scale-105 transition duration-500"
        />
      </div>

      <h3 className="text-center font-bold uppercase text-xl mb-4">{color}</h3>

      <SizeSelector sizes={sizes} onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} price={PRICE} />
    </div>
  );
}

function SizeSelector({
  sizes,
  onAddToCart,
  onBuyNow,
  price,
}: {
  sizes: readonly string[];
  onAddToCart: (size: string) => void;
  onBuyNow: (size: string) => void;
  price: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-center">
        {sizes.map((s) => (
          <button
            key={s}
            onClick={() => onAddToCart(s)}
            className="px-3 md:px-4 py-2 border border-white/20 hover:border-white/50 rounded-full text-xs md:text-sm transition whitespace-nowrap"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="text-center mb-5">
        <p className="text-zinc-500 line-through text-sm">450 EGP</p>
        <p className="text-2xl font-bold">{price} EGP</p>
      </div>

      <button
        onClick={() => {
          const sizeSelect = document.querySelector(
            `[data-size]`
          ) as HTMLElement | null;
          onAddToCart("M");
        }}
        className="w-full py-3 rounded-full font-semibold bg-white text-black hover:scale-[1.02] transition flex items-center justify-center gap-2"
      >
        <ShoppingCart size={18} />
        Add to Cart
      </button>

      <button
        onClick={() => onBuyNow("M")}
        className="w-full border border-white/20 py-3 rounded-full font-semibold hover:bg-white hover:text-black transition"
      >
        Buy Now
      </button>
    </div>
  );
}

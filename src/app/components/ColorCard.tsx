"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useCart } from "../hooks/useCart";

const PRICE = 395;

export default function ColorCard({ color }: { color: string }) {
  const [size, setSize] = useState("M");

  const { addToCart } = useCart();
  const router = useRouter();

  const image = `/colors/${color.toLowerCase()}.jpeg`;

  const handleAddToCart = () => {
    addToCart({
      id: `${color}-${size}-${Date.now()}`,
      name: "Oversized Tee",
      color,
      size,
      price: PRICE,
      image,
      quantity: 1,
    });

    // يوديه مباشرة للـ cart
    router.push("/cart");
  };

  return (
    <div className="border border-white/10 rounded-3xl p-6 hover:border-white/30 transition duration-300 bg-zinc-950">

      {/* Image */}
      <div className="overflow-hidden rounded-2xl mb-4">
        <img
          src={image}
          alt={color}
          className="w-full aspect-square object-cover hover:scale-105 transition duration-500"
        />
      </div>

      {/* Color name */}
      <h3 className="text-center font-bold uppercase text-xl mb-4">
        {color}
      </h3>

      {/* Sizes */}
      <div className="flex flex-wrap gap-2 justify-center mb-4 w-full">

        {["M", "L", "XL", "XXL"].map((s) => (
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

      {/* Price */}
      <p className="text-center text-zinc-400 mb-5 text-lg">
        {PRICE} EGP
      </p>

      {/* Add to Cart */}
      <button
        onClick={handleAddToCart}
        className="w-full bg-white text-black py-3 rounded-full font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition"
      >
        <ShoppingCart size={18} />
        Add to Cart
      </button>

    </div>
  );
}
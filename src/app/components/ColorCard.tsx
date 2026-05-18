"use client";

import { useState } from "react";
import { useCart } from "../hooks/useCart";

const PRICE = 395;

export default function ColorCard({ color }: { color: string }) {
  const [size, setSize] = useState("M");
  const { addToCart } = useCart();

  return (
    <div className="border border-white/10 rounded-3xl p-6">

      {/* Image */}
      <img
        src={`/colors/${color.toLowerCase()}.jpeg`}
        className="w-full aspect-square object-cover rounded-2xl mb-4"
      />

      {/* Color name */}
      <h3 className="text-center font-bold uppercase mb-3">
        {color}
      </h3>

      {/* Sizes */}
      <div className="flex gap-2 justify-center mb-3">
        {["M", "L", "XL", "XXL"].map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`px-3 py-1 border rounded-full ${
              size === s ? "bg-white text-black" : "border-white/20"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Price */}
      <p className="text-center text-zinc-400 mb-3">
        {PRICE} EGP
      </p>

      {/* Add to Cart */}
      <button
        onClick={() =>
          addToCart({
            id: `${color}-${size}-${Date.now()}`,
            name: "Oversized Tee",
            color,
            size,
            price: PRICE,
            image: `/colors/${color.toLowerCase()}.jpeg`,
          })
        }
        className="w-full bg-white text-black py-2 rounded-full"
      >
        Add to Cart
      </button>

    </div>
  );
}
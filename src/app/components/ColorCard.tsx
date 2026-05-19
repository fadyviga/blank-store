"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "../hooks/useCart";

const PRICE = 395;

export default function ColorCard({ color }: { color: string }) {
  const [size, setSize] = useState("M");
  const [added, setAdded] = useState(false);

  const { addToCart } = useCart();

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

    // تغيير الزر لمدة 3 ثواني
    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 3000);
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

      {/* Add To Cart */}
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
            Added Successfully
          </>
        ) : (
          <>
            <ShoppingCart size={18} />
            Add to Cart
          </>
        )}

      </button>

    </div>
  );
}
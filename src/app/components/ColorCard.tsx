"use client";

import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Check, X, Expand } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "../hooks/useCart";
import { useToast } from "./Toast";
import { BASE_PRICE, COMPARE_PRICE } from "@/types";

const SIZES = ["M", "L", "XL", "XXL"] as const;

export default function ColorCard({ color }: { color: string }) {
  const router = useRouter();
  const [size, setSize] = useState<string>("M");
  const [added, setAdded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [backImageExists, setBackImageExists] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!spotlightRef.current || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    spotlightRef.current.style.background = `radial-gradient(280px circle at ${x}% ${y}%, rgba(255,255,255,0.04) 0%, transparent 70%)`;
  };

  const handleMouseLeave = () => {
    if (spotlightRef.current) {
      spotlightRef.current.style.background = "";
    }
  };

  const { addToCart } = useCart();
  const { showToast } = useToast();

  const frontImage = `/colors/${color.toLowerCase()}.jpeg`;
  const backImage = `/colors/${color.toLowerCase()}-2.jpeg`;

  useEffect(() => {
    const img = new Image();
    img.src = backImage;
    img.onload = () => setBackImageExists(true);
  }, [backImage]);

  const navigateToPDP = () => {
    router.push(`/product/blank-tee?color=${color.toLowerCase()}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: `${color}-${size}-${Date.now()}`,
      name: "Oversized Tee",
      color,
      size,
      price: BASE_PRICE,
      image: frontImage,
      quantity: 1,
    });
    setAdded(true);
    showToast(`${color} added to cart ✓`);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: `${color}-${size}-${Date.now()}`,
      name: "Oversized Tee",
      color,
      size,
      price: BASE_PRICE,
      image: frontImage,
      quantity: 1,
    });
    router.push("/checkout");
  };

  const handleQuickViewBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: `${color}-${size}-${Date.now()}`,
      name: "Oversized Tee",
      color,
      size,
      price: BASE_PRICE,
      image: frontImage,
      quantity: 1,
    });
    setQuickViewOpen(false);
    showToast(`${color} added to cart ✓`);
  };

  return (
    <>
      <div
        ref={cardRef}
        onClick={navigateToPDP}
        className="group border border-white/[0.07] rounded-3xl p-5 md:p-6 transition-all duration-700 bg-zinc-950 hover:border-white/25 hover:bg-white/[0.02] hover:shadow-[0_32px_64px_-16px_rgba(255,255,255,0.08)] hover:-translate-y-2 cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHovered(false); handleMouseLeave(); }}
      >
        <div className="overflow-hidden rounded-2xl mb-4 relative">
          <div
            ref={spotlightRef}
            className="absolute inset-0 z-10 pointer-events-none rounded-2xl"
          />
          <img
            ref={imgRef}
            src={backImageExists && hovered ? backImage : frontImage}
            alt={color}
            onError={() => { if (imgRef.current) imgRef.current.src = "/placeholder.svg"; }}
            className="w-full aspect-square object-cover transition-all duration-700 ease-out group-hover:scale-[1.12]"
          />
          <button
            onClick={(e) => { e.stopPropagation(); setQuickViewOpen(true); }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/[0.08] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-black cursor-pointer z-20"
          >
            <Expand size={13} />
          </button>
        </div>

        <h3 className="text-center font-bold text-lg md:text-xl mb-4 tracking-tight">{color}</h3>

        <div className="flex flex-wrap gap-1.5 justify-center mb-4 w-full">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); setSize(s); }}
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
          <p className="text-2xl font-bold tracking-tight">{BASE_PRICE} EGP</p>
        </div>

        <button
          onClick={handleAddToCart}
          className={`w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
            added
              ? "bg-green-500 text-white"
              : "bg-white text-black hover:scale-[1.03] active:scale-[0.98]"
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

      {/* Quick View Modal */}
      {quickViewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
          onClick={() => setQuickViewOpen(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative bg-zinc-900 border border-white/[0.08] rounded-3xl max-w-lg w-full p-6 md:p-8 animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQuickViewOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all duration-200 cursor-pointer z-10"
            >
              <X size={14} />
            </button>
            <div className="rounded-2xl overflow-hidden mb-5">
              <img
                src={frontImage}
                alt={color}
                className="w-full aspect-square object-cover"
              />
            </div>
            <h3 className="text-xl font-bold mb-3 tracking-tight">{color} Oversized Tee</h3>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-black tracking-tight">{BASE_PRICE} EGP</span>
              <span className="text-zinc-500 text-sm line-through">{COMPARE_PRICE} EGP</span>
            </div>
            <p className="text-zinc-400 text-sm mb-5 leading-relaxed">
              100% cotton oversized tee. Relaxed fit with dropped shoulders. Made in Egypt.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`px-4 py-2 border rounded-full text-sm transition-all duration-200 cursor-pointer ${
                    size === s
                      ? "bg-white text-black border-white"
                      : "border-white/15 text-zinc-400 hover:border-white/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={handleQuickViewBuy}
              className="w-full bg-white text-black py-3.5 rounded-full font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
            >
              Add to Cart — {BASE_PRICE} EGP
            </button>
          </div>
        </div>
      )}
    </>
  );
}

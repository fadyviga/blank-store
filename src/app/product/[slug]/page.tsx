"use client";

import { useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Check, Minus, Plus } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useToast } from "../../components/Toast";
import { BASE_PRICE, COMPARE_PRICE } from "@/types";

const COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#ffffff" },
  { name: "Blue", hex: "#1a3a5c" },
  { name: "Green", hex: "#2d5a27" },
  { name: "Gray", hex: "#6b7280" },
  { name: "Brown", hex: "#5c3d2e" },
  { name: "Navy", hex: "#1e2761" },
  { name: "Burgundy", hex: "#4a1a2a" },
  { name: "Beige", hex: "#d4c5a9" },
];

const SIZES = ["M", "L", "XL", "XXL"] as const;
const PRODUCT_NAME = "Oversized Tee";
const MAX_QTY = 10;

export default function ProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const initialColor = useMemo(() => {
    const fromParam = searchParams.get("color");
    if (fromParam) {
      const match = COLORS.find(
        (c) => c.name.toLowerCase() === fromParam.toLowerCase()
      );
      if (match) return match;
    }
    return COLORS[0];
  }, [searchParams]);

  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const handleColorChange = useCallback(
    (color: (typeof COLORS)[0]) => {
      if (color.name === selectedColor.name) return;
      setImageLoading(true);
      setSelectedColor(color);
      setAdded(false);
      window.history.replaceState(
        {},
        "",
        `/product/${params.slug}?color=${color.name.toLowerCase()}`
      );
    },
    [params.slug, selectedColor.name]
  );

  const handleAddToCart = useCallback(() => {
    if (!selectedSize) {
      showToast("Please select a size", "error");
      return;
    }
    addToCart({
      id: `${PRODUCT_NAME}-${selectedColor.name}-${selectedSize}-${Date.now()}`,
      name: PRODUCT_NAME,
      color: selectedColor.name,
      size: selectedSize,
      price: BASE_PRICE,
      image: `/colors/${selectedColor.name.toLowerCase()}.jpeg`,
      quantity,
    });
    setAdded(true);
    showToast(`${selectedColor.name} — ${selectedSize} added to cart ✓`);
    setTimeout(() => setAdded(false), 2500);
  }, [selectedColor, selectedSize, quantity, addToCart, showToast]);

  const handleBuyNow = useCallback(() => {
    if (!selectedSize) {
      showToast("Please select a size", "error");
      return;
    }
    addToCart({
      id: `${PRODUCT_NAME}-${selectedColor.name}-${selectedSize}-${Date.now()}`,
      name: PRODUCT_NAME,
      color: selectedColor.name,
      size: selectedSize,
      price: BASE_PRICE,
      image: `/colors/${selectedColor.name.toLowerCase()}.jpeg`,
      quantity,
    });
    router.push("/checkout");
  }, [selectedColor, selectedSize, quantity, addToCart, router, showToast]);

  const discount = Math.round(
    ((COMPARE_PRICE - BASE_PRICE) / COMPARE_PRICE) * 100
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto">
        <div className="px-5 pt-5 md:px-10 md:pt-10">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors duration-300 group"
          >
            <ArrowLeft
              size={15}
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />
            Back
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-0 md:gap-16 px-5 md:px-10 pb-16 md:pb-24">
          {/* ─── IMAGE ─── */}
          <div className="relative pt-3 md:pt-8">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-zinc-900">
              <img
                key={selectedColor.name}
                src={`/colors/${selectedColor.name.toLowerCase()}.jpeg`}
                alt={selectedColor.name}
                onLoad={() => setImageLoading(false)}
                className={`w-full h-full object-cover transition-all duration-700 ease-out ${
                  imageLoading
                    ? "opacity-0 scale-[1.03]"
                    : "opacity-100 scale-100"
                }`}
              />
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-700"
                style={{
                  backgroundColor: selectedColor.hex,
                  opacity: selectedColor.name === "White" ? 0 : 0.04,
                }}
              />
            </div>

            <p className="text-center text-zinc-600 text-xs tracking-wider mt-4 md:mt-5 uppercase">
              {selectedColor.name}
            </p>
          </div>

          {/* ─── DETAILS ─── */}
          <div className="flex flex-col pt-5 md:pt-12">
            <div className="opacity-0 animate-slide-up-fade pdp-detail-1">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1] mb-3">
                {PRODUCT_NAME}
              </h1>
              <p className="text-zinc-500 text-sm md:text-base leading-relaxed mb-6 max-w-md">
                100% cotton oversized tee. Relaxed fit with dropped shoulders.
                Made in Egypt.
              </p>
            </div>

            <div className="opacity-0 animate-slide-up-fade pdp-detail-2">
              <div className="flex items-baseline gap-3 mb-8">
                <span className="text-3xl md:text-4xl font-black tracking-tight">
                  {BASE_PRICE} EGP
                </span>
                <span className="text-lg md:text-xl text-zinc-600 line-through">
                  {COMPARE_PRICE} EGP
                </span>
                <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full">
                  -{discount}%
                </span>
              </div>
            </div>

            {/* ─── COLOR SELECTOR ─── */}
            <div className="mb-8 opacity-0 animate-slide-up-fade pdp-detail-3">
              <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-4">
                Color —{" "}
                <span className="text-white font-medium">
                  {selectedColor.name}
                </span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorChange(color)}
                    className={`w-10 h-10 rounded-full border-2 transition-all duration-300 cursor-pointer ${
                      selectedColor.name === color.name
                        ? "border-white scale-110 shadow-[0_0_16px_-2px_rgba(255,255,255,0.15)]"
                        : "border-white/20 hover:border-white/50"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    aria-label={color.name}
                  />
                ))}
              </div>
            </div>

            {/* ─── SIZE SELECTOR ─── */}
            <div className="mb-8 opacity-0 animate-slide-up-fade pdp-detail-4">
              <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-4">
                Size
              </p>
              <div className="flex flex-wrap gap-2.5">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`min-w-[4rem] px-5 py-3 border rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      selectedSize === s
                        ? "bg-white text-black border-white"
                        : "border-white/15 text-zinc-400 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── QUANTITY ─── */}
            <div className="mb-10 opacity-0 animate-slide-up-fade pdp-detail-5">
              <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-4">
                Quantity
              </p>
              <div className="inline-flex items-center border border-white/[0.12] rounded-2xl overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className={`w-14 h-14 flex items-center justify-center transition-all duration-200 ${
                    quantity <= 1
                      ? "text-zinc-700 cursor-not-allowed"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
                  }`}
                >
                  <Minus size={16} />
                </button>
                <span className="w-16 text-center font-bold text-lg tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(MAX_QTY, quantity + 1))}
                  disabled={quantity >= MAX_QTY}
                  className={`w-14 h-14 flex items-center justify-center transition-all duration-200 ${
                    quantity >= MAX_QTY
                      ? "text-zinc-700 cursor-not-allowed"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
                  }`}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* ─── ACTIONS ─── */}
            <div className="space-y-3 opacity-0 animate-slide-up-fade pdp-detail-6">
              <button
                onClick={handleAddToCart}
                className={`w-full py-4 md:py-5 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                  added
                    ? "bg-green-500 text-white"
                    : "bg-white text-black hover:scale-[1.01] active:scale-[0.99]"
                }`}
              >
                {added ? (
                  <>
                    <Check size={18} />
                    Added to Cart ✓
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
                className="w-full border border-white/[0.15] py-4 md:py-5 rounded-2xl font-bold text-sm md:text-base text-zinc-300 hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer active:scale-[0.99]"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

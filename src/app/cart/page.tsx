"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, Package, ChevronRight } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useCart } from "../hooks/useCart";
import { useToast } from "../components/Toast";
import {
  getApplicableBundle,
  getBundleTotal,
  getBundleSavings,
  BUNDLE_2_COUNT,
  BUNDLE_2_PRICE,
  BUNDLE_3_COUNT,
  BUNDLE_3_PRICE,
  BUNDLE_4_COUNT,
  BUNDLE_4_PRICE,
} from "@/types";

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { showToast } = useToast();
  const [bumpIndex, setBumpIndex] = useState<number | null>(null);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const bundle = getApplicableBundle(itemCount);
  const bundleTotal = getBundleTotal(itemCount);
  const savings = getBundleSavings(itemCount);
  const hasBundle = bundle !== null;

  const increaseQty = (index: number) => {
    if (!cart[index]) return;
    updateQuantity(index, cart[index].quantity + 1);
    setBumpIndex(index);
    setTimeout(() => setBumpIndex(null), 200);
  };

  const decreaseQty = (index: number) => {
    if (!cart[index]) return;
    updateQuantity(index, cart[index].quantity - 1);
    setBumpIndex(index);
    setTimeout(() => setBumpIndex(null), 200);
  };

  const removeItem = (index: number) => {
    const item = cart[index];
    if (!item) return;
    removeFromCart(index);
    showToast(`${item.name} removed from cart`, "info");
  };

  const getOfferMessage = () => {
    if (itemCount >= BUNDLE_4_COUNT)
      return { title: "Best Bundle Applied", desc: `4 Tees for ${BUNDLE_4_PRICE} EGP` };
    if (itemCount >= BUNDLE_3_COUNT)
      return { title: "Bundle Offer Applied", desc: `3 Tees for ${BUNDLE_3_PRICE} EGP` };
    if (itemCount >= BUNDLE_2_COUNT)
      return { title: "Bundle Offer Applied", desc: `2 Tees for ${BUNDLE_2_PRICE} EGP` };
    const needed = itemCount === 0 ? BUNDLE_2_COUNT : BUNDLE_2_COUNT - itemCount;
    return {
      title: `Add ${needed} more`,
      desc: needed === 1 ? "1 item away from the 2-piece offer" : `${needed} items away from the 2-piece offer`,
    };
  };

  const offer = getOfferMessage();

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 md:px-10 md:py-14">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight mb-6">
          Your Cart
        </h1>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-all duration-300 mb-10 group"
        >
          <ArrowLeft size={15} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          Continue Shopping
        </button>

        {cart.length === 0 ? (
          <div className="text-center py-24">
            <Package size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-500 mb-6">Cart is empty</p>
            <button
              onClick={() => router.push("/")}
              className="bg-white text-black px-8 py-3.5 rounded-full font-semibold text-sm hover:scale-[1.02] hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.15)] transition-all duration-300 cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div
                className={`rounded-2xl backdrop-blur-xl border p-4 md:p-5 transition-all duration-500 ${
                  hasBundle
                    ? "bg-white/[0.03] border-zinc-500/20"
                    : "bg-white/[0.015] border-white/5"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      hasBundle ? "bg-white text-black" : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    <Package size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold text-sm transition-colors ${
                        hasBundle ? "text-white" : "text-zinc-400"
                      }`}
                    >
                      {offer.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {offer.desc}
                    </p>
                  </div>
                  {!hasBundle ? (
                    <span className="text-xs text-zinc-600 uppercase tracking-wider whitespace-nowrap">
                      {itemCount === 0 ? "Add items" : `${itemCount}/2`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <span className="text-green-400 font-medium">Active</span>
                      <ChevronRight size={12} />
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 md:space-y-5 mb-10">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className={`border border-white/[0.07] rounded-3xl p-5 md:p-6 flex flex-col md:flex-row gap-5 md:items-center justify-between transition-all duration-300 hover:border-white/20 hover:bg-white/[0.01] opacity-0 animate-slide-in-right stagger-${index + 1}`}
                >
                  <div className="flex gap-4 md:gap-5">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-2xl"
                    />
                    <div className="min-w-0">
                      <h2 className="font-bold text-xl md:text-2xl tracking-tight">
                        {item.name}
                      </h2>
                      <p className="text-zinc-500 text-sm mt-1">
                        {item.color} / {item.size}
                      </p>
                      <p className="mt-3 font-bold text-base">
                        {item.price} <span className="text-zinc-500 text-sm font-normal">EGP</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => decreaseQty(index)}
                      disabled={item.quantity <= 1}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                        item.quantity <= 1
                          ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                          : "bg-zinc-800 hover:bg-zinc-700 hover:animate-qty-glow cursor-pointer text-zinc-300 hover:text-white"
                      }`}
                    >
                      <Minus size={15} />
                    </button>

                    <span
                      className={`text-lg font-bold w-6 text-center transition-all duration-150 ${
                        bumpIndex === index ? "animate-bump" : ""
                      }`}
                    >
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => increaseQty(index)}
                      className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 hover:animate-qty-glow flex items-center justify-center transition-all duration-200 cursor-pointer text-zinc-300 hover:text-white"
                    >
                      <Plus size={15} />
                    </button>

                    <button
                      onClick={() => removeItem(index)}
                      className="ml-2 text-zinc-600 hover:text-red-400 transition-all duration-200 cursor-pointer"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasBundle && savings > 0 && (
              <div className="animate-savings-in mb-8">
                <div className="bg-zinc-900/30 border border-zinc-500/10 rounded-2xl p-5 md:p-6">
                  <div className="flex items-center justify-between text-sm text-zinc-400 mb-3">
                    <span>Regular Price</span>
                    <span className="line-through text-zinc-600">{cartTotal} EGP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Bundle Price</span>
                    <span className="font-bold text-xl tracking-tight">{bundleTotal} EGP</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs text-green-400/90 font-medium tracking-wide">You Save</span>
                    <span className="text-green-400 font-bold text-lg">{savings} EGP</span>
                  </div>
                  {bundle?.isBestValue && (
                    <div className="mt-4">
                      <span className="inline-block text-[10px] uppercase tracking-[0.2em] font-bold bg-gradient-to-r from-zinc-200 to-white text-black px-3 py-1 rounded-full">
                        Best Value Bundle
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-5 justify-between items-center border-t border-white/[0.06] pt-6 md:pt-8">
              <div>
                <p className="text-zinc-500 text-xs tracking-wider uppercase mb-1">Total</p>
                <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-black tracking-tight">{bundleTotal} EGP</h2>
                {hasBundle && (
                  <p className="text-zinc-600 text-xs line-through mt-1">{cartTotal} EGP</p>
                )}
              </div>

              <button
                onClick={() => router.push("/checkout")}
                className="bg-white text-black px-10 py-4 rounded-full font-bold text-sm hover:scale-[1.03] hover:shadow-[0_0_32px_-6px_rgba(255,255,255,0.2)] transition-all duration-300 cursor-pointer"
              >
                Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
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
  BASE_PRICE,
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
      progress: true,
    };
  };

  const offer = getOfferMessage();

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">

      <h1 className="text-4xl font-bold mb-10">
        Your Cart
      </h1>
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8"
      >
        <ArrowLeft size={18} />
        Continue Shopping
      </button>

      {cart.length === 0 ? (
        <p className="text-zinc-400">
          Cart is empty
        </p>
      ) : (
        <>
          <div className="mb-8">
            <div
              className={`rounded-2xl backdrop-blur-xl border p-5 transition-all duration-500 ${
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
                  <Package size={18} />
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
                {!hasBundle && (
                  <span className="text-xs text-zinc-600 uppercase tracking-wider whitespace-nowrap">
                    {itemCount === 0 ? "Add items" : `${itemCount}/2`}
                  </span>
                )}
                {hasBundle && (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                    <span className="text-green-400 font-medium">Active</span>
                    <ChevronRight size={12} />
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5 mb-10">
            {cart.map((item, index) => (
              <div
                key={index}
                className="border border-white/10 rounded-3xl p-5 flex flex-col md:flex-row gap-5 md:items-center justify-between hover:border-white/20 transition"
              >
                <div className="flex gap-5">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-28 h-28 object-cover rounded-2xl"
                  />
                  <div>
                    <h2 className="font-bold text-2xl">
                      {item.name}
                    </h2>
                    <p className="text-zinc-400 mt-1">
                      {item.color} / {item.size}
                    </p>
                    <p className="mt-3 font-bold">
                      {item.price} EGP
                    </p>
                    <p className="text-zinc-500 text-sm">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => decreaseQty(index)}
                    disabled={item.quantity <= 1}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                      item.quantity <= 1
                        ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                        : "bg-zinc-900 hover:bg-zinc-700 cursor-pointer"
                    }`}
                  >
                    <Minus size={16} />
                  </button>

                  <span
                    className={`text-xl font-bold transition-all duration-150 ${
                      bumpIndex === index ? "animate-bump" : ""
                    }`}
                  >
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => increaseQty(index)}
                    className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-700 flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>

                  <button
                    onClick={() => removeItem(index)}
                    className="ml-4 text-red-500"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hasBundle && savings > 0 && (
            <div className="animate-savings-in mb-8">
              <div className="bg-zinc-900/50 border border-zinc-500/10 rounded-2xl p-5">
                <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
                  <span>Regular Price</span>
                  <span className="line-through text-zinc-600">{cartTotal} EGP</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold">Bundle Price</span>
                  <span className="font-bold text-lg">{bundleTotal} EGP</span>
                </div>
                {savings > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-green-400 font-medium">You Save</span>
                    <span className="text-green-400 font-bold">{savings} EGP</span>
                  </div>
                )}
                {bundle?.isBestValue && (
                  <div className="mt-3">
                    <span className="inline-block text-[10px] uppercase tracking-[0.2em] font-bold bg-gradient-to-r from-zinc-200 to-white text-black px-3 py-1 rounded-full">
                      Best Value Bundle
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-5 justify-between items-center border-t border-white/10 pt-6">
            <div>
              <p className="text-zinc-500 text-sm">Total</p>
              <h2 className="text-3xl font-bold">{bundleTotal} EGP</h2>
              {hasBundle && (
                <p className="text-zinc-600 text-xs line-through">{cartTotal} EGP</p>
              )}
            </div>

            <button
              onClick={() => router.push("/checkout")}
              className="bg-white text-black px-8 py-4 rounded-full font-bold hover:scale-105 transition"
            >
              Checkout
            </button>
          </div>
        </>
      )}

    </main>
  );
}
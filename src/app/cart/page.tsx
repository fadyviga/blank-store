"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useCart } from "../hooks/useCart";
import { useToast } from "../components/Toast";

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { showToast } = useToast();
  const [bumpIndex, setBumpIndex] = useState<number | null>(null);

  const increaseQty = (index: number) => {
    updateQuantity(index, cart[index].quantity + 1);
    setBumpIndex(index);
    setTimeout(() => setBumpIndex(null), 200);
  };

  const decreaseQty = (index: number) => {
    updateQuantity(index, cart[index].quantity - 1);
    setBumpIndex(index);
    setTimeout(() => setBumpIndex(null), 200);
  };

  const removeItem = (index: number) => {
    const item = cart[index];
    removeFromCart(index);
    showToast(`${item.name} removed from cart`, "info");
  };

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
          <div className="space-y-5 mb-10">

            {cart.map((item, index) => (
              <div
                key={index}
                className="border border-white/10 rounded-3xl p-5 flex flex-col md:flex-row gap-5 md:items-center justify-between"
              >

                {/* صورة */}
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

                {/* التحكم */}
                <div className="flex items-center gap-4">

                  {/* ناقص */}
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

                  {/* الكمية */}
                  <span
                    className={`text-xl font-bold transition-all duration-150 ${
                      bumpIndex === index ? "animate-bump" : ""
                    }`}
                  >
                    {item.quantity}
                  </span>

                  {/* زائد */}
                  <button
                    onClick={() => increaseQty(index)}
                    className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-700 flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>

                  {/* حذف */}
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

          {/* الإجمالي */}
          <div className="flex flex-col md:flex-row gap-5 justify-between items-center border-t border-white/10 pt-6">

            <h2 className="text-3xl font-bold">
              Total: {cartTotal} EGP
            </h2>

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
"use client";

import { useEffect, useState } from "react";

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("cart");
    if (stored) setCart(JSON.parse(stored));
  }, []);

  const removeItem = (id: string) => {
    const updated = cart.filter((i) => i.id !== id);
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-3xl mb-6">Cart</h1>

      {cart.length === 0 ? (
        <p className="text-zinc-400">Your cart is empty 🛒</p>
      ) : (
        <>
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center border border-white/10 p-4 mb-3 rounded-xl"
            >
              <div className="flex gap-4 items-center">
                <img src={item.image} className="w-16 h-16 rounded-lg" />

                <div>
                  <p>{item.name}</p>
                  <p className="text-zinc-400">
                    {item.color} / {item.size}
                  </p>
                </div>
              </div>

              <button
                onClick={() => removeItem(item.id)}
                className="text-red-400"
              >
                Remove
              </button>
            </div>
          ))}

          <div className="mt-6 text-xl">
            Total: {total} EGP
          </div>

         <a
  href="/checkout"
  className="mt-4 inline-block bg-white text-black px-6 py-3 rounded-full"
>
  Checkout (COD)
</a>
        </>
      )}
    </main>
  );
}
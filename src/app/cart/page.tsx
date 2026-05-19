"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("cart");

    if (stored) {
      setCart(JSON.parse(stored));
    }
  }, []);

  const total = cart.reduce(
    (sum, item) => sum + item.price,
    0
  );

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-4xl font-bold mb-10">
        Your Cart
      </h1>

      {cart.length === 0 ? (
        <p className="text-zinc-400">
          Cart is empty
        </p>
      ) : (
        <>
          <div className="space-y-4 mb-10">

            {cart.map((item, index) => (
              <div
                key={index}
                className="border border-white/10 rounded-2xl p-5 flex justify-between"
              >
                <div>
                  <h2 className="font-bold text-xl">
                    {item.name}
                  </h2>

                  <p className="text-zinc-400">
                    {item.color} / {item.size}
                  </p>
                </div>

                <p className="font-bold">
                  {item.price} EGP
                </p>
              </div>
            ))}

          </div>

          <div className="flex justify-between items-center">

            <h2 className="text-2xl font-bold">
              Total: {total} EGP
            </h2>

            <button
              onClick={() => router.push("/checkout")}
              className="bg-white text-black px-8 py-4 rounded-full font-semibold"
            >
              Checkout
            </button>

          </div>
        </>
      )}

    </main>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: any) => {
    e.preventDefault();

    if (!name || !phone) return;

    const stored = localStorage.getItem("orders");
    const orders = stored ? JSON.parse(stored) : [];

    orders.push({
      id: Date.now(),
      name,
      phone,
      date: new Date().toLocaleString(),
    });

    localStorage.setItem("orders", JSON.stringify(orders));

    localStorage.removeItem("cart");

    router.push("/thanks");
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-zinc-900 p-8 rounded-3xl border border-white/10"
      >

        <h1 className="text-3xl font-bold mb-8 text-center">
          Checkout
        </h1>

        <div className="space-y-5">

          <input
            type="text"
            placeholder="Your Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 outline-none"
          />

          <input
            type="tel"
            placeholder="Phone Number"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 outline-none"
          />

          <button
            type="submit"
            className="w-full bg-white text-black py-4 rounded-xl font-bold hover:scale-[1.02] transition"
          >
            Place Order
          </button>

        </div>

      </form>

    </main>
  );
}
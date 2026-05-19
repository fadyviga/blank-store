"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CheckoutPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [cart, setCart] = useState<any[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  // تحميل الكارت
  useEffect(() => {
    const stored = localStorage.getItem("cart");

    if (stored) {
      const parsedCart = JSON.parse(stored);

      setCart(parsedCart);

      const total = parsedCart.reduce(
        (sum: number, item: any) =>
          sum + item.price * item.quantity,
        0
      );

      setTotalPrice(total);
    }
  }, []);

  const handleSubmit = (e: any) => {
    e.preventDefault();

    if (!name || !phone || !address) return;

    const stored = localStorage.getItem("orders");
    const orders = stored ? JSON.parse(stored) : [];

    orders.push({
      id: Date.now(),
      name,
      phone,
      address,
      items: cart,
      total: totalPrice,
      date: new Date().toLocaleString(),
    });

    localStorage.setItem("orders", JSON.stringify(orders));

    // مسح الكارت
    localStorage.removeItem("cart");

    router.push("/thanks");
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
<button
  onClick={() => router.push("/cart")}
  className="absolute top-8 left-8 text-zinc-400 hover:text-white transition"
>
  ← Back to Cart
</button>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-zinc-900 p-8 rounded-3xl border border-white/10"
      >

        <h1 className="text-3xl font-bold mb-8 text-center">
          Checkout
        </h1>

        <div className="space-y-5">

          {/* الاسم */}
          <input
            type="text"
            placeholder="Your Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 outline-none"
          />

          {/* الرقم */}
          <input
            type="tel"
            placeholder="Phone Number"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 outline-none"
          />

          {/* العنوان */}
          <input
            type="text"
            placeholder="Address"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 outline-none"
          />

          {/* الإجمالي */}
          <div className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-zinc-400">
            Total: {totalPrice} EGP
          </div>

          {/* زر الطلب */}
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
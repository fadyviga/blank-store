"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CheckoutPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const placeOrder = async () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    if (cart.length === 0) {
      alert("Cart is empty 🛒");
      return;
    }

    if (!name || !phone || !address) {
      alert("Please fill all fields");
      return;
    }

    const total = cart.reduce(
      (sum: number, i: any) => sum + i.price,
      0
    );

    // 🧠 1. Save to Supabase
    const { error } = await supabase.from("orders").insert({
      name,
      phone,
      address,
      items: cart,
      total,
    });

    if (error) {
      console.log(error);
      alert("Error placing order ❌");
      return;
    }

    // 📊 2. Send to Google Sheets (Excel)
    try {
      await fetch(
        "https://script.google.com/macros/s/AKfycbwd34_84XsoWoak1fjPTtaZO7lu51XtL3cm2YO6Hqw0udwBsn3Hv5NiA_8p2rtqNytOKA/exec",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            phone,
            address,
            items: cart.map((i: any) => `${i.name} (${i.color}/${i.size})`).join(", "),
            total,
          }),
        }
      );
    } catch (err) {
      console.log("Sheet error:", err);
    }

    // 📲 3. WhatsApp message
    const message = `
🛒 New Order

👤 Name: ${name}
📞 Phone: ${phone}
🏠 Address: ${address}

📦 Items:
${cart
  .map((i: any) => `- ${i.name} (${i.color}/${i.size})`)
  .join("\n")}

💰 Total: ${total} EGP
`;

    window.open(
      `https://wa.me/201287659463?text=${encodeURIComponent(message)}`,
      "_blank"
    );

    // 🧹 4. Clear cart
    localStorage.removeItem("cart");

    alert("Order placed successfully ✅");

    window.location.href = "/";
  };

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-3xl mb-6">Checkout (Cash on Delivery)</h1>

      <div className="max-w-md space-y-4">

        <input
          placeholder="Full Name"
          className="w-full p-3 bg-black border border-white/20 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Phone Number"
          className="w-full p-3 bg-black border border-white/20 rounded"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <textarea
          placeholder="Full Address"
          className="w-full p-3 bg-black border border-white/20 rounded"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <button
          onClick={placeOrder}
          className="w-full bg-white text-black py-3 rounded-full font-semibold hover:scale-105 transition"
        >
          Place Order (COD)
        </button>

      </div>

    </main>
  );
}
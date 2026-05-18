"use client";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("orders");
    if (stored) setOrders(JSON.parse(stored));
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-3xl mb-6">📊 Orders Dashboard</h1>

      {orders.length === 0 ? (
        <p className="text-zinc-400">No orders yet</p>
      ) : (
        <div className="space-y-4">

          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-white/10 p-4 rounded-xl"
            >

              {/* Customer Info */}
              <div className="mb-3">
                <p className="text-lg font-bold">{order.name}</p>
                <p className="text-zinc-400">{order.phone}</p>
                <p className="text-zinc-400">{order.address}</p>
              </div>

              {/* Items */}
              <div className="mb-3">
                {order.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm text-zinc-300"
                  >
                    <span>
                      {item.name} ({item.color} / {item.size})
                    </span>
                    <span>{item.price} EGP</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-white/10 pt-2 mt-2">
                <p className="font-bold">
                  Total: {order.total} EGP
                </p>
                <p className="text-xs text-zinc-500">
                  {order.date}
                </p>
              </div>

            </div>
          ))}

        </div>
      )}

    </main>
  );
}
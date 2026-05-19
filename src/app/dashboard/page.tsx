"use client";

import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Wallet,
  Users,
  Trash2,
} from "lucide-react";

export default function DashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem("orders");

    if (stored) {
      const parsedOrders = JSON.parse(stored);

      setOrders(parsedOrders);

      const revenue = parsedOrders.reduce(
        (sum: number, order: any) => sum + order.total,
        0
      );

      const customers = new Set(
        parsedOrders.map((o: any) => o.phone)
      ).size;

      setStats({
        totalOrders: parsedOrders.length,
        totalRevenue: revenue,
        totalCustomers: customers,
      });
    }
  }, []);

  // حذف اوردر
  const deleteOrder = (id: number) => {
    const updated = orders.filter((o) => o.id !== id);

    setOrders(updated);

    localStorage.setItem(
      "orders",
      JSON.stringify(updated)
    );

    const revenue = updated.reduce(
      (sum: number, order: any) => sum + order.total,
      0
    );

    const customers = new Set(
      updated.map((o: any) => o.phone)
    ).size;

    setStats({
      totalOrders: updated.length,
      totalRevenue: revenue,
      totalCustomers: customers,
    });
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">

      {/* Header */}
      <div className="mb-10">

        <p className="text-zinc-500 uppercase tracking-[0.3em] mb-3">
          Blank Store
        </p>

        <h1 className="text-5xl font-black">
          Dashboard
        </h1>

      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

        {/* Orders */}
        <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6">

          <div className="flex items-center justify-between mb-5">
            <ShoppingBag size={28} />
            <span className="text-zinc-500 text-sm">
              Orders
            </span>
          </div>

          <h2 className="text-4xl font-bold">
            {stats.totalOrders}
          </h2>

        </div>

        {/* Revenue */}
        <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6">

          <div className="flex items-center justify-between mb-5">
            <Wallet size={28} />
            <span className="text-zinc-500 text-sm">
              Revenue
            </span>
          </div>

          <h2 className="text-4xl font-bold">
            {stats.totalRevenue} EGP
          </h2>

        </div>

        {/* Customers */}
        <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6">

          <div className="flex items-center justify-between mb-5">
            <Users size={28} />
            <span className="text-zinc-500 text-sm">
              Customers
            </span>
          </div>

          <h2 className="text-4xl font-bold">
            {stats.totalCustomers}
          </h2>

        </div>

      </div>

      {/* Orders */}
      <div>

        <h2 className="text-3xl font-bold mb-8">
          Latest Orders
        </h2>

        {orders.length === 0 ? (

          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-10 text-center text-zinc-500">
            No orders yet
          </div>

        ) : (

          <div className="space-y-6">

            {orders
              .slice()
              .reverse()
              .map((order) => (

                <div
                  key={order.id}
                  className="bg-zinc-950 border border-white/10 rounded-3xl p-6"
                >

                  {/* Top */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

                    <div>

                      <h3 className="text-2xl font-bold">
                        {order.name}
                      </h3>

                      <p className="text-zinc-400">
                        {order.phone}
                      </p>

                      <p className="text-zinc-500 text-sm mt-1">
                        {order.address}
                      </p>

                    </div>

                    <div className="text-left md:text-right">

                      <p className="text-2xl font-bold">
                        {order.total} EGP
                      </p>

                      <p className="text-zinc-500 text-sm">
                        {order.date}
                      </p>

                    </div>

                  </div>

                  {/* Items */}
                  <div className="space-y-4">

                    {order.items?.map((item: any, index: number) => (

                      <div
                        key={index}
                        className="flex items-center justify-between border border-white/5 rounded-2xl p-4"
                      >

                        <div className="flex items-center gap-4">

                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-2xl"
                          />

                          <div>

                            <h4 className="font-bold">
                              {item.name}
                            </h4>

                            <p className="text-zinc-400 text-sm">
                              {item.color} / {item.size}
                            </p>

                            <p className="text-zinc-500 text-sm">
                              Qty: {item.quantity}
                            </p>

                          </div>

                        </div>

                        <p className="font-bold">
                          {item.price * item.quantity} EGP
                        </p>

                      </div>

                    ))}

                  </div>

                  {/* Delete */}
                  <div className="mt-6 flex justify-end">

                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="flex items-center gap-2 text-red-500 hover:text-red-400 transition"
                    >
                      <Trash2 size={18} />
                      Delete Order
                    </button>

                  </div>

                </div>

              ))}

          </div>

        )}

      </div>

    </main>
  );
}
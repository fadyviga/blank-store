"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Package } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { loadOrders, type Order } from "../../lib/order";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      setOrders(loadOrders().filter((o) => o.customer.phone));
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
            <User size={24} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{user.email}</h1>
            <p className="text-zinc-500 text-sm">
              {user.role === "admin" ? "Administrator" : "Customer"}
            </p>
          </div>
        </div>

        <section className="border-t border-white/10 pt-10">
          <div className="flex items-center gap-2 mb-6">
            <Package size={20} className="text-zinc-400" />
            <h2 className="text-2xl font-bold">Order History</h2>
          </div>

          {orders.length === 0 ? (
            <div className="bg-zinc-950 border border-white/10 rounded-3xl p-10 text-center">
              <p className="text-zinc-500 mb-4">No orders yet</p>
              <button
                onClick={() => router.push("/")}
                className="bg-white text-black px-6 py-3 rounded-full font-medium hover:scale-105 transition"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice().reverse().map((order) => (
                <div
                  key={order.id}
                  className="bg-zinc-950 border border-white/10 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-zinc-500 tracking-wider">
                      {order.displayId}
                    </span>
                    <span className="text-xs font-medium capitalize text-zinc-400">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-lg font-bold">{order.total} EGP</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

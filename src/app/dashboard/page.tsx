"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShoppingBag,
  Wallet,
  Users,
  Trash2,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import {
  loadOrders,
  saveOrders,
  updateOrderStatus,
  STATUS_COLORS,
  type Order,
  type OrderStatus,
} from "../../lib/order";

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortNewest, setSortNewest] = useState(true);

  useEffect(() => {
    setOrders(loadOrders());
  }, []);

  const filtered = useMemo(() => {
    let result = [...orders];
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }
    result.sort((a, b) => {
      const diff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortNewest ? diff : -diff;
    });
    return result;
  }, [orders, statusFilter, sortNewest]);

  const stats = useMemo(() => {
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    const customers = new Set(orders.map((o) => o.customer.phone)).size;
    return { totalOrders: orders.length, totalRevenue: revenue, totalCustomers: customers };
  }, [orders]);

  const handleDelete = (id: string) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    saveOrders(updated);
  };

  const handleStatusChange = (id: string, status: OrderStatus) => {
    setOrders((prev) => updateOrderStatus(id, status));
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <p className="text-zinc-500 uppercase tracking-[0.3em] mb-3">
            Blank Store
          </p>
          <h1 className="text-5xl font-black">Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <ShoppingBag size={28} />
              <span className="text-zinc-500 text-sm">Orders</span>
            </div>
            <h2 className="text-4xl font-bold">{stats.totalOrders}</h2>
          </div>

          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <Wallet size={28} />
              <span className="text-zinc-500 text-sm">Revenue</span>
            </div>
            <h2 className="text-4xl font-bold">{stats.totalRevenue} EGP</h2>
          </div>

          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <Users size={28} />
              <span className="text-zinc-500 text-sm">Customers</span>
            </div>
            <h2 className="text-4xl font-bold">{stats.totalCustomers}</h2>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-3xl font-bold">
            Orders
            {statusFilter !== "all" && (
              <span className="text-base font-normal text-zinc-500 ml-3">
                ({statusFilter})
              </span>
            )}
          </h2>

          <div className="flex items-center gap-3">
            <Filter size={16} className="text-zinc-500 shrink-0" />
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                  statusFilter === "all"
                    ? "bg-white text-black border-white"
                    : "bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30"
                }`}
              >
                All
              </button>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition border capitalize ${
                    statusFilter === s
                      ? "bg-white text-black border-white"
                      : "bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={() => setSortNewest(!sortNewest)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition ml-2"
              title={sortNewest ? "Newest first" : "Oldest first"}
            >
              <ArrowUpDown size={14} />
              {sortNewest ? "Newest" : "Oldest"}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-10 text-center text-zinc-500">
            {orders.length === 0
              ? "No orders yet"
              : "No orders match this filter"}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-950 border border-white/10 rounded-3xl p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-xs text-zinc-500 font-mono tracking-wider">
                        {order.displayId}
                      </p>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(
                            order.id,
                            e.target.value as OrderStatus
                          )
                        }
                        className={`text-xs font-medium rounded-full px-3 py-1 border capitalize appearance-none cursor-pointer outline-none ${
                          STATUS_COLORS[order.status]
                        }`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-zinc-900 text-white">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <h3 className="text-2xl font-bold">
                      {order.customer.name}
                    </h3>
                    <p className="text-zinc-400">{order.customer.phone}</p>
                    <p className="text-zinc-500 text-sm mt-1">
                      {order.customer.address}
                    </p>
                  </div>

                  <div className="text-left md:text-right shrink-0">
                    <p className="text-2xl font-bold">{order.total} EGP</p>
                    <p className="text-zinc-500 text-xs mt-1">
                      {new Date(order.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.items?.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between border border-white/5 rounded-2xl p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-zinc-500 text-xs">
                            {item.color} / {item.size} &middot; Qty:{" "}
                            {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium text-sm">
                        {item.price * item.quantity} EGP
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={14} />
                    Delete
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

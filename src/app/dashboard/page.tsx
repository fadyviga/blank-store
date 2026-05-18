"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuth] = useState(true);

  const [chartData, setChartData] = useState<any[]>([]);

  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    avgOrder: 0,
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  // 📦 FETCH DATA
  const fetchOrders = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false });

    const ordersData = data || [];
    setOrders(ordersData);

    // 📊 STATS
    const totalSales = ordersData.reduce(
      (sum, o) => sum + (o.total || 0),
      0
    );

    const totalOrders = ordersData.length;
    const avgOrder = totalOrders ? totalSales / totalOrders : 0;

    setStats({
      totalSales,
      totalOrders,
      avgOrder,
    });

    // 📈 CHART DATA (AI Aggregation)
    const map: any = {};

    ordersData.forEach((o) => {
      const date = new Date(o.created_at || Date.now())
        .toLocaleDateString();

      map[date] = (map[date] || 0) + (o.total || 0);
    });

    const chart = Object.keys(map).map((date) => ({
      date,
      sales: map[date],
    }));

    setChartData(chart);

    setLoading(false);
  };

  // 🔄 UPDATE STATUS
  const updateStatus = async (id: number, status: string) => {
    await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    fetchOrders();
  };

  // 🗑 DELETE ORDER
  const deleteOrder = async (id: number) => {
    await supabase.from("orders").delete().eq("id", id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // 🤖 AI INSIGHT (Best Product)
  const bestProduct = () => {
    const map: any = {};

    orders.forEach((order) => {
      order.items?.forEach((item: any) => {
        map[item.name] = (map[item.name] || 0) + 1;
      });
    });

    return Object.entries(map).sort(
      (a: any, b: any) => b[1] - a[1]
    )[0];
  };

  const best = bestProduct();

  if (!isAuth) {
    return (
      <div className="text-white p-10">
        Login required...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-10">

      <h1 className="text-3xl mb-6">📊 Admin Dashboard PRO</h1>

      {/* 📊 STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        <div className="p-4 border border-white/10 rounded-xl">
          <p className="text-zinc-400">💰 Total Sales</p>
          <p className="text-2xl font-bold">
            {stats.totalSales} EGP
          </p>
        </div>

        <div className="p-4 border border-white/10 rounded-xl">
          <p className="text-zinc-400">📦 Orders</p>
          <p className="text-2xl font-bold">
            {stats.totalOrders}
          </p>
        </div>

        <div className="p-4 border border-white/10 rounded-xl">
          <p className="text-zinc-400">📊 Avg Order</p>
          <p className="text-2xl font-bold">
            {Math.round(stats.avgOrder)} EGP
          </p>
        </div>

      </div>

      {/* 📈 CHART */}
      <div className="h-80 border border-white/10 rounded-xl p-4 mb-8">
        <h2 className="mb-4 text-lg">📈 Sales Analytics</h2>

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#ffffff"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 🤖 AI INSIGHT */}
      <div className="p-4 border border-white/10 rounded-xl mb-8">
        <p className="text-zinc-400">🤖 AI Insight</p>
        <p className="text-lg font-bold">
          🏆 Best Product: {best?.[0] || "No data"}
        </p>
      </div>

      {/* LOADING */}
      {loading && (
        <p className="text-zinc-400">Loading orders...</p>
      )}

      {/* EMPTY */}
      {!loading && orders.length === 0 && (
        <p className="text-zinc-400">No orders yet 🛒</p>
      )}

      {/* ORDERS */}
      <div className="space-y-4">

        {orders.map((order) => (
          <div
            key={order.id}
            className="border border-white/10 p-5 rounded-xl"
          >

            <div className="flex justify-between">

              <div>
                <p className="font-bold text-lg">{order.name}</p>
                <p className="text-zinc-400">📞 {order.phone}</p>
                <p className="text-zinc-400">🏠 {order.address}</p>

                <p className="text-sm mt-2">
                  Status:{" "}
                  <span className="text-yellow-400">
                    {order.status || "pending"}
                  </span>
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold text-xl">
                  {order.total} EGP
                </p>
              </div>

            </div>

            {/* ACTIONS */}
            <div className="flex flex-wrap gap-2 mt-4">

              <button
                onClick={() => updateStatus(order.id, "pending")}
                className="px-3 py-1 bg-yellow-500 text-black rounded"
              >
                Pending
              </button>

              <button
                onClick={() => updateStatus(order.id, "shipped")}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                Shipped
              </button>

              <button
                onClick={() => updateStatus(order.id, "delivered")}
                className="px-3 py-1 bg-green-500 text-white rounded"
              >
                Delivered
              </button>

              <button
                onClick={() => deleteOrder(order.id)}
                className="px-3 py-1 bg-red-500 text-white rounded"
              >
                Delete
              </button>

            </div>

          </div>
        ))}

      </div>

    </main>
  );
}
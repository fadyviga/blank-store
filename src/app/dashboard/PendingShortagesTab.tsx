"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Package,
  ShoppingBag,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SizeOrderRef {
  display_id: string;
  customer_name: string;
  ordered_quantity: number;
  missing_quantity: number;
  order_date: string;
  order_id: string;
}

interface SizeGroup {
  size: string;
  missing_total: number;
  orders: SizeOrderRef[];
}

interface ColorGroup {
  color: string;
  sizes: SizeGroup[];
}

interface ProductGroup {
  product_name: string;
  colors: ColorGroup[];
}

interface PendingShortageItem {
  order_id: string;
  display_id: string;
  customer_name: string;
  order_date: string;
  product_name: string;
  color: string;
  size: string;
  ordered_quantity: number;
  current_stock: number;
  missing_quantity: number;
  status_indicator: "out_of_stock" | "partial" | "full";
}

interface PendingShortagesData {
  summary: {
    total_pending_orders_with_shortages: number;
    total_missing_units: number;
    total_affected_products: number;
  };
  items: PendingShortageItem[];
  grouped: ProductGroup[];
}

export default function PendingShortagesTab() {
  const [data, setData] = useState<PendingShortagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/shortages/pending");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to load pending shortages:", err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const statusConfig: Record<
    string,
    { label: string; classes: string }
  > = {
    out_of_stock: { label: "Out of Stock", classes: "bg-red-500/15 text-red-400 border-red-500/30" },
    partial: { label: "Partially Available", classes: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
    full: { label: "Fully Available", classes: "bg-green-500/15 text-green-400 border-green-500/30" },
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<ShoppingBag size={24} />} label="Pending Orders With Shortages" value={0} />
          <StatCard icon={<AlertTriangle size={24} />} label="Total Missing Units" value={0} />
          <StatCard icon={<Package size={24} />} label="Affected Products" value={0} />
        </div>
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No pending order shortages found</p>
        </div>
      </div>
    );
  }

  const { summary, items, grouped } = data;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<ShoppingBag size={24} />}
          label="Pending Orders With Shortages"
          value={summary.total_pending_orders_with_shortages}
          highlight
        />
        <StatCard
          icon={<AlertTriangle size={24} />}
          label="Total Missing Units"
          value={summary.total_missing_units}
          highlight
        />
        <StatCard
          icon={<Package size={24} />}
          label="Affected Products"
          value={summary.total_affected_products}
          highlight
        />
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-bold">Shortage Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-4 text-zinc-500 font-medium">Order ID</th>
                <th className="text-left p-4 text-zinc-500 font-medium">Customer</th>
                <th className="text-left p-4 text-zinc-500 font-medium">Product</th>
                <th className="text-left p-4 text-zinc-500 font-medium">Color</th>
                <th className="text-left p-4 text-zinc-500 font-medium">Size</th>
                <th className="text-right p-4 text-zinc-500 font-medium">Ordered</th>
                <th className="text-right p-4 text-zinc-500 font-medium">Stock</th>
                <th className="text-right p-4 text-zinc-500 font-medium">Missing</th>
                <th className="text-left p-4 text-zinc-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const cfg = statusConfig[item.status_indicator];
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                    <td className="p-4 font-mono text-xs text-zinc-300">{item.display_id}</td>
                    <td className="p-4 text-zinc-300">{item.customer_name}</td>
                    <td className="p-4 font-medium">{item.product_name}</td>
                    <td className="p-4 text-zinc-300">{item.color}</td>
                    <td className="p-4 text-zinc-300">{item.size}</td>
                    <td className="p-4 text-right text-yellow-400 font-medium">{item.ordered_quantity}</td>
                    <td className="p-4 text-right text-zinc-400">{item.current_stock}</td>
                    <td className="p-4 text-right text-red-400 font-bold">{item.missing_quantity}</td>
                    <td className="p-4">
                      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.classes}`}>
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
        <h2 className="text-lg font-bold mb-5">Grouped By Product</h2>
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.product_name} className="border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() =>
                  setExpandedProduct(
                    expandedProduct === group.product_name ? null : group.product_name
                  )
                }
                className="w-full flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-900 transition"
              >
                <span className="font-semibold text-sm">{group.product_name}</span>
                {expandedProduct === group.product_name ? (
                  <ChevronUp size={16} className="text-zinc-500" />
                ) : (
                  <ChevronDown size={16} className="text-zinc-500" />
                )}
              </button>
              {expandedProduct === group.product_name && (
                <div className="p-4 space-y-4">
                  {group.colors.map((color) => (
                    <div key={color.color}>
                      <p className="text-sm font-medium text-zinc-200 mb-2">{color.color}</p>
                      <div className="space-y-3 pl-4">
                        {color.sizes.map((sz) => {
                          return (
                            <div
                              key={sz.size}
                              className="bg-zinc-900/30 border border-white/5 rounded-xl p-4"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-red-400">
                                  {sz.size} — Missing {sz.missing_total}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 mb-2">Orders:</p>
                              <div className="space-y-1.5">
                                {sz.orders.map((ref, ri) => (
                                  <div
                                    key={ri}
                                    className="flex items-center justify-between text-xs bg-zinc-900/50 rounded-lg px-3 py-2"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-zinc-300">{ref.display_id}</span>
                                      <span className="text-zinc-500">{ref.customer_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-yellow-400">Qty {ref.ordered_quantity}</span>
                                      <span className="text-zinc-600">
                                        {ref.order_date
                                          ? new Date(ref.order_date).toLocaleDateString("en-GB")
                                          : ""}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={highlight ? "text-red-400" : "text-zinc-400"}>{icon}</span>
        <span className="text-zinc-500 text-xs">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-red-400" : ""}`}>{value}</p>
    </div>
  );
}

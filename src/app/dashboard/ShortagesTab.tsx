"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  Package,
  ShoppingBag,
  Download,
  Loader2,
  Search,
  X,
} from "lucide-react";

interface ShortageItem {
  product_name: string;
  color: string;
  size: string;
  available_stock: number;
  required_quantity: number;
  shortage: number;
}

interface ShortageSummary {
  total_missing_units: number;
  products_with_shortages: number;
  affected_orders: number;
}

interface RestockColor {
  color: string;
  sizes: { size: string; shortage: number }[];
  total_needed: number;
}

interface RestockPlanning {
  product_name: string;
  colors: RestockColor[];
}

interface ShortagesData {
  shortages: ShortageItem[];
  summary: ShortageSummary;
  restock_planning: RestockPlanning[];
}

export default function ShortagesTab() {
  const [data, setData] = useState<ShortagesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [productFilter, setProductFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchShortages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (productFilter) params.set("product", productFilter);
      if (colorFilter) params.set("color", colorFilter);
      if (sizeFilter) params.set("size", sizeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/shortages?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load shortages:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchShortages();
  }, []);

  const products = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.shortages.map((s) => s.product_name))].sort();
  }, [data]);

  const colors = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.shortages.map((s) => s.color))].sort();
  }, [data]);

  const sizes = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.shortages.map((s) => s.size))].sort();
  }, [data]);

  const exportFile = async (format: "csv" | "xlsx") => {
    const params = new URLSearchParams({ format });
    if (productFilter) params.set("product", productFilter);
    if (colorFilter) params.set("color", colorFilter);
    if (sizeFilter) params.set("size", sizeFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    const res = await fetch(`/api/shortages?${params.toString()}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shortages.${format === "csv" ? "csv" : "xls"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!data || data.shortages.length === 0) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<Package size={24} />} label="Total Missing Units" value={0} />
          <StatCard icon={<AlertTriangle size={24} />} label="Products With Shortages" value={0} />
          <StatCard icon={<ShoppingBag size={24} />} label="Affected Orders" value={0} />
        </div>
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No shortages found</p>
        </div>
      </div>
    );
  }

  const { shortages, summary, restock_planning } = data;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<AlertTriangle size={24} />}
          label="Total Missing Units"
          value={summary.total_missing_units}
          highlight
        />
        <StatCard
          icon={<Package size={24} />}
          label="Products With Shortages"
          value={summary.products_with_shortages}
          highlight
        />
        <StatCard
          icon={<ShoppingBag size={24} />}
          label="Affected Orders"
          value={summary.affected_orders}
          highlight
        />
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Product"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm outline-none focus:border-white/30 transition"
            />
            {productFilter && (
              <button onClick={() => setProductFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="relative flex-1 min-w-[120px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Color"
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm outline-none focus:border-white/30 transition"
            />
            {colorFilter && (
              <button onClick={() => setColorFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="relative flex-1 min-w-[100px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Size"
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm outline-none focus:border-white/30 transition"
            />
            {sizeFilter && (
              <button onClick={() => setSizeFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-[130px]">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-white/30 transition"
            />
          </div>
          <div className="flex-1 min-w-[130px]">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-white/30 transition"
            />
          </div>
          <button
            onClick={fetchShortages}
            className="px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-200 transition"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => exportFile("csv")}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={() => exportFile("xlsx")}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
          >
            <Download size={14} /> Excel
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-bold">Shortage Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left p-4 text-zinc-500 font-medium">Product Name</th>
                <th className="text-left p-4 text-zinc-500 font-medium">Color</th>
                <th className="text-left p-4 text-zinc-500 font-medium">Size</th>
                <th className="text-right p-4 text-zinc-500 font-medium">Available Stock</th>
                <th className="text-right p-4 text-zinc-500 font-medium">Required Quantity</th>
                <th className="text-right p-4 text-zinc-500 font-medium">Shortage</th>
              </tr>
            </thead>
            <tbody>
              {shortages.map((s, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                  <td className="p-4 font-medium">{s.product_name}</td>
                  <td className="p-4 text-zinc-300">{s.color}</td>
                  <td className="p-4 text-zinc-300">{s.size}</td>
                  <td className="p-4 text-right text-zinc-400">{s.available_stock}</td>
                  <td className="p-4 text-right text-yellow-400 font-medium">{s.required_quantity}</td>
                  <td className="p-4 text-right text-red-400 font-bold">{s.shortage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
        <h2 className="text-lg font-bold mb-5">Restock Planning</h2>
        {restock_planning.map((plan) => (
          <div key={plan.product_name} className="mb-6 last:mb-0">
            <h3 className="font-semibold text-base mb-3 text-white">{plan.product_name}</h3>
            <div className="space-y-3 pl-4">
              {plan.colors.map((c) => (
                <div key={c.color} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-zinc-200">{c.color}</p>
                    <p className="text-xs text-zinc-500">
                      Total Needed: <span className="text-red-400 font-bold">{c.total_needed}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.sizes.map((s) => (
                      <span
                        key={s.size}
                        className="inline-flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg px-2.5 py-1"
                      >
                        {s.size} <span className="font-bold">Missing {s.shortage}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
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

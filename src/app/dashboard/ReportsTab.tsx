"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Wallet,
  BarChart3,
  ShoppingBag,
  ShoppingCart,
  Calendar,
  Truck,
  Loader2,
} from "lucide-react";
import { useToast } from "../components/Toast";

interface DataPoint {
  date: string;
  value: number;
}

interface ReportSummary {
  totalRevenue: number;
  totalExpenses: number;
  inventoryCost: number;
  grossProfit: number;
  netProfit: number;
  totalOrders: number;
  avgOrderValue: number;
  shippingCollected: number;
}

interface ReportData {
  summary: ReportSummary;
  revenueOverTime: DataPoint[];
  expensesOverTime: DataPoint[];
  ordersOverTime: DataPoint[];
  profitOverTime: DataPoint[];
}

type Period = "today" | "this_week" | "this_month" | "last_month" | "this_year" | "all" | "custom";

export default function ReportsTab() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<Period>("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom") {
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
      }
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch reports");
      }
      const json = await res.json();
      if (!json?.summary) {
        throw new Error(json.error || "Invalid reports response");
      }
      setData({
        summary: {
          totalRevenue: json.summary?.totalRevenue ?? 0,
          totalExpenses: json.summary?.totalExpenses ?? 0,
          inventoryCost: json.summary?.inventoryCost ?? 0,
          grossProfit: json.summary?.grossProfit ?? 0,
          netProfit: json.summary?.netProfit ?? 0,
          totalOrders: json.summary?.totalOrders ?? 0,
          avgOrderValue: json.summary?.avgOrderValue ?? 0,
          shippingCollected: json.summary?.shippingCollected ?? 0,
        },
        revenueOverTime: json.revenueOverTime ?? [],
        expensesOverTime: json.expensesOverTime ?? [],
        ordersOverTime: json.ordersOverTime ?? [],
        profitOverTime: json.profitOverTime ?? [],
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load reports", "error");
    }
    setLoading(false);
  }, [period, startDate, endDate, showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== "custom") {
      setStartDate("");
      setEndDate("");
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "this_year", label: "This Year" },
    { key: "all", label: "All Time" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePeriodChange(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              period === p.key
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/10"
            }`}
          >
            {p.key === "custom" && <Calendar size={14} className="inline mr-1.5" />}
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={startDate}
              max={endDate || today}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 transition"
            />
            <span className="text-zinc-500 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 transition"
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      )}

      {!loading && data?.summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<TrendingUp size={20} />}
              label="Total Revenue"
              value={data.summary.totalRevenue}
              color="text-green-400"
            />
            <MetricCard
              icon={<TrendingDown size={20} />}
              label="Total Expenses"
              value={data.summary.totalExpenses}
              color="text-red-400"
            />
            <MetricCard
              icon={<Package size={20} />}
              label="Inventory Cost"
              value={data.summary.inventoryCost}
              color="text-blue-400"
            />
            <MetricCard
              icon={<Wallet size={20} />}
              label="Gross Profit"
              value={data.summary.grossProfit}
              color="text-green-400"
            />
            <MetricCard
              icon={<BarChart3 size={20} />}
              label="Net Profit"
              value={data.summary.netProfit}
              color={data.summary.netProfit >= 0 ? "text-green-400" : "text-red-400"}
            />
            <MetricCard
              icon={<ShoppingBag size={20} />}
              label="Total Orders"
              value={data.summary.totalOrders}
              color="text-zinc-100"
              isCurrency={false}
            />
            <MetricCard
              icon={<ShoppingCart size={20} />}
              label="Avg Order Value"
              value={data.summary.avgOrderValue}
              color="text-zinc-100"
            />
            <MetricCard
              icon={<Truck size={20} />}
              label="Shipping Collected"
              value={data.summary.shippingCollected}
              color="text-cyan-400"
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BarChartCard
              title="Revenue Over Time"
              data={data.revenueOverTime}
              barColor="bg-green-500"
            />
            <BarChartCard
              title="Expenses Over Time"
              data={data.expensesOverTime}
              barColor="bg-red-500"
            />
            <BarChartCard
              title="Profit Over Time"
              data={data.profitOverTime}
              barColor="bg-purple-500"
            />
            <BarChartCard
              title="Orders Over Time"
              data={data.ordersOverTime}
              barColor="bg-blue-500"
            />
          </div>
        </>
      )}

      {!loading && !data && (
        <div className="text-center py-16">
          <BarChart3 size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No report data available</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  isCurrency = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  isCurrency?: boolean;
}) {
  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={color}>{icon}</span>
        <span className="text-zinc-500 text-xs">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>
        {value.toLocaleString()}{isCurrency ? " EGP" : ""}
      </p>
    </div>
  );
}

function BarChartCard({
  title,
  data,
  barColor,
}: {
  title: string;
  data: DataPoint[];
  barColor: string;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-bold mb-4">{title}</h3>
        <p className="text-zinc-500 text-xs text-center py-8">No data</p>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const absValues = values.map((v) => Math.abs(v));
  const maxAbsValue = Math.max(...absValues, 1);
  const minValue = Math.min(...values);

  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
      <h3 className="text-sm font-bold mb-4">{title}</h3>
      <div className="flex items-end gap-[3px] h-48">
        {data.map((point, i) => {
          const height = (Math.abs(point.value) / maxAbsValue) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition bg-zinc-800 text-white text-[10px] rounded-lg px-2 py-1 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                {point.value.toLocaleString()} EGP
              </div>
              <div
                className={`w-full rounded-t-sm transition-all duration-200 min-h-[2px] cursor-pointer ${
                  point.value >= 0 ? barColor : "bg-red-500"
                }`}
                style={{ height: `${height}%` }}
              />
              <span className="text-[9px] text-zinc-500 mt-1.5 truncate w-full text-center leading-tight">
                {formatDateLabel(point.date)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600 mt-3 pt-2 border-t border-white/5">
        <span>{minValue.toLocaleString()} EGP</span>
        <span>{Math.max(...values).toLocaleString()} EGP</span>
      </div>
    </div>
  );
}

function formatDateLabel(date: string): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return date;
  }
}

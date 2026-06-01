"use client";

import { useEffect, useState, useMemo } from "react";
import { Wallet, TrendingDown, TrendingUp, Loader2, BarChart3 } from "lucide-react";

interface ReportSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueOverTime: { date: string; value: number }[];
  expensesOverTime: { date: string; value: number }[];
  profitOverTime: { date: string; value: number }[];
}

export default function AnalyticsTab() {
  const [period, setPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportSummary | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === "custom" && startDate) params.set("startDate", startDate);
      if (period === "custom" && endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();

      if (data.summary) {
        setReport({
          totalRevenue: data.summary.totalRevenue || 0,
          totalExpenses: data.summary.totalExpenses || 0,
          netProfit: data.summary.netProfit || 0,
          revenueOverTime: data.revenueOverTime || [],
          expensesOverTime: data.expensesOverTime || [],
          profitOverTime: data.profitOverTime || [],
        });
      }
    } catch (err) {
      console.error("Failed to load report:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  const maxRevenue = useMemo(
    () => Math.max(...(report?.revenueOverTime.map((r) => r.value) || [0]), 1),
    [report]
  );
  const maxExpenses = useMemo(
    () => Math.max(...(report?.expensesOverTime.map((e) => e.value) || [0]), 1),
    [report]
  );

  const periods = [
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
      <h2 className="text-xl font-bold">Analytics</h2>

      {/* Period Filter */}
      <div className="flex flex-wrap gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              period === p.key
                ? "bg-white text-black border-white"
                : "bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 transition"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 transition"
            />
          </div>
          <button
            onClick={fetchReport}
            className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold hover:scale-[1.02] transition"
          >
            Apply
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-zinc-500" />
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp size={20} className="text-green-400" />
                <span className="text-zinc-500 text-xs">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{report.totalRevenue.toLocaleString()} EGP</p>
            </div>
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <TrendingDown size={20} className="text-red-400" />
                <span className="text-zinc-500 text-xs">Total Expenses</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{report.totalExpenses.toLocaleString()} EGP</p>
            </div>
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <Wallet size={20} className={report.netProfit >= 0 ? "text-green-400" : "text-red-400"} />
                <span className="text-zinc-500 text-xs">Net Profit</span>
              </div>
              <p className={`text-2xl font-bold ${report.netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                {report.netProfit.toLocaleString()} EGP
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Revenue Over Time */}
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4">Revenue Over Time</h3>
              {report.revenueOverTime.length === 0 ? (
                <p className="text-zinc-500 text-xs py-8 text-center">No data</p>
              ) : (
                <div className="space-y-2">
                  {report.revenueOverTime.slice(-14).map((r, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>{r.date}</span>
                        <span>{r.value.toLocaleString()} EGP</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(r.value / maxRevenue) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expenses Over Time */}
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4">Expenses Over Time</h3>
              {report.expensesOverTime.length === 0 ? (
                <p className="text-zinc-500 text-xs py-8 text-center">No data</p>
              ) : (
                <div className="space-y-2">
                  {report.expensesOverTime.slice(-14).map((e, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>{e.date}</span>
                        <span>{e.value.toLocaleString()} EGP</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${(e.value / maxExpenses) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Profit Over Time */}
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4">Profit Over Time</h3>
            {report.profitOverTime.length === 0 ? (
              <p className="text-zinc-500 text-xs py-8 text-center">No data</p>
            ) : (
              <div className="space-y-2">
                {report.profitOverTime.slice(-14).map((p, i) => {
                  const maxProfit = Math.max(...report.profitOverTime.map((x) => Math.abs(x.value)), 1);
                  const barPct = Math.abs(p.value) / maxProfit * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>{p.date}</span>
                        <span className={p.value >= 0 ? "text-green-400" : "text-red-400"}>
                          {p.value >= 0 ? "+" : ""}{p.value.toLocaleString()} EGP
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p.value >= 0 ? "bg-green-500" : "bg-red-500"}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-zinc-500 text-center py-16">No data available</p>
      )}
    </div>
  );
}

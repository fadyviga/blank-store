"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Wallet,
  Users,
  ShoppingBag,
  DollarSign,
  Receipt,
  HandCoins,
  TrendingDown,
  BarChart3,
  Loader2,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from "lucide-react";

type Tab = "overview" | "ledger" | "report";

interface TreasuryData {
  cashBalance: number;
  partnerCapital: number;
  totalNetRevenue: number;
  totalPurchases: number;
  totalExpenses: number;
  totalPartnerWithdrawals: number;
  netProfit: number;
  partnerAccounting: {
    partnerId: string;
    partnerName: string;
    currentCapital: number;
    ownershipPercentage: number;
    deposits: number;
    withdrawals: number;
    profitShare: number;
    totalValue: number;
  }[];
}

interface LedgerEntry {
  date: string;
  type: string;
  description: string;
  amount: number;
  runningBalance: number;
}

interface ReportData extends TreasuryData {
  period: string;
  dateRange: { start: string; end: string };
  periodWithdrawalsTotal: number;
}

export default function TreasuryTab({ userRole }: { userRole: "admin" | "viewer" }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 mb-2">
        {(["overview", "ledger", "report"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition capitalize ${
              activeTab === t ? "bg-white text-black" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            {t === "overview" ? "Treasury Overview" : t === "ledger" ? "Treasury Ledger" : "Treasury Report"}
          </button>
        ))}
      </div>
      {activeTab === "overview" && <TreasuryOverview userRole={userRole} />}
      {activeTab === "ledger" && <TreasuryLedger userRole={userRole} />}
      {activeTab === "report" && <TreasuryReport userRole={userRole} />}
    </div>
  );
}

function formatEGP(n: number) {
  return `${n.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

function formatPct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

function StatCard({
  icon,
  label,
  value,
  highlight,
  negative,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={highlight ? "text-green-400" : negative ? "text-red-400" : "text-zinc-400"}>{icon}</span>
        <span className="text-zinc-500 text-xs">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-green-400" : negative ? "text-red-400" : ""}`}>{value}</p>
    </div>
  );
}

function TreasuryOverview({ userRole }: { userRole: "admin" | "viewer" }) {
  const [data, setData] = useState<TreasuryData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/treasury")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load treasury data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  if (error) return <p className="text-red-400 text-sm py-8 text-center">{error}</p>;
  if (!data) return <p className="text-zinc-500 text-sm py-8 text-center">No treasury data</p>;

  return (
    <div className="space-y-8">
      {/* Primary Cash Balance Card */}
      <div className="bg-zinc-950 border border-green-500/30 rounded-3xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <Wallet size={28} className="text-green-400" />
          <p className="text-zinc-400 text-sm uppercase tracking-widest">Current Treasury Balance</p>
        </div>
        <p className="text-4xl md:text-5xl font-black text-green-400">{formatEGP(data.cashBalance)}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="Partner Capital" value={formatEGP(data.partnerCapital)} />
        <StatCard icon={<ShoppingBag size={20} />} label="Net Revenue" value={formatEGP(data.totalNetRevenue)} highlight />
        <StatCard icon={<DollarSign size={20} />} label="Purchases" value={formatEGP(data.totalPurchases)} negative />
        <StatCard icon={<Receipt size={20} />} label="Expenses" value={formatEGP(data.totalExpenses)} negative />
        <StatCard icon={<TrendingDown size={20} />} label="Withdrawals" value={formatEGP(data.totalPartnerWithdrawals)} negative />
        <StatCard icon={<BarChart3 size={20} />} label="Net Profit" value={formatEGP(data.netProfit)} highlight={data.netProfit >= 0} negative={data.netProfit < 0} />
      </div>

      {/* Partner Accounting */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <HandCoins size={18} className="text-zinc-400" />
          Partner Accounting
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="text-left py-3 font-medium">Partner</th>
                <th className="text-right py-3 font-medium">Capital</th>
                <th className="text-right py-3 font-medium">Ownership</th>
                <th className="text-right py-3 font-medium">Deposits</th>
                <th className="text-right py-3 font-medium">Withdrawals</th>
                <th className="text-right py-3 font-medium">Profit Share</th>
                <th className="text-right py-3 font-medium">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {data.partnerAccounting
                .filter((p) => p.currentCapital !== 0 || p.profitShare !== 0)
                .map((p) => (
                  <tr key={p.partnerId} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 font-medium">{p.partnerName}</td>
                    <td className="py-3 text-right font-mono">{formatEGP(p.currentCapital)}</td>
                    <td className="py-3 text-right text-zinc-400">{formatPct(p.ownershipPercentage)}</td>
                    <td className="py-3 text-right text-green-400">{formatEGP(p.deposits)}</td>
                    <td className="py-3 text-right text-red-400">{formatEGP(p.withdrawals)}</td>
                    <td className="py-3 text-right">{formatEGP(p.profitShare)}</td>
                    <td className="py-3 text-right font-bold">{formatEGP(p.totalValue)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TreasuryLedger({ userRole }: { userRole: "admin" | "viewer" }) {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    fetch("/api/treasury/ledger")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setLedger(d);
      })
      .catch(() => setError("Failed to load ledger"))
      .finally(() => setLoading(false));
  }, []);

  const displayLedger = expanded ? ledger : ledger.slice(0, pageSize);

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      "Partner Deposit": "bg-green-500/10 text-green-400 border-green-500/30",
      "Partner Withdrawal": "bg-red-500/10 text-red-400 border-red-500/30",
      "Order Revenue": "bg-blue-500/10 text-blue-400 border-blue-500/30",
      Purchase: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
      Expense: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    };
    return colors[type] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/30";
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  if (error) return <p className="text-red-400 text-sm py-8 text-center">{error}</p>;
  if (ledger.length === 0) return <p className="text-zinc-500 text-sm py-8 text-center">No transactions yet</p>;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="text-left py-3 font-medium">Date</th>
              <th className="text-left py-3 font-medium">Type</th>
              <th className="text-left py-3 font-medium">Amount</th>
              <th className="text-right py-3 font-medium">Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {displayLedger.map((entry, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="py-2.5 text-zinc-400 text-xs font-mono">
                  {new Date(entry.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-2.5">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeBadge(entry.type)}`}>
                    {entry.type}
                  </span>
                  {entry.description && (
                    <span className="text-zinc-500 text-xs ml-2">{entry.description}</span>
                  )}
                </td>
                <td className={`py-2.5 font-mono text-xs ${entry.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {entry.amount >= 0 ? "+" : ""}{formatEGP(entry.amount)}
                </td>
                <td className="py-2.5 text-right font-mono text-xs font-bold">
                  {formatEGP(entry.runningBalance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ledger.length > pageSize && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mx-auto mt-4 text-xs text-zinc-400 hover:text-white transition"
        >
          {expanded ? (
            <>Show Less <ChevronUp size={14} /></>
          ) : (
            <>Show All ({ledger.length} entries) <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
}

function TreasuryReport({ userRole }: { userRole: "admin" | "viewer" }) {
  const [period, setPeriod] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = async (p: string) => {
    setLoading(true);
    setError("");
    try {
      let url = `/api/treasury/report?period=${p}`;
      if (p === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      const res = await fetch(url);
      const d = await res.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch {
      setError("Failed to load report");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport(period);
  }, [period]);

  const periodLabels: Record<string, string> = {
    this_month: "This Month",
    last_month: "Last Month",
    this_year: "This Year",
    custom: "Custom Range",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <CalendarDays size={16} className="text-zinc-400" />
        {(["this_month", "last_month", "this_year", "custom"] as const).map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); if (p !== "custom") fetchReport(p); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              period === p ? "bg-white text-black border-white" : "bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none"
            />
            <span className="text-zinc-500 text-xs">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none"
            />
            <button
              onClick={() => fetchReport("custom")}
              className="bg-white text-black px-3 py-1.5 rounded-xl text-xs font-bold"
            >
              Go
            </button>
          </div>
        )}
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>}
      {error && <p className="text-red-400 text-sm py-8 text-center">{error}</p>}
      {!loading && !error && data && (
        <div className="space-y-6">
          {data.dateRange && (
            <p className="text-xs text-zinc-500">
              Period: {data.dateRange.start} — {data.dateRange.end}
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard icon={<Wallet size={20} />} label="Cash Balance" value={formatEGP(data.cashBalance)} highlight />
            <StatCard icon={<Users size={20} />} label="Partner Capital" value={formatEGP(data.partnerCapital)} />
            <StatCard icon={<ShoppingBag size={20} />} label="Revenue" value={formatEGP(data.totalNetRevenue)} highlight />
            <StatCard icon={<DollarSign size={20} />} label="Purchases" value={formatEGP(data.totalPurchases)} negative />
            <StatCard icon={<Receipt size={20} />} label="Expenses" value={formatEGP(data.totalExpenses)} negative />
            <StatCard icon={<TrendingDown size={20} />} label="Withdrawals (All)" value={formatEGP(data.totalPartnerWithdrawals)} negative />
            <StatCard icon={<BarChart3 size={20} />} label="Net Profit" value={formatEGP(data.netProfit)} highlight={data.netProfit >= 0} negative={data.netProfit < 0} />
          </div>

          <h3 className="text-lg font-bold flex items-center gap-2 mt-6">
            <HandCoins size={18} className="text-zinc-400" />
            Partner Accounting
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 font-medium">Partner</th>
                  <th className="text-right py-3 font-medium">Capital</th>
                  <th className="text-right py-3 font-medium">Ownership</th>
                  <th className="text-right py-3 font-medium">Profit Share</th>
                  <th className="text-right py-3 font-medium">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {data.partnerAccounting
                  .filter((p) => p.currentCapital !== 0 || p.profitShare !== 0)
                  .map((p) => (
                    <tr key={p.partnerId} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 font-medium">{p.partnerName}</td>
                      <td className="py-3 text-right font-mono">{formatEGP(p.currentCapital)}</td>
                      <td className="py-3 text-right text-zinc-400">{formatPct(p.ownershipPercentage)}</td>
                      <td className="py-3 text-right">{formatEGP(p.profitShare)}</td>
                      <td className="py-3 text-right font-bold">{formatEGP(p.totalValue)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

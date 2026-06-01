"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Wallet,
  BarChart3,
  Calendar,
  Plus,
  X,
  Loader2,
  History,
  TrendingUp,
  HandCoins,
} from "lucide-react";
import { useToast } from "../components/Toast";

interface Partner {
  id: string;
  name: string;
  currentCapital: number;
  ownershipPercentage: number;
  totalProfitEarned: number;
  lastUpdated: string;
  created_at: string;
}

interface CapitalSnapshot {
  id: string;
  partner_id: string;
  capital: number;
  ownership_percentage: number;
  effective_from: string;
  effective_to: string | null;
  is_current: boolean;
  created_at: string;
}

interface Contribution {
  id: string;
  partner_id: string;
  amount: number;
  note: string | null;
  contribution_date: string;
  created_at: string;
}

interface ProfitDistribution {
  id: string;
  partner_id: string;
  period_start: string;
  period_end: string;
  net_profit: number;
  ownership_percentage: number;
  profit_share: number;
  distributed_at: string;
  partners?: { name: string };
}

type Period = "this_month" | "last_month" | "this_year" | "custom";

export default function PartnersTab() {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"partners" | "capital-history" | "profit-distribution">("partners");

  const subTabs = [
    { key: "partners" as const, label: "Partners", icon: <Users size={16} /> },
    { key: "capital-history" as const, label: "Capital History", icon: <History size={16} /> },
    { key: "profit-distribution" as const, label: "Profit Distribution", icon: <HandCoins size={16} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {subTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSubTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
              activeSubTab === t.key
                ? "bg-white text-black"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {activeSubTab === "partners" && <PartnersListView showToast={showToast} />}
      {activeSubTab === "capital-history" && <CapitalHistoryView showToast={showToast} />}
      {activeSubTab === "profit-distribution" && <ProfitDistributionView showToast={showToast} />}
    </div>
  );
}

function PartnersListView({ showToast }: { showToast: (msg: string, type: "success" | "error") => void }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCapitalModal, setAddCapitalModal] = useState<{ partnerId: string; partnerName: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [contributionDate, setContributionDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partners");
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      showToast("Failed to load partners", "error");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleAddCapital = async () => {
    if (!addCapitalModal) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }
    if (!contributionDate) {
      showToast("Contribution date is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/partners/${addCapitalModal.partnerId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, note: note || null, contribution_date: contributionDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add capital");
      }
      showToast("Capital added successfully", "success");
      setAddCapitalModal(null);
      setAmount("");
      setNote("");
      fetchPartners();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add capital", "error");
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users size={24} />} label="Total Partners" value={partners.length} />
        <StatCard
          icon={<Wallet size={24} />}
          label="Total Capital"
          value={`${partners.reduce((s, p) => s + p.currentCapital, 0).toLocaleString()} EGP`}
        />
        <StatCard
          icon={<TrendingUp size={24} />}
          label="Total Profit Distributed"
          value={`${partners.reduce((s, p) => s + p.totalProfitEarned, 0).toLocaleString()} EGP`}
        />
        <StatCard
          icon={<BarChart3 size={24} />}
          label="Avg Ownership"
          value={partners.length ? `${(100 / partners.length).toFixed(1)}%` : "0%"}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-zinc-500 font-medium">Partner</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Current Capital</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Ownership %</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Total Profit Earned</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Last Updated</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-zinc-500">No partners yet</td>
              </tr>
            ) : (
              partners.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="py-3 text-right">{p.currentCapital.toLocaleString()} EGP</td>
                  <td className="py-3 text-right">{(p.ownershipPercentage * 100).toFixed(2)}%</td>
                  <td className="py-3 text-right text-green-400">{p.totalProfitEarned.toLocaleString()} EGP</td>
                  <td className="py-3 text-right text-zinc-400 text-xs">
                    {p.lastUpdated ? new Date(p.lastUpdated).toLocaleDateString("en-GB") : "-"}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setAddCapitalModal({ partnerId: p.id, partnerName: p.name })}
                      className="flex items-center gap-1.5 ml-auto text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition"
                    >
                      <Plus size={14} /> Add Capital
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {addCapitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Add Capital — {addCapitalModal.partnerName}</h3>
              <button onClick={() => setAddCapitalModal(null)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Amount (EGP)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                  placeholder="e.g. 10000"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Date</label>
                <input
                  type="date"
                  value={contributionDate}
                  onChange={(e) => setContributionDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                  placeholder="e.g. Initial investment"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddCapital}
                  disabled={submitting}
                  className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Add Capital
                </button>
                <button
                  onClick={() => setAddCapitalModal(null)}
                  className="flex-1 border border-white/10 py-3 rounded-xl text-sm hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CapitalHistoryView({ showToast }: { showToast: (msg: string, type: "success" | "error") => void }) {
  const [snapshots, setSnapshots] = useState<CapitalSnapshot[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pRes] = await Promise.all([fetch("/api/partners")]);
        const pData = await pRes.json();
        const partnersList = Array.isArray(pData) ? pData : (pData.data || []);
        setPartners(partnersList);

        // Fetch snapshots for all partners
        const allSnapshots: CapitalSnapshot[] = [];
        for (const p of partnersList) {
          const res = await fetch(`/api/partners/${p.id}/capital-snapshots`);
          const data = await res.json();
          if (Array.isArray(data)) {
            allSnapshots.push(...data.map((s: CapitalSnapshot) => ({ ...s, partner_id: p.id })));
          }
        }
        setSnapshots(allSnapshots.sort((a, b) => b.effective_from.localeCompare(a.effective_from)));
      } catch (err) {
        showToast("Failed to load capital history", "error");
      }
      setLoading(false);
    };
    fetchData();
  }, [showToast]);

  const filtered = selectedPartner === "all"
    ? snapshots
    : snapshots.filter((s) => s.partner_id === selectedPartner);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <label className="text-xs text-zinc-400">Filter by partner:</label>
        <select
          value={selectedPartner}
          onChange={(e) => setSelectedPartner(e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-white/30"
        >
          <option value="all">All Partners</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-zinc-500 font-medium">Partner</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Date Range</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Capital</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Ownership %</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-zinc-500">No capital snapshots yet</td>
              </tr>
            ) : (
              filtered.map((s) => {
                const partner = partners.find((p) => p.id === s.partner_id);
                return (
                  <tr key={s.id} className="border-b border-white/5">
                    <td className="py-3 font-medium">{partner?.name || "Unknown"}</td>
                    <td className="py-3 text-zinc-300">
                      {new Date(s.effective_from).toLocaleDateString("en-GB")}
                      {s.effective_to ? ` → ${new Date(s.effective_to).toLocaleDateString("en-GB")}` : " → Present"}
                    </td>
                    <td className="py-3 text-right">{s.capital.toLocaleString()} EGP</td>
                    <td className="py-3 text-right">{(s.ownership_percentage * 100).toFixed(2)}%</td>
                    <td className="py-3 text-right">
                      {s.is_current ? (
                        <span className="text-green-400 text-xs font-medium">Current</span>
                      ) : (
                        <span className="text-zinc-500 text-xs">Historical</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfitDistributionView({ showToast }: { showToast: (msg: string, type: "success" | "error") => void }) {
  const [distributions, setDistributions] = useState<ProfitDistribution[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);

  const [period, setPeriod] = useState<Period>("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getDateRange = (p: Period): { start: string; end: string } => {
    const now = new Date();
    switch (p) {
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
      }
      case "last_month": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
      }
      case "this_year": {
        const start = new Date(now.getFullYear(), 0, 1);
        return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
      }
      default:
        return { start: "", end: "" };
    }
  };

  const fetchDistributions = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes] = await Promise.all([fetch("/api/partners")]);
      const pData = await pRes.json();
      const partnersList = Array.isArray(pData) ? pData : (pData.data || []);
      setPartners(partnersList);

      const { start, end } = period === "custom"
        ? { start: startDate, end: endDate }
        : getDateRange(period);

      const allDistributions: ProfitDistribution[] = [];
      for (const p of partnersList) {
        const params = new URLSearchParams();
        if (start) params.set("periodStart", start);
        if (end) params.set("periodEnd", end);
        const res = await fetch(`/api/partners/${p.id}/profit-distributions?${params.toString()}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          allDistributions.push(...data);
        }
      }
      setDistributions(allDistributions.sort((a, b) => b.distributed_at.localeCompare(a.distributed_at)));
    } catch (err) {
      showToast("Failed to load profit distributions", "error");
    }
    setLoading(false);
  }, [period, startDate, endDate, showToast]);

  useEffect(() => {
    fetchDistributions();
  }, [fetchDistributions]);

  const handleDistributeProfit = async () => {
    const { start, end } = period === "custom"
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    if (!start || !end) {
      showToast("Please select a valid date range", "error");
      return;
    }

    // Fetch net profit from reports API
    setDistributing(true);
    try {
      const reportRes = await fetch(`/api/reports?periodStart=${start}&periodEnd=${end}`);
      if (!reportRes.ok) throw new Error("Failed to fetch reports");
      const reportData = await reportRes.json();
      const netProfit = reportData?.summary?.netProfit ?? 0;

      if (netProfit <= 0) {
        showToast("Net profit is zero or negative for this period", "error");
        setDistributing(false);
        return;
      }

      const res = await fetch("/api/partners/distribute-profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart: start, periodEnd: end, netProfit }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to distribute profit");
      }

      showToast("Profit distributed successfully", "success");
      fetchDistributions();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to distribute profit", "error");
    }
    setDistributing(false);
  };

  const today = new Date().toISOString().slice(0, 10);

  const periods: { key: Period; label: string }[] = [
    { key: "this_month", label: "This Month" },
    { key: "last_month", label: "Last Month" },
    { key: "this_year", label: "This Year" },
    { key: "custom", label: "Custom" },
  ];

  // Group distributions by period
  const grouped = distributions.reduce<Record<string, { period: string; items: ProfitDistribution[] }>>((acc, d) => {
    const key = `${d.period_start}_${d.period_end}`;
    if (!acc[key]) {
      acc[key] = { period: `${new Date(d.period_start).toLocaleDateString("en-GB")} — ${new Date(d.period_end).toLocaleDateString("en-GB")}`, items: [] };
    }
    acc[key].items.push(d);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => { setPeriod(p.key); if (p.key !== "custom") { setStartDate(""); setEndDate(""); } }}
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
        <button
          onClick={handleDistributeProfit}
          disabled={distributing}
          className="ml-auto flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:scale-[1.02] transition disabled:opacity-50"
        >
          {distributing ? <Loader2 size={16} className="animate-spin" /> : <HandCoins size={16} />}
          Distribute Profit
        </button>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No profit distributions yet</p>
          <p className="text-zinc-600 text-sm mt-2">Select a period and click "Distribute Profit"</p>
        </div>
      ) : (
        Object.entries(grouped).map(([key, group]) => {
          const totalProfit = group.items.reduce((s, d) => s + d.net_profit, 0);
          const totalDistributed = group.items.reduce((s, d) => s + d.profit_share, 0);
          return (
            <div key={key} className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">{group.period}</h3>
                <div className="text-right">
                  <p className="text-xs text-zinc-400">Net Profit: <span className="text-green-400 font-bold">{totalProfit.toLocaleString()} EGP</span></p>
                  <p className="text-xs text-zinc-400">Distributed: <span className="text-white font-bold">{totalDistributed.toLocaleString()} EGP</span></p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-zinc-500 font-medium">Partner</th>
                      <th className="text-right py-2 text-zinc-500 font-medium">Ownership %</th>
                      <th className="text-right py-2 text-zinc-500 font-medium">Profit Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((d) => {
                      const partner = partners.find((p) => p.id === d.partner_id);
                      return (
                        <tr key={d.id} className="border-b border-white/5">
                          <td className="py-2 font-medium">{partner?.name || "Unknown"}</td>
                          <td className="py-2 text-right">{(d.ownership_percentage * 100).toFixed(2)}%</td>
                          <td className="py-2 text-right text-green-400 font-bold">{d.profit_share.toLocaleString()} EGP</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-zinc-600 mt-3">
                Distributed: {group.items[0]?.distributed_at ? new Date(group.items[0].distributed_at).toLocaleString("en-GB") : "-"}
              </p>
            </div>
          );
        })
      )}
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

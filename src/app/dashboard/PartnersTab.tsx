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
  Edit3,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  Camera,
} from "lucide-react";
import { useToast } from "../components/Toast";

interface Partner {
  id: string;
  name: string;
  currentCapital: number;
  ownershipPercentage: number;
  hasTransactions: boolean;
  created_at: string;
}

interface Transaction {
  id: string;
  partner_id: string;
  type: "deposit" | "withdraw";
  amount: number;
  created_at: string;
}

interface SnapshotItem {
  id: string;
  snapshot_id: string;
  partner_id: string;
  capital: number;
  percentage: number;
  partners: { name: string } | null;
}

interface Snapshot {
  id: string;
  total_capital: number;
  created_at: string;
  partner_snapshot_items: SnapshotItem[];
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
      <div className="flex flex-wrap gap-1">
        {subTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveSubTab(t.key)}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition whitespace-nowrap ${
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

  const [txModal, setTxModal] = useState<{ partnerId: string; partnerName: string } | null>(null);
  const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");
  const [txAmount, setTxAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [initialCapital, setInitialCapital] = useState("");
  const [addingPartner, setAddingPartner] = useState(false);

  const [editPartner, setEditPartner] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partners");
      const data = await res.json();
      setPartners(Array.isArray(data) ? data : (data.data || []));
    } catch {
      showToast("Failed to load partners", "error");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleTransaction = async () => {
    if (!txModal) return;
    const amt = Number(txAmount);
    if (!amt || amt <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/partners/${txModal.partnerId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, type: txType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create transaction");
      }
      showToast(`${txType === "deposit" ? "Deposit" : "Withdraw"} successful`, "success");
      setTxModal(null);
      setTxAmount("");
      setTxType("deposit");
      fetchPartners();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create transaction", "error");
    }
    setSubmitting(false);
  };

  const handleAddPartner = async () => {
    if (!newPartnerName.trim()) {
      showToast("Partner name is required", "error");
      return;
    }
    const cap = Number(initialCapital);
    if (initialCapital && (cap < 0 || isNaN(cap))) {
      showToast("Capital cannot be negative", "error");
      return;
    }
    setAddingPartner(true);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPartnerName.trim(),
          initialCapital: cap > 0 ? cap : 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add partner");
      }
      showToast("Partner added successfully", "success");
      setShowAddPartner(false);
      setNewPartnerName("");
      setInitialCapital("");
      fetchPartners();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add partner", "error");
    }
    setAddingPartner(false);
  };

  const handleEditPartner = async () => {
    if (!editPartner || !editName.trim()) {
      showToast("Partner name is required", "error");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/partners/${editPartner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update partner");
      }
      showToast("Partner updated successfully", "success");
      setEditPartner(null);
      fetchPartners();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update partner", "error");
    }
    setSavingEdit(false);
  };

  const handleDeletePartner = async (partner: Partner) => {
    if (partner.hasTransactions) {
      showToast("Cannot delete partner with transaction history", "error");
      return;
    }
    if (!confirm(`Delete partner "${partner.name}"?`)) return;
    try {
      const res = await fetch(`/api/partners/${partner.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete partner");
      }
      showToast("Partner deleted", "success");
      fetchPartners();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete partner", "error");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
          <StatCard icon={<Users size={24} />} label="Total Partners" value={partners.length} />
          <StatCard
            icon={<Wallet size={24} />}
            label="Total Capital"
            value={`${partners.reduce((s, p) => s + p.currentCapital, 0).toLocaleString()} EGP`}
          />
          <StatCard
            icon={<TrendingUp size={24} />}
            label="Avg Ownership"
            value={partners.length ? `${(100 / partners.length).toFixed(1)}%` : "0%"}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Partners</h3>
        <button
          onClick={() => setShowAddPartner(true)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:scale-[1.02] transition"
        >
          <Plus size={16} /> Add Partner
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-zinc-500 font-medium">Partner</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Current Capital</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Ownership %</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-zinc-500">No partners yet. Click "Add Partner" to create one.</td>
              </tr>
            ) : (
              partners.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="py-3 text-right">{p.currentCapital.toLocaleString()} EGP</td>
                  <td className="py-3 text-right">{(p.ownershipPercentage * 100).toFixed(2)}%</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => { setTxModal({ partnerId: p.id, partnerName: p.name }); setTxType("deposit"); setTxAmount(""); }}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition"
                        title="Deposit"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => { setTxModal({ partnerId: p.id, partnerName: p.name }); setTxType("withdraw"); setTxAmount(""); }}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition"
                        title="Withdraw"
                      >
                        <Wallet size={14} />
                      </button>
                      <button
                        onClick={() => { setEditPartner({ id: p.id, name: p.name }); setEditName(p.name); }}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePartner(p)}
                        className="text-xs bg-zinc-800 hover:bg-red-900/50 text-zinc-300 hover:text-red-400 p-1.5 rounded-lg transition"
                        title={p.hasTransactions ? "Cannot delete partner with transaction history" : "Delete"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {txModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">{txType === "deposit" ? "Deposit" : "Withdraw"} — {txModal.partnerName}</h3>
              <button onClick={() => setTxModal(null)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTxType("deposit")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                      txType === "deposit"
                        ? "bg-green-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setTxType("withdraw")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
                      txType === "withdraw"
                        ? "bg-red-600 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    Withdraw
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Amount (EGP)</label>
                <input
                  type="number"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                  placeholder="e.g. 10000"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleTransaction}
                  disabled={submitting}
                  className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {txType === "deposit" ? "Deposit" : "Withdraw"}
                </button>
                <button
                  onClick={() => setTxModal(null)}
                  className="flex-1 border border-white/10 py-3 rounded-xl text-sm hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Add Partner</h3>
              <button onClick={() => { setShowAddPartner(false); setNewPartnerName(""); setInitialCapital(""); }} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Partner Name *</label>
                <input
                  type="text"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Initial Capital (optional)</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                  placeholder="e.g. 50000"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddPartner}
                  disabled={addingPartner}
                  className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {addingPartner ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save
                </button>
                <button
                  onClick={() => { setShowAddPartner(false); setNewPartnerName(""); setInitialCapital(""); }}
                  className="flex-1 border border-white/10 py-3 rounded-xl text-sm hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Edit Partner</h3>
              <button onClick={() => setEditPartner(null)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Partner Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditPartner}
                  disabled={savingEdit}
                  className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save
                </button>
                <button
                  onClick={() => setEditPartner(null)}
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
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partners/snapshots");
      const data = await res.json();
      setSnapshots(Array.isArray(data) ? data : (data.data || []));
    } catch {
      showToast("Failed to load snapshots", "error");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const handleGenerateSnapshot = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/partners/snapshots", { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate snapshot");
      }
      showToast("Snapshot generated successfully", "success");
      fetchSnapshots();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to generate snapshot", "error");
    }
    setGenerating(false);
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg">Capital Snapshots</h3>
        <button
          onClick={handleGenerateSnapshot}
          disabled={generating}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:scale-[1.02] transition disabled:opacity-50"
        >
          {generating ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          Generate Snapshot
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No snapshots yet</p>
          <p className="text-zinc-600 text-sm mt-2">
            Snapshots are created automatically when transactions occur
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((s) => {
            const isExpanded = expanded.has(s.id);
            const items = s.partner_snapshot_items || [];
            return (
              <div key={s.id} className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleExpand(s.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
                    <div>
                      <span className="text-sm font-medium">{new Date(s.created_at).toLocaleString("en-GB")}</span>
                      <span className="text-xs text-zinc-500 ml-3">
                        {items.length} partner{items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold">{Number(s.total_capital).toLocaleString()} EGP</span>
                </button>
                {isExpanded && (
                  <div className="border-t border-white/5 px-4 pb-4">
                    <table className="w-full text-sm mt-3">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left py-2 text-zinc-500 font-medium text-xs">Partner</th>
                          <th className="text-right py-2 text-zinc-500 font-medium text-xs">Capital</th>
                          <th className="text-right py-2 text-zinc-500 font-medium text-xs">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className="border-b border-white/5">
                            <td className="py-2 text-sm font-medium">{item.partners?.name || "Unknown"}</td>
                            <td className="py-2 text-right">{Number(item.capital).toLocaleString()} EGP</td>
                            <td className="py-2 text-right">{(Number(item.percentage) * 100).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfitDistributionView({ showToast }: { showToast: (msg: string, type: "success" | "error") => void }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);

  const [period, setPeriod] = useState<Period>("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [result, setResult] = useState<{
    periodStart: string;
    periodEnd: string;
    netProfit: number;
    totalCapital: number;
    distributions: { partner_id: string; partner_name: string; capital: number; ownershipPercentage: number; profitShare: number }[];
  } | null>(null);

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

  useEffect(() => {
    const fetchPartners = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/partners");
        const data = await res.json();
        setPartners(Array.isArray(data) ? data : (data.data || []));
      } catch {
        showToast("Failed to load partners", "error");
      }
      setLoading(false);
    };
    fetchPartners();
  }, [showToast]);

  const handleDistributeProfit = async () => {
    const { start, end } = period === "custom"
      ? { start: startDate, end: endDate }
      : getDateRange(period);

    if (!start || !end) {
      showToast("Please select a valid date range", "error");
      return;
    }

    setDistributing(true);
    setResult(null);
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

      const data = await res.json();
      setResult(data);
      showToast("Profit calculated successfully", "success");
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

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => { setPeriod(p.key); if (p.key !== "custom") { setStartDate(""); setEndDate(""); } setResult(null); }}
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
          Calculate Distribution
        </button>
      </div>

      {!result ? (
        <div className="text-center py-16">
          <BarChart3 size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No profit distribution calculated yet</p>
          <p className="text-zinc-600 text-sm mt-2">Select a period and click "Calculate Distribution"</p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm">
              {new Date(result.periodStart).toLocaleDateString("en-GB")} — {new Date(result.periodEnd).toLocaleDateString("en-GB")}
            </h3>
            <div className="text-right">
              <p className="text-xs text-zinc-400">Total Capital: <span className="text-white font-bold">{result.totalCapital.toLocaleString()} EGP</span></p>
              <p className="text-xs text-zinc-400">Net Profit: <span className="text-green-400 font-bold">{result.netProfit.toLocaleString()} EGP</span></p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-zinc-500 font-medium">Partner</th>
                  <th className="text-right py-2 text-zinc-500 font-medium">Capital</th>
                  <th className="text-right py-2 text-zinc-500 font-medium">Ownership %</th>
                  <th className="text-right py-2 text-zinc-500 font-medium">Profit Share</th>
                </tr>
              </thead>
              <tbody>
                {result.distributions.map((d) => {
                  const partner = partners.find((p) => p.id === d.partner_id);
                  return (
                    <tr key={d.partner_id} className="border-b border-white/5">
                      <td className="py-2 font-medium">{partner?.name || d.partner_name}</td>
                      <td className="py-2 text-right">{d.capital.toLocaleString()} EGP</td>
                      <td className="py-2 text-right">{(d.ownershipPercentage * 100).toFixed(2)}%</td>
                      <td className="py-2 text-right text-green-400 font-bold">{d.profitShare.toLocaleString()} EGP</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-zinc-400">{icon}</span>
        <span className="text-zinc-500 text-xs">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

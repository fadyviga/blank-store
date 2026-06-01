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
  List,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useToast } from "../components/Toast";
import { parseError } from "../../lib/parse-error";

interface Partner {
  id: string;
  name: string;
  currentCapital: number;
  ownershipPercentage: number;
  hasTransactions: boolean;
  totalDeposits: number;
  totalWithdrawals: number;
  profitEarned: number;
  created_at: string;
}

interface Transaction {
  id: string;
  partner_id: string;
  type: "deposit" | "withdraw";
  amount: number;
  date: string;
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
  snapshot_date: string;
  created_at: string;
  partner_snapshot_items: SnapshotItem[];
}

interface PartnerLedger {
  partnerId: string;
  partnerName: string;
  totalDeposits: number;
  totalWithdrawals: number;
  currentCapital: number;
  ownershipPercentage: number;
  profitEarned: number;
}

interface ProfitDistribution {
  partner_id: string;
  partner_name: string;
  capital: number;
  ownershipPercentage: number;
  profitShare: number;
}

interface ProfitResult {
  periodStart: string;
  periodEnd: string;
  netProfit: number;
  totalCapital: number;
  segments: {
    startDate: string;
    endDate: string;
    weight: number;
    ownerships: { partner_id: string; capital: number; percentage: number }[];
  }[];
  distributions: ProfitDistribution[];
}

type Period = "this_month" | "last_month" | "this_year" | "custom";

type TabKey = "overview" | "transactions" | "ownership-history" | "profit-distribution";

export default function PartnersTab() {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<TabKey>("overview");

  const subTabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Users size={16} /> },
    { key: "transactions", label: "Transactions", icon: <List size={16} /> },
    { key: "ownership-history", label: "Ownership History", icon: <Clock size={16} /> },
    { key: "profit-distribution", label: "Profit Distribution", icon: <HandCoins size={16} /> },
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

      {activeSubTab === "overview" && <OverviewView showToast={showToast} />}
      {activeSubTab === "transactions" && <TransactionsView showToast={showToast} />}
      {activeSubTab === "ownership-history" && <OwnershipHistoryView showToast={showToast} />}
      {activeSubTab === "profit-distribution" && <ProfitDistributionView showToast={showToast} />}
    </div>
  );
}

function OverviewView({ showToast }: { showToast: (msg: string, type: "success" | "error") => void }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [ledger, setLedger] = useState<PartnerLedger[]>([]);
  const [loading, setLoading] = useState(true);

  const [txModal, setTxModal] = useState<{ partnerId: string; partnerName: string } | null>(null);
  const [txType, setTxType] = useState<"deposit" | "withdraw">("deposit");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [initialCapital, setInitialCapital] = useState("");
  const [initialDate, setInitialDate] = useState("");
  const [addingPartner, setAddingPartner] = useState(false);

  const [editPartner, setEditPartner] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [resetModal, setResetModal] = useState(false);
  const [resetDate, setResetDate] = useState("");
  const [resetNotes, setResetNotes] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, lRes] = await Promise.all([
        fetch("/api/partners"),
        fetch("/api/partners?ledger=true"),
      ]);
      const pData = await pRes.json();
      const lData = await lRes.json();
      setPartners(Array.isArray(pData) ? pData : (pData.data || []));
      setLedger(Array.isArray(lData) ? lData : (lData.data || []));
    } catch {
      showToast("Failed to load partners", "error");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTransaction = async () => {
    if (!txModal) return;
    const amt = Number(txAmount);
    if (!amt || amt <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { amount: amt, type: txType };
      if (txDate) body.date = txDate;

      const res = await fetch(`/api/partners/${txModal.partnerId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(parseError(err.error, "Failed to create transaction"));
      }
      showToast(`${txType === "deposit" ? "Deposit" : "Withdraw"} successful`, "success");
      setTxModal(null);
      setTxAmount("");
      setTxDate("");
      setTxType("deposit");
      fetchData();
    } catch (err) {
      showToast(parseError(err, "Failed to create transaction"), "error");
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
      const body: Record<string, unknown> = {
        name: newPartnerName.trim(),
        initialCapital: cap > 0 ? cap : 0,
      };
      if (initialDate) body.date = initialDate;

      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(parseError(err.error, "Failed to add partner"));
      }
      showToast("Partner added successfully", "success");
      setShowAddPartner(false);
      setNewPartnerName("");
      setInitialCapital("");
      setInitialDate("");
      fetchData();
    } catch (err) {
      showToast(parseError(err, "Failed to add partner"), "error");
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
        throw new Error(parseError(err.error, "Failed to update partner"));
      }
      showToast("Partner updated successfully", "success");
      setEditPartner(null);
      fetchData();
    } catch (err) {
      showToast(parseError(err, "Failed to update partner"), "error");
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
        throw new Error(parseError(err.error, "Failed to delete partner"));
      }
      showToast("Partner deleted", "success");
      fetchData();
    } catch (err) {
      showToast(parseError(err, "Failed to delete partner"), "error");
    }
  };

  const handleResetCapital = async () => {
    setResetting(true);
    try {
      const body: Record<string, unknown> = {};
      if (resetDate) body.createdAt = new Date(resetDate).toISOString();
      if (resetNotes.trim()) body.notes = resetNotes.trim();
      const res = await fetch("/api/partners/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(parseError(err.error, "Failed to reset capital"));
      }
      showToast("All partner capital reset to zero", "success");
      setResetModal(false);
      setResetDate("");
      setResetNotes("");
      fetchData();
    } catch (err) {
      showToast(parseError(err, "Failed to reset capital"), "error");
    }
    setResetting(false);
  };

  const today = new Date().toISOString().slice(0, 10);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  const totalCapital = partners.reduce((s, p) => s + p.currentCapital, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          <StatCard icon={<Users size={24} />} label="Total Partners" value={partners.length} />
          <StatCard icon={<Wallet size={24} />} label="Total Capital" value={`${totalCapital.toLocaleString()} EGP`} />
          <StatCard icon={<TrendingUp size={24} />} label="Avg Ownership" value={partners.length ? `${(100 / partners.length).toFixed(1)}%` : "0%"} />
          <StatCard icon={<DollarSign size={24} />} label="Total Profit" value="—" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Partners</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setResetModal(true)}
            className="flex items-center gap-2 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-900/20 transition"
          >
            Reset Capital
          </button>
          <button
            onClick={() => setShowAddPartner(true)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:scale-[1.02] transition"
          >
            <Plus size={16} /> Add Partner
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-zinc-500 font-medium">Partner</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Capital</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Ownership %</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Deposits</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Withdrawals</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {partners.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-zinc-500">No partners yet. Click "Add Partner" to create one.</td>
              </tr>
            ) : (
              partners.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-3 font-medium">{p.name}</td>
                  <td className="py-3 text-right font-mono">{p.currentCapital.toLocaleString()} EGP</td>
                  <td className="py-3 text-right">{(p.ownershipPercentage * 100).toFixed(2)}%</td>
                  <td className="py-3 text-right text-green-400">{p.totalDeposits?.toLocaleString() || "—"}</td>
                  <td className="py-3 text-right text-red-400">{p.totalWithdrawals?.toLocaleString() || "—"}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => { setTxModal({ partnerId: p.id, partnerName: p.name }); setTxType("deposit"); setTxAmount(""); setTxDate(""); }} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition" title="Deposit">
                        <ArrowUpRight size={14} />
                      </button>
                      <button onClick={() => { setTxModal({ partnerId: p.id, partnerName: p.name }); setTxType("withdraw"); setTxAmount(""); setTxDate(""); }} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition" title="Withdraw">
                        <ArrowDownRight size={14} />
                      </button>
                      <button onClick={() => { setEditPartner({ id: p.id, name: p.name }); setEditName(p.name); }} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-1.5 rounded-lg transition" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDeletePartner(p)} className="text-xs bg-zinc-800 hover:bg-red-900/50 text-zinc-300 hover:text-red-400 p-1.5 rounded-lg transition" title={p.hasTransactions ? "Cannot delete partner with transaction history" : "Delete"}>
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

      {/* Transaction Modal */}
      {txModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">{txType === "deposit" ? "Deposit" : "Withdraw"} — {txModal.partnerName}</h3>
              <button onClick={() => setTxModal(null)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Type</label>
                <div className="flex gap-2">
                  <button onClick={() => setTxType("deposit")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${txType === "deposit" ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>Deposit</button>
                  <button onClick={() => setTxType("withdraw")} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${txType === "withdraw" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>Withdraw</button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Amount (EGP)</label>
                <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} min="1" step="0.01" className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition" placeholder="e.g. 10000" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Date (optional — defaults to today)</label>
                <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} max={today} className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleTransaction} disabled={submitting} className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {txType === "deposit" ? "Deposit" : "Withdraw"}
                </button>
                <button onClick={() => setTxModal(null)} className="flex-1 border border-white/10 py-3 rounded-xl text-sm hover:bg-zinc-800 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Partner Modal */}
      {showAddPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Add Partner</h3>
              <button onClick={() => { setShowAddPartner(false); setNewPartnerName(""); setInitialCapital(""); setInitialDate(""); }} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Partner Name *</label>
                <input type="text" value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition" placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Initial Capital (optional)</label>
                <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(e.target.value)} min="0" step="0.01" className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition" placeholder="e.g. 50000" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Date (optional)</label>
                <input type="date" value={initialDate} onChange={(e) => setInitialDate(e.target.value)} max={today} className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAddPartner} disabled={addingPartner} className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {addingPartner ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                </button>
                <button onClick={() => { setShowAddPartner(false); setNewPartnerName(""); setInitialCapital(""); setInitialDate(""); }} className="flex-1 border border-white/10 py-3 rounded-xl text-sm hover:bg-zinc-800 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Partner Modal */}
      {editPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Edit Partner</h3>
              <button onClick={() => setEditPartner(null)} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Partner Name *</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleEditPartner} disabled={savingEdit} className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
                </button>
                <button onClick={() => setEditPartner(null)} className="flex-1 border border-white/10 py-3 rounded-xl text-sm hover:bg-zinc-800 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Capital Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-red-400">Reset All Partner Capital</h3>
              <button onClick={() => { setResetModal(false); setResetDate(""); setResetNotes(""); }} className="text-zinc-400 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-zinc-400 mb-4">This will withdraw all partners&apos; current capital to zero.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Effective Date</label>
                <input type="date" value={resetDate} onChange={(e) => setResetDate(e.target.value)} max={today} className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Notes (optional)</label>
                <input type="text" value={resetNotes} onChange={(e) => setResetNotes(e.target.value)} className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition" placeholder="e.g. Capital withdraw for profit distribution" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleResetCapital} disabled={resetting} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {resetting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Reset All Capital
                </button>
                <button onClick={() => { setResetModal(false); setResetDate(""); setResetNotes(""); }} className="flex-1 border border-white/10 py-3 rounded-xl text-sm hover:bg-zinc-800 transition">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionsView({ showToast }: { showToast: (msg: string, type: "success" | "error") => void }) {
  const [transactions, setTransactions] = useState<(Transaction & { partner_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [filterPartner, setFilterPartner] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [txRes, pRes] = await Promise.all([
          fetch("/api/partners/transactions"),
          fetch("/api/partners"),
        ]);
        const txData = await txRes.json();
        const pData = await pRes.json();
        const partnersList = Array.isArray(pData) ? pData : (pData.data || []);
        setPartners(partnersList);
        const txList = Array.isArray(txData) ? txData : (txData.data || []);
        const nameMap = Object.fromEntries(partnersList.map((p: any) => [p.id, p.name]));
        setTransactions(txList.map((tx: any) => ({ ...tx, partner_name: nameMap[tx.partner_id] || "Unknown" })));
      } catch {
        showToast("Failed to load transactions", "error");
      }
      setLoading(false);
    };
    load();
  }, [showToast]);

  const filtered = filterPartner === "all"
    ? transactions
    : transactions.filter((tx) => tx.partner_id === filterPartner);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg">Transaction Ledger</h3>
        <select
          value={filterPartner}
          onChange={(e) => setFilterPartner(e.target.value)}
          className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-white/30 transition"
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
              <th className="text-left py-3 text-zinc-500 font-medium">Date</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Partner</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Type</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Amount</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Snapshot</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-zinc-500">No transactions found</td>
              </tr>
            ) : (
              filtered.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5">
                  <td className="py-3">{tx.date ? new Date(tx.date).toLocaleDateString("en-GB") : new Date(tx.created_at).toLocaleDateString("en-GB")}</td>
                  <td className="py-3 font-medium">{tx.partner_name}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      tx.type === "deposit" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {tx.type === "deposit" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {tx.type === "deposit" ? "Deposit" : "Withdraw"}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono font-medium">{tx.amount.toLocaleString()} EGP</td>
                  <td className="py-3 text-xs text-zinc-500">Auto</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OwnershipHistoryView({ showToast }: { showToast: (msg: string, type: "success" | "error") => void }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

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
        <div>
          <h3 className="font-bold text-lg">Ownership History</h3>
          <p className="text-xs text-zinc-500 mt-1">Immutable snapshots — each capital event creates a permanent record</p>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No snapshots yet</p>
          <p className="text-zinc-600 text-sm mt-2">Snapshots are created automatically when transactions occur</p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map((s) => {
            const isExpanded = expanded.has(s.id);
            const items = s.partner_snapshot_items || [];
            const snapDate = s.snapshot_date || s.created_at;
            return (
              <div key={s.id} className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
                <button onClick={() => toggleExpand(s.id)} className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition text-left">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
                    <div>
                      <span className="text-sm font-medium">{new Date(snapDate).toLocaleString("en-GB")}</span>
                      <span className="text-xs text-zinc-500 ml-3">{items.length} partner{items.length !== 1 ? "s" : ""}</span>
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
                    <div className="text-xs text-zinc-600 mt-2">Snapshot ID: {s.id.slice(0, 8)}...</div>
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
  const [partners, setPartners] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);

  const [period, setPeriod] = useState<Period>("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [result, setResult] = useState<ProfitResult | null>(null);

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
      const reportRes = await fetch(`/api/reports?period=${period}&startDate=${start}&endDate=${end}`);
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
        throw new Error(parseError(err.error, "Failed to distribute profit"));
      }

      const data = await res.json();
      setResult(data);
      showToast("Profit calculated successfully", "success");
    } catch (err) {
      showToast(parseError(err, "Failed to distribute profit"), "error");
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
            <input type="date" value={startDate} max={endDate || today} onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 transition" />
            <span className="text-zinc-500 text-xs">to</span>
            <input type="date" value={endDate} min={startDate} max={today} onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-white/30 transition" />
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

      {result ? (
        <div className="space-y-6">
          {result.segments && result.segments.length > 0 && (
            <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
              <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Clock size={14} /> Ownership Timeline Segments</h4>
              <div className="space-y-2">
                {result.segments.map((seg, i) => (
                  <div key={i} className="bg-zinc-900/50 border border-white/5 rounded-xl p-3">
                    <div className="flex justify-between text-xs text-zinc-400 mb-2">
                      <span>{new Date(seg.startDate).toLocaleDateString("en-GB")} → {new Date(seg.endDate).toLocaleDateString("en-GB")}</span>
                      <span>Weight: {(seg.weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {seg.ownerships.map((o) => (
                        <div key={o.partner_id} className="text-xs">
                          <span className="text-zinc-400">{partners.find((p) => p.id === o.partner_id)?.name || o.partner_id.slice(0, 8)}</span>
                          <div className="text-white font-medium">{(o.percentage * 100).toFixed(2)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  {result.distributions.map((d) => (
                    <tr key={d.partner_id} className="border-b border-white/5">
                      <td className="py-2 font-medium">{d.partner_name}</td>
                      <td className="py-2 text-right">{d.capital.toLocaleString()} EGP</td>
                      <td className="py-2 text-right">{(d.ownershipPercentage * 100).toFixed(2)}%</td>
                      <td className="py-2 text-right text-green-400 font-bold">{d.profitShare.toLocaleString()} EGP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <BarChart3 size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">No profit distribution calculated yet</p>
          <p className="text-zinc-600 text-sm mt-2">Select a period and click &quot;Calculate Distribution&quot;</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
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

"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, X, Save, Trash2, Edit3, Loader2, Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { useToast } from "../components/Toast";

const CATEGORIES = [
  "Facebook Ads",
  "Instagram Ads",
  "TikTok Ads",
  "Google Ads",
  "Shipping",
  "Packaging",
  "Salaries",
  "Rent",
  "Other",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  "Facebook Ads": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Instagram Ads": "bg-pink-500/10 text-pink-400 border-pink-500/30",
  "TikTok Ads": "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "Google Ads": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  Shipping: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  Packaging: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Salaries: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Rent: "bg-red-500/10 text-red-400 border-red-500/30",
  Other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  notes?: string;
  date: string;
}

const defaultForm = {
  title: "",
  category: "Other",
  amount: 0,
  notes: "",
  date: new Date().toISOString().slice(0, 10),
};

export default function ExpensesTab() {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [revenue, setRevenue] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, revRes] = await Promise.all([
        fetch("/api/expenses"),
        fetch("/api/treasury"),
      ]);
      const expRaw = await expRes.json();
      const revRaw = await revRes.json();
      setExpenses(Array.isArray(expRaw) ? expRaw : (expRaw.data || []));
      if (revRaw.totalNetRevenue !== undefined) setRevenue(revRaw.totalNetRevenue);
    } catch (err) {
      console.error("Failed to load data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    if (startDate) result = result.filter((e) => e.date >= startDate);
    if (endDate) result = result.filter((e) => e.date <= endDate);
    return result;
  }, [expenses, startDate, endDate]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = revenue - totalExpenses;

  const openCreate = () => {
    setEditingExpense(null);
    setForm({ ...defaultForm, date: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense.id);
    setForm({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      notes: expense.notes || "",
      date: expense.date || new Date().toISOString().slice(0, 10),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: editingExpense ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingExpense ? { id: editingExpense, ...form } : form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save expense");
      }
      showToast(`Expense ${editingExpense ? "updated" : "created"} successfully`, "success");
      setShowModal(false);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save expense", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete expense");
      showToast("Expense deleted", "success");
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete expense", "error");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp size={20} className="text-green-400" />
            <span className="text-zinc-500 text-xs">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{revenue.toLocaleString()} EGP</p>
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingDown size={20} className="text-red-400" />
            <span className="text-zinc-500 text-xs">Total Expenses</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{totalExpenses.toLocaleString()} EGP</p>
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Wallet size={20} className={netProfit >= 0 ? "text-green-400" : "text-red-400"} />
            <span className="text-zinc-500 text-xs">Net Profit</span>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
            {netProfit.toLocaleString()} EGP
          </p>
        </div>
      </div>

      {/* Date Filter + Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
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
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="text-xs text-zinc-500 hover:text-white transition pb-2"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:scale-[1.02] transition shrink-0"
        >
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Expenses Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-zinc-500 font-medium">ID</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Title</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Category</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Amount (EGP)</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Date</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Notes</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-zinc-500">No expenses found</td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-white/5">
                  <td className="py-3 text-xs font-mono text-zinc-500">{expense.id}</td>
                  <td className="py-3 font-medium">{expense.title}</td>
                  <td className="py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold">{expense.amount.toLocaleString()}</td>
                  <td className="py-3 text-zinc-400">
                    {expense.date ? new Date(expense.date).toLocaleDateString("en-GB") : ""}
                  </td>
                  <td className="py-3 text-zinc-500 max-w-[200px] truncate">{expense.notes || ""}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(expense)} className="text-zinc-400 hover:text-white transition">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(expense.id)} className="text-red-500 hover:text-red-400 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 font-bold">
              <td colSpan={3} className="py-3 text-sm">Total</td>
              <td className="py-3 text-right">{totalExpenses.toLocaleString()} EGP</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">{editingExpense ? "Edit Expense" : "Add Expense"}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition appearance-none cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-zinc-900 text-white">{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Amount (EGP)</label>
                <input
                  type="number"
                  value={form.amount || ""}
                  onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingExpense ? "Update" : "Save"}
                </button>
                <button onClick={() => setShowModal(false)} className="flex-1 border border-white/10 py-3 rounded-xl text-sm hover:bg-zinc-800 transition">
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

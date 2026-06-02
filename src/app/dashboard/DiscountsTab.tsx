"use client";

import { useEffect, useState } from "react";
import { Plus, X, Save, Trash2, Loader2 } from "lucide-react";
import { useToast } from "../components/Toast";

interface Coupon {
  id: string;
  code: string;
  discount_value: number;
  discount_type: "fixed" | "percentage";
  is_active: boolean;
  created_at: string;
}

export default function DiscountsTab({ userRole }: { userRole: "admin" | "viewer" }) {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons");
      const raw = await res.json();
      setCoupons(Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.error("Failed to load coupons:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async () => {
    if (!code.trim()) {
      showToast("Please enter a coupon code", "error");
      return;
    }
    if (!value || Number(value) <= 0) {
      showToast("Please enter a valid discount value", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _admin: true, code: code.trim(), discount_value: Number(value), discount_type: "fixed" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create coupon");
      }
      showToast(`Coupon ${data.code} created`, "success");
      setShowModal(false);
      setCode("");
      setValue("");
      fetchCoupons();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create coupon", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      const res = await fetch(`/api/coupons?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      showToast("Coupon deleted", "success");
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete coupon", "error");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Discount Codes</h2>
        {userRole === "admin" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:scale-[1.02] transition"
          >
            <Plus size={16} /> Create Coupon
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-zinc-500 font-medium">Code</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Type</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Value</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Status</th>
              <th className="text-left py-3 text-zinc-500 font-medium">Created</th>
              <th className="text-right py-3 text-zinc-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-zinc-500">No coupons yet</td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-white/5">
                  <td className="py-3 font-mono font-bold text-sm">{coupon.code}</td>
                  <td className="py-3 text-zinc-400 capitalize">{coupon.discount_type}</td>
                  <td className="py-3 text-right font-bold">
                    {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `${coupon.discount_value} EGP`}
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${coupon.is_active ? "text-green-400 border-green-500/30 bg-green-500/10" : "text-red-400 border-red-500/30 bg-red-500/10"}`}>
                      {coupon.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-400 text-xs">
                    {coupon.created_at ? new Date(coupon.created_at).toLocaleDateString("en-GB") : ""}
                  </td>
                  <td className="py-3 text-right">
                    {userRole === "admin" && (
                      <button onClick={() => handleDelete(coupon.id)} className="text-red-500 hover:text-red-400 transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Create Coupon</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Coupon Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BLANK50"
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition uppercase"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Discount Value (EGP)</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Create
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

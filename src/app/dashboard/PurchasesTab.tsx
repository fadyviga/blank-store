"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "../components/Toast";
import { Loader2, Plus, X, Save, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface PurchaseItem {
  productId: string;
  colorId: string;
  sizeId: string;
  quantity: number;
  unitCost: number;
}

interface Purchase {
  id: string;
  supplier: string;
  notes?: string;
  total: number;
  created_at: string;
  items: {
    product_name?: string;
    color_name?: string;
    size_label?: string;
    quantity: number;
    unit_cost: number;
    line_total: number;
  }[];
}

interface Product {
  id: string;
  name: string;
}

interface Color {
  id: string;
  name: string;
  hex?: string;
  product_id: string;
}

interface Size {
  id: string;
  label: string;
}

export default function PurchasesTab({ userRole }: { userRole: "admin" | "viewer" }) {
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([
    { productId: "", colorId: "", sizeId: "", quantity: 1, unitCost: 0 },
  ]);
  const [applyToAllSizes, setApplyToAllSizes] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchPurchases = useCallback(async () => {
    try {
      const res = await fetch("/api/purchases");
      const raw = await res.json();
      setPurchases(Array.isArray(raw) ? raw : (raw.data || []));
    } catch (err) {
      showToast("Failed to load purchases", "error");
    }
  }, [showToast]);

  const fetchFormData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/colors"),
        fetch("/api/sizes"),
      ]);
      const [pRaw, cRaw, sRaw] = await Promise.all([
        pRes.json(), cRes.json(), sRes.json(),
      ]);
      setProducts(Array.isArray(pRaw) ? pRaw : (pRaw.data || []));
      setColors(Array.isArray(cRaw) ? cRaw : (cRaw.data || []));
      setSizes(Array.isArray(sRaw) ? sRaw : (sRaw.data || []));
    } catch (err) {
      showToast("Failed to load form data", "error");
    }
    setLoadingData(false);
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchPurchases(), fetchFormData()]);
      setLoading(false);
    };
    init();
  }, [fetchPurchases, fetchFormData]);

  const addItem = () => {
    setItems((prev) => [...prev, { productId: "", colorId: "", sizeId: "", quantity: 1, unitCost: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

  const getColorsForProduct = (productId: string) =>
    colors.filter((c) => c.product_id === productId);

  const handleCreatePurchase = async () => {
    if (!supplier.trim()) {
      showToast("Please enter a supplier name", "error");
      return;
    }
    if (items.length === 0 || items.every((i) => !i.productId)) {
      showToast("Please add at least one item", "error");
      return;
    }

    const lineItems = items.filter((i) => i.productId && i.colorId);
    if (lineItems.length === 0) {
      showToast("Please fill in item details", "error");
      return;
    }
    if (!applyToAllSizes && lineItems.some((i) => !i.sizeId)) {
      showToast("Please select a size for all items", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: supplier.trim(),
          notes: notes.trim() || undefined,
          apply_to_all_sizes: applyToAllSizes,
          created_at: purchaseDate || undefined,
          items: lineItems.map((i) => ({
            productId: i.productId,
            colorId: i.colorId,
            sizeId: applyToAllSizes ? undefined : i.sizeId,
            quantity: i.quantity || 1,
            unitCost: i.unitCost,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create purchase");
      }
      showToast("Purchase created successfully", "success");
      setShowForm(false);
      setSupplier("");
      setNotes("");
      setItems([{ productId: "", colorId: "", sizeId: "", quantity: 1, unitCost: 0 }]);
      setApplyToAllSizes(false);
      setPurchaseDate("");
      fetchPurchases();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create purchase", "error");
    }
    setSubmitting(false);
  };

  const handleDeletePurchase = async (id: string) => {
    if (!confirm("Delete this purchase?")) return;
    try {
      const res = await fetch(`/api/purchases?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete purchase");
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      showToast("Purchase deleted", "success");
    } catch (err) {
      showToast("Failed to delete purchase", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Purchases</h2>
        {userRole === "admin" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:scale-[1.02] transition"
          >
            <Plus size={16} /> New Purchase
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Supplier Name</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Supplier Co."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={1}
                placeholder="Any notes about this purchase"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Purchase Date (optional)</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Items</label>
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAllSizes}
                  onChange={(e) => setApplyToAllSizes(e.target.checked)}
                  className="accent-white"
                />
                Apply quantity to all sizes
              </label>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="bg-zinc-900 border border-white/10 rounded-xl p-4"
                >
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Product</label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, "productId", e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-white/30 transition"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Color</label>
                      <select
                        value={item.colorId}
                        onChange={(e) => updateItem(index, "colorId", e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-white/30 transition"
                      >
                        <option value="">Select color</option>
                        {getColorsForProduct(item.productId).map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {!applyToAllSizes && (
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">Size</label>
                        <select
                          value={item.sizeId}
                          onChange={(e) => updateItem(index, "sizeId", e.target.value)}
                          className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-white/30 transition"
                        >
                          <option value="">Select size</option>
                          {sizes.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {applyToAllSizes && (
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">Size</label>
                        <div className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-zinc-400">
                          All Sizes
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-white/30 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Unit Cost (EGP)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitCost}
                        onChange={(e) => updateItem(index, "unitCost", Number(e.target.value))}
                        className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-white/30 transition"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-2">
                    {userRole === "admin" && (
                      <button
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="text-xs text-red-500 hover:text-red-400 transition flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X size={14} /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {userRole === "admin" && (
              <button
                onClick={addItem}
                className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
              >
                <Plus size={14} /> Add Item
              </button>
            )}
          </div>

          <div className="border-t border-white/10 pt-4 flex items-center justify-between">
            <div>
              <span className="text-sm text-zinc-400">Total Cost: </span>
              <span className="text-lg font-bold">{totalCost.toLocaleString()} EGP</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="border border-white/10 px-5 py-2.5 rounded-xl text-sm hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              {userRole === "admin" && (
                <button
                  onClick={handleCreatePurchase}
                  disabled={submitting}
                  className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-[1.02] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Create Purchase
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        {purchases.length === 0 ? (
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-10 text-center text-zinc-500">
            No purchases yet. Create your first purchase.
          </div>
        ) : (
          <div className="space-y-3">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
                <div
                  className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition"
                  onClick={() => setExpanded(expanded === purchase.id ? null : purchase.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-mono text-zinc-500 tracking-wider">
                        #{purchase.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="font-semibold">{purchase.supplier}</p>
                    <p className="text-zinc-500 text-xs">
                      {purchase.created_at
                        ? new Date(purchase.created_at).toLocaleDateString("en-GB")
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">{purchase.total.toLocaleString()} EGP</p>
                      <p className="text-zinc-500 text-xs">{purchase.items?.length || 0} items</p>
                    </div>
                    {expanded === purchase.id ? (
                      <ChevronUp size={18} className="text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronDown size={18} className="text-zinc-500 shrink-0" />
                    )}
                  </div>
                </div>

                {expanded === purchase.id && (
                  <div className="border-t border-white/5 px-4 md:px-5 py-4 space-y-4">
                    {purchase.items && purchase.items.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Items</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/5">
                                <th className="text-left py-2 text-zinc-500 font-medium">Product</th>
                                <th className="text-left py-2 text-zinc-500 font-medium">Color</th>
                                <th className="text-left py-2 text-zinc-500 font-medium">Size</th>
                                <th className="text-right py-2 text-zinc-500 font-medium">Qty</th>
                                <th className="text-right py-2 text-zinc-500 font-medium">Unit Cost</th>
                                <th className="text-right py-2 text-zinc-500 font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchase.items.map((item: any, i: number) => (
                                <tr key={i} className="border-b border-white/5">
                                  <td className="py-2">{item.product_name || "—"}</td>
                                  <td className="py-2">{item.color_name || "—"}</td>
                                  <td className="py-2">{item.size_label || "—"}</td>
                                  <td className="py-2 text-right">{item.quantity}</td>
                                  <td className="py-2 text-right">{item.unit_cost?.toLocaleString()} EGP</td>
                                  <td className="py-2 text-right font-medium">{(item.line_total ?? item.quantity * item.unit_cost).toLocaleString()} EGP</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {purchase.notes && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Notes</p>
                        <p className="text-sm text-zinc-300">{purchase.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {userRole === "admin" && (
                        <button
                          onClick={() => handleDeletePurchase(purchase.id)}
                          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition ml-auto"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

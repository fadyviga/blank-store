"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ShoppingBag,
  Wallet,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Trash2,
  Edit3,
  Plus,
  X,
  Save,
  Search,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Loader2,
  RefreshCw,
  Eye,
  Settings,
  Truck,
  FileText,
  DollarSign,
  Receipt,
  HandCoins,
  Tag,
} from "lucide-react";
import {
  loadOrders,
  deleteOrderById,
  updateOrderStatus,
  updateOrderDetails,
} from "../../lib/order";
import type { Order, OrderStatus, Product, ProductVariant, CustomerProfile } from "@/types";
import { STATUS_COLORS, STATUS_OPTIONS, BASE_PRICE, DELIVERY_FEE, DELIVERY_THRESHOLD } from "@/types";
import { useToast } from "../components/Toast";
import PurchasesTab from "./PurchasesTab";
import ExpensesTab from "./ExpensesTab";
import ReportsTab from "./ReportsTab";
import PartnersTab from "./PartnersTab";
import TreasuryTab from "./TreasuryTab";
import DiscountsTab from "./DiscountsTab";
import AnalyticsTab from "./AnalyticsTab";
import ShortagesTab from "./ShortagesTab";
import PendingShortagesTab from "./PendingShortagesTab";

type Tab =
  | "overview"
  | "orders"
  | "products"
  | "inventory"
  | "customers"
  | "analytics"
  | "restock"
  | "purchases"
  | "expenses"
  | "reports"
  | "partners"
  | "treasury"
  | "discounts"
  | "shortages"
  | "pending-shortages";

export default function DashboardPage() {
  const handleLogout = () => {
    document.cookie = "admin_session=; path=/; max-age=0; SameSite=Lax";
    window.location.href = "/login";
  };

  return <AuthenticatedDashboard onLogout={handleLogout} />;
}

function AuthenticatedDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shortageCount, setShortageCount] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData] = await Promise.all([loadOrders()]);
      setOrders(ordersData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/shortages")
      .then((r) => r.json())
      .then((d) => {
        if (d.summary) setShortageCount(d.summary.total_missing_units);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "cancelled");
    const revenue = active.reduce((sum, o) => {
      const items = o.items || [];
      return sum + items.reduce((s, item: any) => s + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    }, 0);
    const customers = new Set(orders.map((o) => o.customer?.phone).filter(Boolean));
    return {
      totalOrders: orders.length,
      totalRevenue: revenue,
      totalCustomers: customers.size,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
    };
  }, [orders]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { key: "orders", label: "Orders", icon: <ShoppingBag size={16} /> },
    { key: "products", label: "Products", icon: <Package size={16} /> },
    { key: "inventory", label: "Inventory", icon: <Settings size={16} /> },
    { key: "customers", label: "Customers", icon: <Users size={16} /> },
    { key: "analytics", label: "Analytics", icon: <TrendingUp size={16} /> },
    { key: "restock", label: "Restock", icon: <AlertTriangle size={16} /> },
    { key: "purchases", label: "Purchases", icon: <DollarSign size={16} /> },
    { key: "expenses", label: "Expenses", icon: <Receipt size={16} /> },
    { key: "reports", label: "Reports", icon: <BarChart3 size={16} /> },
    { key: "partners", label: "Partners", icon: <HandCoins size={16} /> },
    { key: "discounts", label: "Discounts", icon: <Tag size={16} /> },
    { key: "treasury", label: "Treasury", icon: <Wallet size={16} /> },
    {
      key: "shortages",
      label: `Shortages${shortageCount && shortageCount > 0 ? ` (${shortageCount})` : ""}`,
      icon: <AlertTriangle size={16} />,
    },
    {
      key: "pending-shortages",
      label: "Pending Shortages",
      icon: <AlertTriangle size={16} />,
    },
  ];

  const tabContent = (() => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab stats={stats} orders={orders} onViewOrders={() => setActiveTab("orders")} />;
      case "orders":
        return <OrdersTab orders={orders} setOrders={setOrders} />;
      case "products":
        return <ProductsTab />;
      case "inventory":
        return <InventoryTab />;
      case "customers":
        return <CustomersTab orders={orders} />;
      case "analytics":
        return <AnalyticsTab />;
      case "restock":
        return <RestockTab />;
      case "purchases":
        return <PurchasesTab />;
      case "expenses":
        return <ExpensesTab />;
      case "reports":
        return <ReportsTab />;
      case "partners":
        return <PartnersTab />;
      case "discounts":
        return <DiscountsTab />;
      case "treasury":
        return <TreasuryTab />;
      case "shortages":
        return <ShortagesTab />;
      case "pending-shortages":
        return <PendingShortagesTab />;
    }
  })();

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-zinc-500 uppercase tracking-[0.3em] text-xs mb-2">Blank Store</p>
            <h1 className="text-3xl md:text-4xl font-black">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button onClick={onLogout} className="text-xs text-zinc-500 hover:text-red-400 transition">
              Logout
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-xs md:text-sm font-medium transition whitespace-nowrap ${
                activeTab === t.key
                  ? "bg-white text-black"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {loading && activeTab === "overview" ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-zinc-500" />
          </div>
        ) : (
          tabContent
        )}
      </div>
    </main>
  );
}

function OverviewTab({
  stats,
  orders,
  onViewOrders,
}: {
  stats: { totalOrders: number; totalRevenue: number; totalCustomers: number; pendingOrders: number };
  orders: Order[];
  onViewOrders: () => void;
}) {
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null);
  const [salesData, setSalesData] = useState<{ totalUnitsSold: number; totalSalesValue: number; topSellingProducts: { productName: string; unitsSold: number; salesValue: number }[] } | null>(null);
  const [inventoryData, setInventoryData] = useState<{ totalStock: number } | null>(null);

  useEffect(() => {
    fetch("/api/treasury")
      .then((r) => r.json())
      .then((d) => { if (d.cashBalance !== undefined) setTreasuryBalance(d.cashBalance); })
      .catch(() => {});
    Promise.all([
      fetch("/api/analytics/sales").then((r) => r.json()),
      fetch("/api/analytics/inventory").then((r) => r.json()),
    ])
      .then(([sales, inventory]) => {
        setSalesData(sales);
        setInventoryData(inventory);
      })
      .catch(() => {});
  }, []);

  const topSelling = useMemo(() => (salesData?.topSellingProducts || []).slice(0, 5), [salesData]);

  return (
    <div className="space-y-8">
      {treasuryBalance !== null && (
        <div className="bg-zinc-950 border border-green-500/30 rounded-3xl p-5 md:p-6">
          <div className="flex items-center gap-3 mb-1">
            <Wallet size={20} className="text-green-400" />
            <p className="text-zinc-400 text-xs uppercase tracking-widest">Current Treasury Balance</p>
          </div>
          <p className="text-3xl md:text-4xl font-black text-green-400">
            {treasuryBalance.toLocaleString("en-EG", { minimumFractionDigits: 2 })} EGP
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<ShoppingBag size={24} />} label="Total Orders" value={stats.totalOrders} />
        <StatCard icon={<Users size={24} />} label="Customers" value={stats.totalCustomers} />
        <StatCard icon={<Wallet size={24} />} label="Total Sales" value={salesData ? `${salesData.totalSalesValue.toLocaleString()} EGP` : "—"} />
        <StatCard
          icon={<AlertTriangle size={24} />}
          label="Pending Orders"
          value={stats.pendingOrders}
          highlight={stats.pendingOrders > 0}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={<Package size={24} />} label="Units Sold" value={salesData?.totalUnitsSold ?? "—"} />
        <StatCard icon={<Package size={24} />} label="Total Stock Available" value={inventoryData?.totalStock ?? "—"} />
        <StatCard icon={<TrendingUp size={24} />} label="Top Product Units" value={topSelling.length > 0 ? topSelling[0].unitsSold : "—"} />
      </div>

      {/* Sales by Product Chart */}
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
        <h2 className="text-xl font-bold mb-4">Sales by Product</h2>
        {topSelling.length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center">No sales data yet</p>
        ) : (
          <div className="space-y-3">
            {topSelling.map((item, i) => {
              const maxValue = Math.max(...topSelling.map((p) => p.salesValue));
              const pct = maxValue > 0 ? (item.salesValue / maxValue) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-300">{item.productName}</span>
                    <span className="text-zinc-400">{item.unitsSold} units &middot; {item.salesValue.toLocaleString()} EGP</span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Orders</h2>
          <button onClick={onViewOrders} className="text-xs text-zinc-400 hover:text-white transition">
            View All
          </button>
        </div>
        <div className="space-y-2">
          {recentOrders.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">No orders yet</p>
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="bg-zinc-950 border border-white/10 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-mono text-zinc-500">{order.displayId}</p>
                  <p className="font-medium text-sm">{order.customer?.name || "Unknown"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{order.productTotal} EGP</p>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${
                      STATUS_COLORS[order.status]
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
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

function OrdersTab({
  orders,
  setOrders,
}: {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortNewest, setSortNewest] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{
    order: Order;
    notes: string;
    tracking: string;
  } | null>(null);

  const filtered = useMemo(() => {
    let result = [...orders];
    if (statusFilter !== "all") result = result.filter((o) => o.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.displayId?.toLowerCase().includes(q) ||
          o.customer?.name?.toLowerCase().includes(q) ||
          o.customer?.phone?.includes(q)
      );
    }
    result.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortNewest ? diff : -diff;
    });
    return result;
  }, [orders, statusFilter, sortNewest, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    try {
      await deleteOrderById(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      alert("Failed to delete order");
    }
  };

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    try {
      await updateOrderStatus(id, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status } : o))
      );
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleSaveDetails = async () => {
    if (!editModal) return;
    try {
      await updateOrderDetails(editModal.order.id, {
        internalNotes: editModal.notes,
        trackingNumber: editModal.tracking,
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === editModal.order.id
            ? { ...o, internalNotes: editModal.notes, trackingNumber: editModal.tracking }
            : o
        )
      );
      setEditModal(null);
    } catch (err) {
      alert("Failed to update order");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by ID, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-white/30 transition"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", ...STATUS_OPTIONS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition border capitalize ${
                statusFilter === s
                  ? "bg-white text-black border-white"
                  : "bg-zinc-900 text-zinc-400 border-white/10 hover:border-white/30"
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => setSortNewest(!sortNewest)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition ml-2"
          >
            {sortNewest ? "Newest" : "Oldest"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 rounded-3xl p-10 text-center text-zinc-500">
          {orders.length === 0 ? "No orders yet" : "No orders match this filter"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
              <div
                className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition"
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-zinc-500 tracking-wider">
                      {order.displayId}
                    </span>
                    <select
                      value={order.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value as OrderStatus)
                      }
                      className={`text-[10px] font-medium rounded-full px-2.5 py-1 border capitalize appearance-none cursor-pointer outline-none ${
                        STATUS_COLORS[order.status]
                      }`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-zinc-900 text-white">
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="font-semibold">{order.customer?.name || "Unknown"}</p>
                  <p className="text-zinc-500 text-xs">{order.customer?.phone}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold">{order.productTotal} EGP</p>
                    <p className="text-zinc-500 text-xs">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("en-GB")
                        : ""}
                    </p>
                  </div>
                  {expandedOrder === order.id ? (
                    <ChevronUp size={18} className="text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronDown size={18} className="text-zinc-500 shrink-0" />
                  )}
                </div>
              </div>

              {expandedOrder === order.id && (
                <div className="border-t border-white/5 px-4 md:px-5 py-4 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Customer</p>
                      <p className="text-sm">{order.customer?.name}</p>
                      <p className="text-sm text-zinc-400">{order.customer?.phone}</p>
                      <p className="text-sm text-zinc-400">{order.customer?.address}</p>
                      {order.customer?.email && (
                        <p className="text-sm text-zinc-400">{order.customer.email}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Order Details</p>
                      <p className="text-sm">Product Total: {order.productTotal} EGP</p>
                      <p className="text-sm">Delivery: {order.delivery} EGP</p>
                      <p className="text-sm font-bold">Total: {order.total} EGP</p>
                      <p className="text-sm text-zinc-400">
                        {new Date(order.createdAt).toLocaleString("en-GB")}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Items</p>
                    <div className="space-y-2">
                      {order.items?.map((item: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-zinc-900 rounded-xl p-3"
                        >
                          <div className="flex items-center gap-3">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-zinc-500">
                                {item.color} / {item.size} &middot; Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-medium">{item.price * item.quantity} EGP</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(order.internalNotes || order.trackingNumber) && (
                    <div className="grid md:grid-cols-2 gap-3">
                      {order.internalNotes && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Notes</p>
                          <p className="text-sm text-zinc-300">{order.internalNotes}</p>
                        </div>
                      )}
                      {order.trackingNumber && (
                        <div>
                          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Tracking</p>
                          <p className="text-sm text-zinc-300">{order.trackingNumber}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() =>
                        setEditModal({
                          order,
                          notes: order.internalNotes || "",
                          tracking: order.trackingNumber || "",
                        })
                      }
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
                    >
                      <Edit3 size={14} /> Edit Details
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition ml-auto"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold">Edit Order Details</h3>
              <button onClick={() => setEditModal(null)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Internal Notes</label>
                <textarea
                  value={editModal.notes}
                  onChange={(e) =>
                    setEditModal((prev) => prev ? { ...prev, notes: e.target.value } : prev)
                  }
                  rows={3}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Tracking Number</label>
                <input
                  type="text"
                  value={editModal.tracking}
                  onChange={(e) =>
                    setEditModal((prev) => prev ? { ...prev, tracking: e.target.value } : prev)
                  }
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveDetails}
                  className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Save
                </button>
                <button
                  onClick={() => setEditModal(null)}
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

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [productForm, setProductForm] = useState<{
    name: string;
    description: string;
    basePrice: number;
    price: number;
    comparePrice: string;
    category: string;
    image: string;
    images: string[];
    sortOrder: number;
  }>({ name: "", description: "", basePrice: BASE_PRICE, price: BASE_PRICE, comparePrice: "", category: "tees", image: "", images: [], sortOrder: 0 });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [colorForm, setColorForm] = useState({ name: "", hex: "#000000", image: "" });
  const [sizeForm, setSizeForm] = useState("");
  const [showColorForm, setShowColorForm] = useState(false);
  const [showSizeForm, setShowSizeForm] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, vRes, cRes, sRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/variants"),
        fetch("/api/colors"),
        fetch("/api/sizes"),
      ]);
      const [pRaw, vRaw, cRaw, sRaw] = await Promise.all([
        pRes.json(), vRes.json(), cRes.json(), sRes.json(),
      ]);
      // Handle both direct arrays and {data: [], warning: "..."} response formats
      setProducts(Array.isArray(pRaw) ? pRaw : (pRaw.data || []));
      setVariants(Array.isArray(vRaw) ? vRaw : (vRaw.data || []));
      setColors(Array.isArray(cRaw) ? cRaw : (cRaw.data || []));
      setSizes(Array.isArray(sRaw) ? sRaw : (sRaw.data || []));
    } catch (err) {
      console.error("Failed to load products:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) return;
    try {
      const payload: Record<string, unknown> = {
        name: productForm.name,
        description: productForm.description,
        basePrice: productForm.basePrice,
        price: productForm.price,
        comparePrice: productForm.comparePrice ? Number(productForm.comparePrice) : null,
        category: productForm.category,
        image: productForm.image,
        images: productForm.images,
        sortOrder: productForm.sortOrder,
      };
      if (editingProduct) payload.id = editingProduct;
      const res = await fetch("/api/products", {
        method: editingProduct ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowForm(false);
        setEditingProduct(null);
        setNewImageUrl("");
        setProductForm({ name: "", description: "", basePrice: BASE_PRICE, price: BASE_PRICE, comparePrice: "", category: "tees", image: "", images: [], sortOrder: 0 });
        fetchProducts();
      }
    } catch (err) {
      console.error("Failed to save product:", err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await fetch(`/api/products?id=${id}`, { method: "DELETE" });
      fetchProducts();
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  };

  const handleAddColor = async () => {
    if (!colorForm.name.trim() || !products[0]) return;
    try {
      await fetch("/api/colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...colorForm, productId: products[0].id }),
      });
      setColorForm({ name: "", hex: "#000000", image: "" });
      fetchProducts();
    } catch (err) {
      console.error("Failed to add color:", err);
    }
  };

  const handleAddSize = async () => {
    if (!sizeForm.trim()) return;
    try {
      await fetch("/api/sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: sizeForm }),
      });
      setSizeForm("");
      fetchProducts();
    } catch (err) {
      console.error("Failed to add size:", err);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Products</h2>
        <div className="flex gap-2">
          {products.length === 0 && !loading && (
            <span className="text-xs text-zinc-500 self-center mr-2">Products table not configured.</span>
          )}
          <button
            onClick={() => { setShowForm(!showForm); setEditingProduct(null); setNewImageUrl(""); setProductForm({ name: "", description: "", basePrice: BASE_PRICE, price: BASE_PRICE, comparePrice: "", category: "tees", image: "", images: [], sortOrder: 0 }); }}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:scale-[1.02] transition"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Name</label>
              <input
                type="text" value={productForm.name}
                onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Price (EGP)</label>
              <input
                type="number" value={productForm.price}
                onChange={(e) => setProductForm((p) => ({ ...p, price: Number(e.target.value) }))}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Compare Price (original)</label>
              <input
                type="number" value={productForm.comparePrice}
                onChange={(e) => setProductForm((p) => ({ ...p, comparePrice: e.target.value }))}
                placeholder="e.g. 450"
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-zinc-400 mb-1">Description</label>
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Category</label>
              <input
                type="text" value={productForm.category}
                onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Main Image URL</label>
              <input
                type="text" value={productForm.image}
                onChange={(e) => setProductForm((p) => ({ ...p, image: e.target.value }))}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Sort Order</label>
              <input
                type="number" value={productForm.sortOrder}
                onChange={(e) => setProductForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-zinc-400 mb-1">Additional Images</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text" value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Paste image URL and add"
                  className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
                />
                <button
                  onClick={() => {
                    if (newImageUrl.trim()) {
                      setProductForm((p) => ({ ...p, images: [...p.images, newImageUrl.trim()] }));
                      setNewImageUrl("");
                    }
                  }}
                  className="bg-white text-black px-4 py-3 rounded-xl text-sm font-bold"
                >
                  Add
                </button>
              </div>
              {productForm.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {productForm.images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                      <button
                        onClick={() => setProductForm((p) => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveProduct} className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center gap-2">
              <Save size={16} /> {editingProduct ? "Update" : "Create"}
            </button>
            <button onClick={() => setShowForm(false)} className="border border-white/10 px-6 py-2.5 rounded-xl text-sm hover:bg-zinc-800 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {products.length === 0 ? (
          <p className="text-zinc-500 text-center py-10">No products yet. Create your first product.</p>
        ) : (
          products.map((product) => {
            const p = product as any;
            const currentPrice = p.price ?? p.base_price ?? 0;
            const comparePrice = p.compare_price;
            const discount = comparePrice ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100) : 0;
            const productImages = p.images?.length > 0 ? p.images : p.image ? [p.image] : [];
            return (
              <div key={p.id} className="bg-zinc-950 border border-white/10 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-4 items-start">
                    {productImages.length > 0 && (
                      <img src={productImages[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10" />
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{p.name}</h3>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <span className="text-zinc-400">{p.category}</span>
                        <span className="text-zinc-600">&middot;</span>
                        <span className="text-white font-bold">{currentPrice} EGP</span>
                        {comparePrice && comparePrice > currentPrice && (
                          <>
                            <span className="text-zinc-500 line-through text-xs">{comparePrice} EGP</span>
                            <span className="text-xs font-bold text-green-400">-{discount}%</span>
                          </>
                        )}
                        <span className="text-zinc-600">&middot;</span>
                        <span className="text-zinc-500 text-xs">Order: {p.sort_order ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={`/products/${p.id}`}
                      target="_blank"
                      className="text-zinc-400 hover:text-white transition"
                      title="View product page"
                    >
                      <Eye size={16} />
                    </a>
                    <button
                      onClick={() => {
                        setEditingProduct(p.id);
                        setNewImageUrl("");
                        setProductForm({
                          name: p.name,
                          description: p.description || "",
                          basePrice: p.base_price ?? currentPrice,
                          price: currentPrice,
                          comparePrice: comparePrice ? String(comparePrice) : "",
                          category: p.category || "tees",
                          image: p.image || "",
                          images: p.images || [],
                          sortOrder: p.sort_order ?? 0,
                        });
                        setShowForm(true);
                      }}
                      className="text-zinc-400 hover:text-white transition"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-400 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {colors.filter((c: any) => c.product_id === p.id).map((c: any) => (
                    <span key={c.id} className="text-xs bg-zinc-800 px-2.5 py-1 rounded-full">
                      {c.name}
                    </span>
                  ))}
                </div>

                <VariantManager productId={p.id} colors={colors} sizes={sizes} variants={variants} onUpdate={fetchProducts} />
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-white/10 pt-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Colors</h3>
              <button onClick={() => setShowColorForm(!showColorForm)} className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1">
                <Plus size={14} /> Add Color
              </button>
            </div>
            {showColorForm && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text" placeholder="Color name" value={colorForm.name}
                  onChange={(e) => setColorForm((c) => ({ ...c, name: e.target.value }))}
                  className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                />
                <input
                  type="color" value={colorForm.hex}
                  onChange={(e) => setColorForm((c) => ({ ...c, hex: e.target.value }))}
                  className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10"
                />
                <button onClick={handleAddColor} className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold">
                  Add
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <span key={c.id} className="flex items-center gap-2 text-xs bg-zinc-800 px-3 py-1.5 rounded-full">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Sizes</h3>
              <button onClick={() => setShowSizeForm(!showSizeForm)} className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1">
                <Plus size={14} /> Add Size
              </button>
            </div>
            {showSizeForm && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text" placeholder="Size label (e.g. 3XL)" value={sizeForm}
                  onChange={(e) => setSizeForm(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                />
                <button onClick={handleAddSize} className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold">
                  Add
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <span key={s.id} className="text-xs bg-zinc-800 px-3 py-1.5 rounded-full">
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariantManager({
  productId,
  colors,
  sizes,
  variants,
  onUpdate,
}: {
  productId: string;
  colors: any[];
  sizes: any[];
  variants: ProductVariant[];
  onUpdate: () => void;
}) {
  const productVariants = variants.filter((v: any) => v.product_id === productId);
  const [editVariant, setEditVariant] = useState<{
    id: string;
    stock: number;
    price: number | null;
    sku: string;
  } | null>(null);

  const handleUpdateVariant = async () => {
    if (!editVariant) return;
    try {
      await fetch("/api/variants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editVariant),
      });
      setEditVariant(null);
      onUpdate();
    } catch (err) {
      console.error("Failed to update variant:", err);
    }
  };

  const handleCreateVariant = async (colorId: string, sizeId: string) => {
    try {
      const color = colors.find((c) => c.id === colorId);
      const size = sizes.find((s) => s.id === sizeId);
      await fetch("/api/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          colorId,
          sizeId,
          sku: `${productId.slice(0, 4)}-${colorId.slice(0, 4)}-${sizeId.slice(0, 4)}`.toUpperCase(),
          stock: 0,
        }),
      });
      onUpdate();
    } catch (err) {
      console.error("Failed to create variant:", err);
    }
  };

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Variants (Stock)</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-2 text-zinc-500 font-medium">Color</th>
              {sizes.map((s: any) => (
                <th key={s.id} className="text-center py-2 text-zinc-500 font-medium">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colors.filter((c: any) => c.product_id === productId).map((color: any) => (
              <tr key={color.id} className="border-b border-white/5">
                <td className="py-2 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color.hex }} />
                  {color.name}
                </td>
                {sizes.map((size: any) => {
                  const variant = productVariants.find(
                    (v: any) => v.color_id === color.id && v.size_id === size.id
                  );
                  return (
                    <td key={size.id} className="text-center py-2">
                      {variant ? (
                        <button
                          onClick={() =>
                            setEditVariant({
                              id: variant.id,
                              stock: variant.stock,
                              price: variant.price,
                              sku: variant.sku,
                            })
                          }
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition ${
                            variant.stock <= 0
                              ? "bg-red-500/10 text-red-400"
                              : variant.stock <= 5
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-green-500/10 text-green-400"
                          }`}
                        >
                          {variant.stock}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCreateVariant(color.id, size.id)}
                          className="text-zinc-600 hover:text-zinc-400 transition"
                          title="Create variant"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm">
            <h3 className="font-bold mb-4">Edit Variant Stock</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">SKU</label>
                <input
                  type="text" value={editVariant.sku} readOnly
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Stock</label>
                <input
                  type="number" value={editVariant.stock}
                  onChange={(e) => setEditVariant((v) => v ? { ...v, stock: Number(e.target.value) } : v)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Price Override (optional)</label>
                <input
                  type="number" value={editVariant.price ?? ""}
                  onChange={(e) => setEditVariant((v) => v ? { ...v, price: e.target.value ? Number(e.target.value) : null } : v)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleUpdateVariant} className="flex-1 bg-white text-black py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition">
                  Save
                </button>
                <button onClick={() => setEditVariant(null)} className="flex-1 border border-white/10 py-3 rounded-xl text-sm hover:bg-zinc-800 transition">
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

function StockControls({ v, updating, onUpdate }: {
  v: any;
  updating: boolean;
  onUpdate: (id: string, action: "increase" | "decrease") => void;
}) {
  const isNegative = v.stock < 0;
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => onUpdate(v.id, "decrease")}
        disabled={updating}
        className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-sm font-bold transition cursor-pointer"
      >−</button>
      <span className={`w-8 text-center font-bold ${
        isNegative ? "text-red-400" : v.stock <= 5 ? "text-yellow-400" : ""
      }`}>
        {updating ? (
          <Loader2 size={14} className="animate-spin inline-block" />
        ) : (
          v.stock
        )}
      </span>
      <button
        onClick={() => onUpdate(v.id, "increase")}
        disabled={updating}
        className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-sm font-bold transition cursor-pointer"
      >+</button>
      {isNegative && (
        <span className="text-xs text-red-400 ml-1 whitespace-nowrap">
          Need {Math.abs(v.stock)} items
        </span>
      )}
    </div>
  );
}

function InventoryTab() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingVariant, setUpdatingVariant] = useState<string | null>(null);
  const [bulkProductId, setBulkProductId] = useState("");
  const [bulkColorId, setBulkColorId] = useState("");
  const [bulkAmount, setBulkAmount] = useState(1);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [pRes, vRes, cRes, sRes] = await Promise.all([
          globalThis.fetch("/api/products"), globalThis.fetch("/api/variants"), globalThis.fetch("/api/colors"), globalThis.fetch("/api/sizes"),
        ]);
        const [pRaw, vRaw, cRaw, sRaw] = await Promise.all([
          pRes.json(), vRes.json(), cRes.json(), sRes.json(),
        ]);
        setProducts(Array.isArray(pRaw) ? pRaw : (pRaw.data || []));
        setVariants(Array.isArray(vRaw) ? vRaw : (vRaw.data || []));
        setColors(Array.isArray(cRaw) ? cRaw : (cRaw.data || []));
        setSizes(Array.isArray(sRaw) ? sRaw : (sRaw.data || []));
      } catch (err) { console.error("Failed to load inventory:", err); }
      setLoading(false);
    };
    loadData();
  }, []);

  const updateStock = async (variantId: string, action: "increase" | "decrease") => {
    setUpdatingVariant(variantId);
    try {
      const res = await fetch("/api/inventory/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variantId, action, amount: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update stock");
      setVariants((prev: any[]) =>
        prev.map((v: any) =>
          v.id === variantId ? { ...v, stock: data.new_stock } : v
        )
      );
      showToast(`Stock ${action === "increase" ? "increased" : "decreased"} to ${data.new_stock}`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update stock", "error");
    }
    setUpdatingVariant(null);
  };

  const updating = (id: string) => updatingVariant === id;

  const applyBulkStock = async () => {
    if (!bulkProductId || !bulkColorId || bulkAmount < 1) {
      showToast("Please select a product, color, and enter a valid amount", "error");
      return;
    }
    setBulkUpdating(true);
    try {
      const res = await fetch("/api/inventory/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: bulkProductId, color_id: bulkColorId, amount: bulkAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update stock");
      setVariants((prev: any[]) =>
        prev.map((v: any) => {
          const match = data.results?.find((r: any) => r.id === v.id);
          return match ? { ...v, stock: match.new_stock } : v;
        })
      );
      showToast(`Added ${bulkAmount} to ${data.updatedCount} variant(s)`, "success");
      setShowBulk(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update stock", "error");
    }
    setBulkUpdating(false);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;

  const lowStockVariants = variants
    .filter((v: any) => v.stock > 0 && v.stock <= 5)
    .sort((a: any, b: any) => a.stock - b.stock);
  const outOfStockVariants = variants.filter((v: any) => v.stock <= 0);
  const totalStock = variants.reduce((sum: number, v: any) => sum + v.stock, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Package size={24} />} label="Total Variants" value={variants.length} />
        <StatCard icon={<AlertTriangle size={24} />} label="Low Stock (≤5)" value={lowStockVariants.length} highlight={lowStockVariants.length > 0} />
        <StatCard icon={<AlertTriangle size={24} />} label="Out of Stock" value={outOfStockVariants.length} highlight={outOfStockVariants.length > 0} />
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-2xl">
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="w-full flex items-center justify-between p-4 text-sm font-medium transition hover:bg-white/5"
        >
          <span className="flex items-center gap-2"><Package size={16} /> Bulk Stock Update</span>
          <ChevronDown size={16} className={`transition-transform ${showBulk ? "rotate-180" : ""}`} />
        </button>
        {showBulk && (
          <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
            <div className="grid md:grid-cols-4 gap-3">
              <select
                value={bulkProductId}
                onChange={(e) => { setBulkProductId(e.target.value); setBulkColorId(""); }}
                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Product</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select
                value={bulkColorId}
                onChange={(e) => setBulkColorId(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select Color</option>
                {colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="number"
                min={1}
                value={bulkAmount}
                onChange={(e) => setBulkAmount(Math.max(1, Number(e.target.value)))}
                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={applyBulkStock}
                disabled={bulkUpdating}
                className="bg-white text-black rounded-lg px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {bulkUpdating ? <Loader2 size={14} className="animate-spin inline-block" /> : "Apply to All Sizes"}
              </button>
            </div>
          </div>
        )}
      </div>

      {outOfStockVariants.length > 0 && (
        <div>
          <h3 className="font-bold mb-3 text-red-400 flex items-center gap-2">
            <AlertTriangle size={16} /> Out of Stock
          </h3>
          <div className="space-y-2">
            {outOfStockVariants.map((v: any) => (
              <div key={v.id} className="bg-zinc-950 border border-red-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{v.product_colors?.name} / {v.product_sizes?.label}</p>
                  <p className="text-xs text-zinc-500">SKU: {v.sku}</p>
                </div>
                <StockControls v={v} updating={updating(v.id)} onUpdate={updateStock} />
              </div>
            ))}
          </div>
        </div>
      )}

      {lowStockVariants.length > 0 && (
        <div>
          <h3 className="font-bold mb-3 text-yellow-400 flex items-center gap-2">
            <AlertTriangle size={16} /> Low Stock
          </h3>
          <div className="space-y-2">
            {lowStockVariants.map((v: any) => (
              <div key={v.id} className="bg-zinc-950 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{v.product_colors?.name} / {v.product_sizes?.label}</p>
                  <p className="text-xs text-zinc-500">SKU: {v.sku}</p>
                </div>
                <StockControls v={v} updating={updating(v.id)} onUpdate={updateStock} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-bold mb-3">All Inventory</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 text-zinc-500 font-medium">Product</th>
                <th className="text-left py-3 text-zinc-500 font-medium">Color</th>
                <th className="text-left py-3 text-zinc-500 font-medium">Size</th>
                <th className="text-left py-3 text-zinc-500 font-medium">SKU</th>
                <th className="text-right py-3 text-zinc-500 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v: any) => (
                <tr key={v.id} className="border-b border-white/5">
                  <td className="py-3">Oversized Tee</td>
                  <td className="py-3">{v.product_colors?.name}</td>
                  <td className="py-3">{v.product_sizes?.label}</td>
                  <td className="py-3 text-zinc-500 text-xs font-mono">{v.sku}</td>
                  <td className="py-3 text-right">
                    <StockControls v={v} updating={updating(v.id)} onUpdate={updateStock} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RestockTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/restock");
        const data = await res.json();
        setItems(Array.isArray(data) ? data : (data.items || []));
      } catch (err) {
        console.error("Failed to load restock list:", err);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;

  const critical = items.filter((i: any) => i.stock_level === "critical_stock");
  const low = items.filter((i: any) => i.stock_level === "low_stock");

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Package size={24} />} label="Need Restock" value={items.length} highlight={items.length > 0} />
        <StatCard icon={<AlertTriangle size={24} />} label="Critical (≤ -5)" value={critical.length} highlight={critical.length > 0} />
        <StatCard icon={<AlertTriangle size={24} />} label="Low Stock (< 0)" value={low.length} highlight={low.length > 0} />
      </div>

      {critical.length > 0 && (
        <div>
          <h3 className="font-bold mb-3 text-red-400 flex items-center gap-2">
            <AlertTriangle size={16} /> Critical — Immediate Restock Needed
          </h3>
          <div className="space-y-2">
            {critical.map((v: any) => (
              <div key={v.id} className="bg-zinc-950 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{v.color} / {v.size}</p>
                    <p className="text-xs text-zinc-500">SKU: {v.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold">{v.stock}</p>
                    <p className="text-xs text-red-400">Need {v.missing} items</p>
                  </div>
                </div>
                <a
                  href={v.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs text-green-400 hover:text-green-300 transition"
                >
                  Send WhatsApp Alert →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {low.length > 0 && (
        <div>
          <h3 className="font-bold mb-3 text-yellow-400 flex items-center gap-2">
            <AlertTriangle size={16} /> Low Stock — Needs Restock
          </h3>
          <div className="space-y-2">
            {low.map((v: any) => (
              <div key={v.id} className="bg-zinc-950 border border-yellow-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{v.color} / {v.size}</p>
                    <p className="text-xs text-zinc-500">SKU: {v.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">{v.stock}</p>
                    <p className="text-xs text-yellow-400">Need {v.missing} items</p>
                  </div>
                </div>
                <a
                  href={v.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs text-green-400 hover:text-green-300 transition"
                >
                  Send WhatsApp Alert →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-16">
          <Package size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">All variants are fully stocked</p>
        </div>
      )}
    </div>
  );
}

function CustomersTab({ orders }: { orders: Order[] }) {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/customers");
        const raw = await res.json();
        setCustomers(Array.isArray(raw) ? raw : (raw.customers || []));
      } catch (err) {
        console.error("Failed to load customers:", err);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => b.totalSpent - a.totalSpent),
    [customers]
  );

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon={<Users size={24} />} label="Total Customers" value={customers.length} />
        <StatCard icon={<ShoppingBag size={24} />} label="Avg Orders/Customer" value={customers.length ? (orders.length / customers.length).toFixed(1) : 0} />
        <StatCard icon={<Wallet size={24} />} label="Avg Order Value" value={orders.length ? `${Math.round(orders.reduce((s, o) => s + (o.productTotal || 0), 0) / orders.length)} EGP` : "0"} />
      </div>

      <div className="space-y-2">
        {sortedCustomers.map((customer) => (
          <div key={customer.id} className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition"
              onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
            >
              <div>
                <p className="font-semibold">{customer.name}</p>
                <p className="text-zinc-500 text-xs">{customer.phone} {customer.email ? `· ${customer.email}` : ""}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{customer.totalSpent} EGP</p>
                <p className="text-zinc-500 text-xs">{customer.totalOrders} orders</p>
              </div>
            </div>
            {expandedCustomer === customer.id && (
              <div className="border-t border-white/5 px-4 py-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-500 text-xs">Total Orders</p>
                    <p className="font-bold">{customer.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs">Total Spent</p>
                    <p className="font-bold">{customer.totalSpent} EGP</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 text-xs">Last Order</p>
                    <p className="text-xs">{new Date(customer.lastOrder).toLocaleDateString("en-GB")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

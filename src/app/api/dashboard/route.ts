import { NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersErr) {
      const parsed = getResponseError(ordersErr);
      if (parsed.htmlResponse || parsed.tableNotFound) {
        console.error("[api/dashboard] Supabase unreachable or orders table missing:", parsed.cleanedMessage);
        return NextResponse.json({
          totalOrders: 0, totalRevenue: 0, productRevenue: 0, deliveryRevenue: 0, totalShipping: 0, totalCustomers: 0,
          totalProducts: 0, totalVariants: 0,
          lowStockVariants: 0, outOfStockVariants: 0, pendingOrders: 0,
          lowStockItems: [], outOfStockItems: [], recentOrders: [], revenueByMonth: [],
          todayRevenue: 0, monthlyRevenue: 0, completedOrders: 0,
          inventoryValue: 0, inventoryCost: 0, operatingExpenses: 0,
          totalExpenses: 0, grossProfit: 0, netProfit: 0, advertisingSpend: 0,
          avgOrderValue: 0,
        });
      }
      return NextResponse.json({ error: parsed.cleanedMessage, orders: [] }, { status: 200 });
    }

    function computeProductTotal(itemData: unknown): number {
      if (!itemData) return 0;
      const parsed = typeof itemData === "string" ? JSON.parse(itemData as string) : itemData;
      if (!Array.isArray(parsed)) return 0;
      return parsed.reduce(
        (sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + computeProductTotal(o.items), 0) || 0;
    const totalShipping = orders?.reduce((sum, o) => sum + (o.delivery ?? 0), 0) || 0;
    const deliveryRevenue = totalShipping;
    const customers = new Set(
      orders?.map((o) => o.phone || o.name || o.user_id).filter(Boolean)
    );
    const totalCustomers = customers.size;

    const todayRevenue = orders
      ?.filter((o) => o.created_at >= todayStart && o.status !== "cancelled")
      .reduce((sum, o) => sum + computeProductTotal(o.items), 0) || 0;

    const monthlyRevenue = orders
      ?.filter((o) => o.created_at >= monthStart && o.status !== "cancelled")
      .reduce((sum, o) => sum + computeProductTotal(o.items), 0) || 0;

    const completedOrders = orders?.filter((o) => o.status === "completed").length || 0;
    const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;

    let products: any[] = [];
    let variants: any[] = [];

    try {
      const { data: pData, error: pErr } = await admin
        .from("products")
        .select("id, name");
      if (!pErr) products = pData || [];
    } catch { /* products table may not exist */ }

    try {
      const { data: vData, error: vErr } = await admin
        .from("product_variants")
        .select("*, product_colors(name), product_sizes(label)")
        .order("stock", { ascending: true });
      if (!vErr) variants = vData || [];
    } catch { /* variants table may not exist */ }

    const lowStockVariants = variants?.filter((v) => v.stock > 0 && v.stock <= 5) || [];
    const outOfStockVariants = variants?.filter((v) => v.stock <= 0) || [];
    const totalVariants = variants?.length || 0;
    const totalProducts = products?.length || 0;

    const inventoryValue = variants?.reduce((sum, v) => sum + ((v.stock || 0) * (v.cost_price || 0)), 0) || 0;

    // --- Monthly Inventory Cost from purchase_items ---
    let monthlyInventoryCost = 0;
    try {
      const { data: piData, error: piErr } = await admin
        .from("purchase_items")
        .select("total_cost, created_at")
        .gte("created_at", `${monthStart.slice(0, 10)}T00:00:00`);
      if (!piErr && piData) {
        monthlyInventoryCost = piData.reduce((sum, pi) => sum + (pi.total_cost || 0), 0);
      }
    } catch { /* purchase_items table may not exist */ }

    // --- Expenses ---
    let expenses: any[] = [];
    try {
      const { data: eData, error: eErr } = await admin
        .from("expenses")
        .select("*");
      if (!eErr) expenses = eData || [];
    } catch { /* expenses table may not exist */ }

    const monthExpenses = expenses
      ?.filter((e) => e.date >= monthStart.slice(0, 10))
      .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    const advertisingSpend = expenses
      ?.filter((e) => ["Facebook Ads", "Instagram Ads", "TikTok Ads", "Google Ads"].includes(e.category))
      .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // --- Derived monthly calculations ---
    const operatingExpenses = monthExpenses;
    const monthlyTotalExpenses = monthlyInventoryCost + operatingExpenses;
    const grossProfit = monthlyRevenue - monthlyInventoryCost;
    const netProfit = monthlyRevenue - monthlyInventoryCost - operatingExpenses;
    const avgOrderValue = completedOrders > 0 ? monthlyRevenue / completedOrders : 0;

    const monthlyRevMap: Record<string, number> = {};
    orders?.forEach((o) => {
      if (o.status !== "cancelled") {
        const month = o.created_at?.slice(0, 7);
        if (month) {
          monthlyRevMap[month] = (monthlyRevMap[month] || 0) + computeProductTotal(o.items);
        }
      }
    });

    const revenueByMonth = Object.entries(monthlyRevMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));

    const recentOrders = orders?.slice(0, 10) || [];

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      productRevenue: totalRevenue,
      deliveryRevenue,
      totalShipping,
      totalCustomers,
      totalProducts,
      totalVariants,
      lowStockVariants: lowStockVariants.length,
      outOfStockVariants: outOfStockVariants.length,
      pendingOrders,
      completedOrders,
      lowStockItems: lowStockVariants,
      outOfStockItems: outOfStockVariants,
      recentOrders,
      revenueByMonth,
      todayRevenue,
      monthlyRevenue,
      inventoryValue,
      inventoryCost: monthlyInventoryCost,
      operatingExpenses,
      totalExpenses: monthlyTotalExpenses,
      grossProfit,
      netProfit,
      advertisingSpend,
      avgOrderValue,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

const PERIOD_ALIASES: Record<string, string> = {
  today: "today",
  week: "week",
  this_week: "week",
  month: "month",
  this_month: "month",
  lastMonth: "lastMonth",
  last_month: "lastMonth",
  year: "year",
  this_year: "year",
  custom: "custom",
  all: "all",
};

function emptySummary() {
  return {
    totalRevenue: 0,
    productRevenue: 0,
    deliveryRevenue: 0,
    inventoryCost: 0,
    operatingExpenses: 0,
    totalExpenses: 0,
    grossProfit: 0,
    netProfit: 0,
    inventoryValue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
  };
}

function getDateRange(period: string, startDate?: string, endDate?: string): { start: string; end: string } {
  const now = new Date();
  const end = endDate || now.toISOString().split("T")[0];

  switch (period) {
    case "today": {
      const d = now.toISOString().split("T")[0];
      return { start: d, end: d };
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      return { start: start.toISOString().split("T")[0], end };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: start.toISOString().split("T")[0], end };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: start.toISOString().split("T")[0], end: endDate.toISOString().split("T")[0] };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: start.toISOString().split("T")[0], end };
    }
    case "custom":
      return { start: startDate || "2000-01-01", end };
    case "all":
    default:
      return { start: "2000-01-01", end };
  }
}

function getBucket(date: string, rangeDays: number): string {
  if (rangeDays <= 31) return date;
  if (rangeDays <= 90) {
    const d = new Date(date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    return weekStart.toISOString().split("T")[0];
  }
  return date.slice(0, 7);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.max(1, Math.round((db.getTime() - da.getTime()) / 86400000) + 1);
}

export async function GET(request: NextRequest) {
  const rawPeriod = new URL(request.url).searchParams.get("period") || "all";
  const period = PERIOD_ALIASES[rawPeriod] || "all";
  const startDate = new URL(request.url).searchParams.get("startDate") || undefined;
  const endDate = new URL(request.url).searchParams.get("endDate") || undefined;

  try {
    const { start, end } = getDateRange(period, startDate, endDate);
    const rangeDays = daysBetween(start, end);

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      const msg = configErr instanceof Error ? configErr.message : "Supabase not configured";
      console.error("[api/reports] Config error:", msg);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // --- Orders (Revenue) ---
    let productRevenue = 0;
    let deliveryRevenue = 0;
    let totalOrders = 0;
    let revenueOverTime: { date: string; value: number }[] = [];
    let deliveryRevenueOverTime: { date: string; value: number }[] = [];
    let ordersOverTime: { date: string; value: number }[] = [];

    function computeProductTotal(items: unknown): number {
      if (!items) return 0;
      const parsed = typeof items === "string" ? JSON.parse(items as string) : items;
      if (!Array.isArray(parsed)) return 0;
      return parsed.reduce(
        (sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
    }

    const { data: orderData, error: orderErr } = await admin
      .from("orders")
      .select("items, delivery, created_at, status")
      .eq("status", "completed")
      .gte("created_at", `${start}T00:00:00`)
      .lte("created_at", `${end}T23:59:59`)
      .order("created_at", { ascending: true });

    if (orderErr) {
      console.error("[api/reports] Orders query error:", orderErr.message);
    } else if (orderData) {
      totalOrders = orderData.length;
      const revBuckets: Record<string, number> = {};
      const delBuckets: Record<string, number> = {};
      const ordBuckets: Record<string, number> = {};
      for (const o of orderData) {
        const rev = computeProductTotal(o.items);
        const delivery = o.delivery ?? 0;
        productRevenue += rev;
        deliveryRevenue += delivery;
        const bucket = getBucket(o.created_at?.split("T")[0] || "", rangeDays);
        revBuckets[bucket] = (revBuckets[bucket] || 0) + rev;
        delBuckets[bucket] = (delBuckets[bucket] || 0) + delivery;
        ordBuckets[bucket] = (ordBuckets[bucket] || 0) + 1;
      }
      revenueOverTime = Object.entries(revBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
      deliveryRevenueOverTime = Object.entries(delBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
      ordersOverTime = Object.entries(ordBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
    }

    // --- Inventory Cost (from purchase_items) ---
    let inventoryCost = 0;
    let inventoryCostOverTime: { date: string; value: number }[] = [];
    const { data: purchaseItemsData, error: purchaseItemsErr } = await admin
      .from("purchase_items")
      .select("total_cost, created_at")
      .gte("created_at", `${start}T00:00:00`)
      .lte("created_at", `${end}T23:59:59`)
      .order("created_at", { ascending: true });

    if (purchaseItemsErr) {
      console.error("[api/reports] purchase_items query error:", purchaseItemsErr.message);
    } else if (purchaseItemsData) {
      inventoryCost = purchaseItemsData.reduce((sum, pi) => sum + (pi.total_cost || 0), 0);
      const icBuckets: Record<string, number> = {};
      for (const pi of purchaseItemsData) {
        const bucket = getBucket(pi.created_at?.split("T")[0] || "", rangeDays);
        icBuckets[bucket] = (icBuckets[bucket] || 0) + (pi.total_cost || 0);
      }
      inventoryCostOverTime = Object.entries(icBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
    }

    // --- Operating Expenses (from expenses table) ---
    let operatingExpenses = 0;
    let expensesOverTime: { date: string; value: number }[] = [];
    const { data: expenseData, error: expenseErr } = await admin
      .from("expenses")
      .select("amount, date")
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (expenseErr) {
      console.error("[api/reports] Expenses query error:", expenseErr.message);
    } else if (expenseData) {
      operatingExpenses = expenseData.reduce((sum, e) => sum + (e.amount || 0), 0);
      const expBuckets: Record<string, number> = {};
      for (const e of expenseData) {
        const bucket = getBucket(e.date || "", rangeDays);
        expBuckets[bucket] = (expBuckets[bucket] || 0) + (e.amount || 0);
      }
      expensesOverTime = Object.entries(expBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
    }

    // --- Inventory Value (current stock × cost_price) ---
    let inventoryValue = 0;
    const { data: variantData, error: variantErr } = await admin
      .from("product_variants")
      .select("stock, cost_price")
      .gt("cost_price", 0);

    if (variantErr) {
      console.error("[api/reports] Variants query error:", variantErr.message);
    } else if (variantData) {
      inventoryValue = variantData.reduce((sum, v) => sum + ((v.stock || 0) * v.cost_price), 0);
    }

    // --- Derived calculations ---
    const totalRevenue = productRevenue;
    const totalExpenses = inventoryCost + operatingExpenses;
    const grossProfit = productRevenue - inventoryCost;
    const netProfit = productRevenue - inventoryCost - operatingExpenses;
    const averageOrderValue = totalOrders > 0 ? productRevenue / totalOrders : 0;

    // --- Profit Over Time ---
    const profitBuckets: Record<string, number> = {};
    for (const r of revenueOverTime) {
      profitBuckets[r.date] = (profitBuckets[r.date] || 0) + r.value;
    }
    for (const ic of inventoryCostOverTime) {
      profitBuckets[ic.date] = (profitBuckets[ic.date] || 0) - ic.value;
    }
    for (const e of expensesOverTime) {
      profitBuckets[e.date] = (profitBuckets[e.date] || 0) - e.value;
    }
    const profitOverTime = Object.entries(profitBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));

    return NextResponse.json({
      summary: {
        ...emptySummary(),
        totalRevenue,
        productRevenue,
        deliveryRevenue,
        inventoryCost,
        operatingExpenses,
        totalExpenses,
        grossProfit,
        netProfit,
        inventoryValue,
        totalOrders,
        avgOrderValue: averageOrderValue,
      },
      revenueOverTime,
      deliveryRevenueOverTime,
      inventoryCostOverTime,
      expensesOverTime,
      ordersOverTime,
      profitOverTime,
      period: rawPeriod,
      dateRange: { start, end },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/reports] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

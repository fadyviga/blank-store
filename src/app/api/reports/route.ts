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
    totalExpenses: 0,
    inventoryCost: 0,
    grossProfit: 0,
    netProfit: 0,
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

    let revenue = 0;
    let totalOrders = 0;
    let revenueOverTime: { date: string; value: number }[] = [];
    let ordersOverTime: { date: string; value: number }[] = [];

    const { data: orderData, error: orderErr } = await admin
      .from("orders")
      .select("total, created_at, status")
      .eq("status", "completed")
      .gte("created_at", `${start}T00:00:00`)
      .lte("created_at", `${end}T23:59:59`)
      .order("created_at", { ascending: true });

    if (orderErr) {
      console.error("[api/reports] Orders query error:", orderErr.message);
    } else if (orderData) {
      totalOrders = orderData.length;
      revenue = orderData.reduce((sum, o) => sum + (o.total || 0), 0);

      const revBuckets: Record<string, number> = {};
      const ordBuckets: Record<string, number> = {};
      for (const o of orderData) {
        const bucket = getBucket(o.created_at?.split("T")[0] || "", rangeDays);
        revBuckets[bucket] = (revBuckets[bucket] || 0) + (o.total || 0);
        ordBuckets[bucket] = (ordBuckets[bucket] || 0) + 1;
      }
      revenueOverTime = Object.entries(revBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
      ordersOverTime = Object.entries(ordBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
    }

    let cogs = 0;
    const { data: purchaseData, error: purchaseErr } = await admin
      .from("purchases")
      .select("total_cost, created_at")
      .gte("created_at", `${start}T00:00:00`)
      .lte("created_at", `${end}T23:59:59`);

    if (purchaseErr) {
      console.error("[api/reports] Purchases query error:", purchaseErr.message);
    } else if (purchaseData) {
      cogs = purchaseData.reduce((sum, p) => sum + (p.total_cost || 0), 0);
    }

    let expenses = 0;
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
      expenses = expenseData.reduce((sum, e) => sum + (e.amount || 0), 0);

      const expBuckets: Record<string, number> = {};
      for (const e of expenseData) {
        const bucket = getBucket(e.date || "", rangeDays);
        expBuckets[bucket] = (expBuckets[bucket] || 0) + (e.amount || 0);
      }
      expensesOverTime = Object.entries(expBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }));
    }

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

    const grossProfit = revenue - cogs;
    const netProfit = revenue - cogs - expenses;
    const averageOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    return NextResponse.json({
      summary: {
        ...emptySummary(),
        totalRevenue: revenue,
        totalExpenses: expenses,
        inventoryCost: inventoryValue,
        grossProfit,
        netProfit,
        totalOrders,
        avgOrderValue: averageOrderValue,
      },
      revenueOverTime,
      expensesOverTime,
      ordersOverTime,
      period: rawPeriod,
      dateRange: { start, end },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/reports] Unhandled error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

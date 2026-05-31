import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

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
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const { start, end } = getDateRange(period, startDate, endDate);
    const rangeDays = daysBetween(start, end);

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      const msg = configErr instanceof Error ? configErr.message : "Supabase not configured";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // 1. Revenue — completed orders in range
    let revenue = 0;
    let totalOrders = 0;
    let orders: any[] = [];
    let revenueOverTime: { date: string; value: number }[] = [];
    let ordersOverTime: { date: string; value: number }[] = [];

    try {
      const { data, error } = await admin
        .from("orders")
        .select("total, created_at, status")
        .eq("status", "completed")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`)
        .order("created_at", { ascending: true });

      if (!error && data) {
        orders = data;
        totalOrders = data.length;
        revenue = data.reduce((sum, o) => sum + (o.total || 0), 0);

        const revBuckets: Record<string, number> = {};
        const ordBuckets: Record<string, number> = {};
        for (const o of data) {
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
    } catch {
      // orders table may not exist
    }

    // 2. COGS — purchases in range
    let cogs = 0;
    try {
      const { data, error } = await admin
        .from("purchases")
        .select("total_cost, created_at")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`);

      if (!error && data) {
        cogs = data.reduce((sum, p) => sum + (p.total_cost || 0), 0);
      }
    } catch {
      // purchases table may not exist
    }

    // 3. Expenses in range
    let expenses = 0;
    let expensesOverTime: { date: string; value: number }[] = [];
    try {
      const { data, error } = await admin
        .from("expenses")
        .select("amount, date")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true });

      if (!error && data) {
        expenses = data.reduce((sum, e) => sum + (e.amount || 0), 0);

        const expBuckets: Record<string, number> = {};
        for (const e of data) {
          const bucket = getBucket(e.date || "", rangeDays);
          expBuckets[bucket] = (expBuckets[bucket] || 0) + (e.amount || 0);
        }
        expensesOverTime = Object.entries(expBuckets)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, value]) => ({ date, value }));
      }
    } catch {
      // expenses table may not exist
    }

    // 4. Inventory Value
    let inventoryValue = 0;
    try {
      const { data, error } = await admin
        .from("product_variants")
        .select("stock, cost_price")
        .gt("cost_price", 0);

      if (!error && data) {
        inventoryValue = data.reduce((sum, v) => sum + ((v.stock || 0) * v.cost_price), 0);
      }
    } catch {
      // product_variants table may not exist
    }

    const grossProfit = revenue - cogs;
    const netProfit = revenue - cogs - expenses;
    const averageOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    return NextResponse.json({
      revenue,
      cogs,
      expenses,
      inventoryValue,
      grossProfit,
      netProfit,
      totalOrders,
      averageOrderValue,
      revenueOverTime,
      expensesOverTime,
      ordersOverTime,
      period,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

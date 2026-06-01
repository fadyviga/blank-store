import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

const PERIOD_ALIASES: Record<string, string> = {
  this_month: "month",
  last_month: "lastMonth",
  this_year: "year",
  custom: "custom",
};

function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  const end = endDate || now.toISOString().split("T")[0];
  switch (period) {
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
    default:
      return { start: "2000-01-01", end };
  }
}

export async function GET(request: NextRequest) {
  try {
    const rawPeriod = new URL(request.url).searchParams.get("period") || "this_month";
    const period = PERIOD_ALIASES[rawPeriod] || "month";
    const startDate = new URL(request.url).searchParams.get("startDate") || undefined;
    const endDate = new URL(request.url).searchParams.get("endDate") || undefined;
    const { start, end } = getDateRange(period, startDate, endDate);

    const admin = getAdminClient();

    // --- All-time partner capital (calculator-style: not period-filtered) ---
    const { data: partnerTx } = await admin
      .from("partner_transactions")
      .select("partner_id, amount, type")
      .eq("is_test", false);

    const grossDeposits: Record<string, number> = {};
    const grossWithdrawals: Record<string, number> = {};
    let totalDeposits = 0;
    let totalPartnerWithdrawals = 0;

    for (const tx of partnerTx || []) {
      const pid = tx.partner_id;
      const amt = Number(tx.amount);
      if (tx.type === "deposit") {
        grossDeposits[pid] = (grossDeposits[pid] || 0) + amt;
        totalDeposits += amt;
      } else {
        grossWithdrawals[pid] = (grossWithdrawals[pid] || 0) + amt;
        totalPartnerWithdrawals += amt;
      }
    }
    const partnerCapital = totalDeposits - totalPartnerWithdrawals;

    // --- Period-specific net revenue ---
    const { data: orders } = await admin
      .from("orders")
      .select("subtotal, discount_amount")
      .eq("status", "completed")
      .gte("created_at", `${start}T00:00:00`)
      .lte("created_at", `${end}T23:59:59`);

    const totalNetRevenue = (orders || []).reduce(
      (sum, o) => sum + (Number(o.subtotal) || 0) - (Number(o.discount_amount) || 0),
      0
    );

    // --- Period-specific purchases ---
    const { data: purchases } = await admin
      .from("purchases")
      .select("total_cost")
      .gte("created_at", `${start}T00:00:00`)
      .lte("created_at", `${end}T23:59:59`);

    const totalPurchases = (purchases || []).reduce(
      (sum, p) => sum + (Number(p.total_cost) || 0),
      0
    );

    // --- Period-specific expenses ---
    const { data: expenses } = await admin
      .from("expenses")
      .select("amount")
      .gte("date", start)
      .lte("date", end);

    const totalExpenses = (expenses || []).reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    // --- Period-specific partner withdrawals ---
    const { data: periodWithdrawals } = await admin
      .from("partner_transactions")
      .select("amount")
      .eq("type", "withdraw")
      .eq("is_test", false)
      .gte("date", `${start}T00:00:00`)
      .lte("date", `${end}T23:59:59`);

    const periodWithdrawalsTotal = (periodWithdrawals || []).reduce(
      (sum, w) => sum + (Number(w.amount) || 0),
      0
    );

    // --- Derived ---
    const netProfit = totalNetRevenue - totalPurchases - totalExpenses;
    const cashBalance = partnerCapital + netProfit - totalPartnerWithdrawals;

    // --- Partner Accounting ---
    const { data: partnersRaw } = await admin.from("partners").select("id, name");
    const partnersMap: Record<string, string> = {};
    for (const p of partnersRaw || []) {
      partnersMap[p.id] = (p as { name: string }).name;
    }

    const partnerAccounting = Object.keys(partnersMap).map((pid) => {
      const deposits = grossDeposits[pid] || 0;
      const withdrawals = grossWithdrawals[pid] || 0;
      const capital = deposits - withdrawals;
      const ownershipPct = partnerCapital > 0 ? capital / partnerCapital : 0;
      const profitShare = netProfit > 0 ? netProfit * ownershipPct : 0;
      return {
        partnerId: pid,
        partnerName: partnersMap[pid] || "Unknown",
        currentCapital: capital,
        ownershipPercentage: ownershipPct,
        deposits,
        withdrawals,
        profitShare,
        totalValue: capital + profitShare,
      };
    });

    return NextResponse.json({
      period: rawPeriod,
      dateRange: { start, end },
      cashBalance,
      partnerCapital,
      totalNetRevenue,
      totalPurchases,
      totalExpenses,
      totalPartnerWithdrawals,
      periodWithdrawalsTotal,
      netProfit,
      partnerAccounting,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

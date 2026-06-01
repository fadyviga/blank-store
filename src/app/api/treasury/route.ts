import { NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const admin = getAdminClient();

    // --- Partner Capital ---
    const { data: partnerTx, error: pErr } = await admin
      .from("partner_transactions")
      .select("partner_id, amount, type, date, created_at");
    if (pErr) {
      const parsed = getResponseError(pErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    const grossDeposits: Record<string, number> = {};
    const grossWithdrawals: Record<string, number> = {};
    let totalDeposits = 0;
    let totalPartnerWithdrawals = 0;

    for (const tx of partnerTx || []) {
      const partnerId = tx.partner_id;
      const amt = Number(tx.amount);
      if (tx.type === "deposit") {
        grossDeposits[partnerId] = (grossDeposits[partnerId] || 0) + amt;
        totalDeposits += amt;
      } else {
        grossWithdrawals[partnerId] = (grossWithdrawals[partnerId] || 0) + amt;
        totalPartnerWithdrawals += amt;
      }
    }

    const partnerCapital = totalDeposits - totalPartnerWithdrawals;

    // --- Net Revenue from completed orders ---
    const { data: orders, error: oErr } = await admin
      .from("orders")
      .select("subtotal, discount_amount")
      .eq("status", "completed");
    if (oErr) {
      const parsed = getResponseError(oErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    const totalNetRevenue = (orders || []).reduce(
      (sum, o) => sum + (Number(o.subtotal) || 0) - (Number(o.discount_amount) || 0),
      0
    );

    // --- Purchases ---
    const { data: purchases, error: puErr } = await admin
      .from("purchases")
      .select("total_cost");
    if (puErr) {
      const parsed = getResponseError(puErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    const totalPurchases = (purchases || []).reduce(
      (sum, p) => sum + (Number(p.total_cost) || 0),
      0
    );

    // --- Expenses ---
    const { data: expenses, error: eErr } = await admin
      .from("expenses")
      .select("amount");
    if (eErr) {
      const parsed = getResponseError(eErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    const totalExpenses = (expenses || []).reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    // --- Derived calculations ---
    const netProfit = totalNetRevenue - totalPurchases - totalExpenses;
    const cashBalance = partnerCapital + netProfit - totalPartnerWithdrawals;

    // --- Partner Accounting ---
    const partnersList: Record<string, { name: string }> = {};
    const { data: partnersRaw } = await admin.from("partners").select("id, name");
    for (const p of partnersRaw || []) {
      partnersList[p.id] = p as { name: string };
    }

    const partnerAccounting = Object.keys(partnersList).map((pid) => {
      const deposits = grossDeposits[pid] || 0;
      const withdrawals = grossWithdrawals[pid] || 0;
      const capital = deposits - withdrawals;
      const ownershipPct = partnerCapital > 0 ? capital / partnerCapital : 0;
      const profitShare = netProfit > 0 ? netProfit * ownershipPct : 0;
      const totalValue = capital + profitShare;
      return {
        partnerId: pid,
        partnerName: partnersList[pid]?.name || "Unknown",
        currentCapital: capital,
        ownershipPercentage: ownershipPct,
        deposits,
        withdrawals,
        profitShare,
        totalValue,
      };
    });

    return NextResponse.json({
      cashBalance,
      partnerCapital,
      totalNetRevenue,
      totalPurchases,
      totalExpenses,
      totalPartnerWithdrawals,
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

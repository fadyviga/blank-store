import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodStart, periodEnd, netProfit } = body;

    if (!periodStart || !periodEnd) {
      return NextResponse.json({ error: "periodStart and periodEnd are required" }, { status: 400 });
    }
    if (netProfit === undefined || netProfit === null) {
      return NextResponse.json({ error: "netProfit is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: partners, error: pErr } = await admin
      .from("partners")
      .select("id, name");

    if (pErr) {
      const parsed = getResponseError(pErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({ error: "No partners found" }, { status: 400 });
    }

    const { data: allTx } = await admin
      .from("partner_capital_transactions")
      .select("partner_id, amount")
      .lte("transaction_date", periodStart);

    const capitalByPartner: Record<string, number> = {};
    let totalCapital = 0;
    for (const tx of allTx || []) {
      capitalByPartner[tx.partner_id] = (capitalByPartner[tx.partner_id] || 0) + Number(tx.amount);
      totalCapital += Number(tx.amount);
    }

    const distributions = partners.map((partner) => {
      const partnerCapital = capitalByPartner[partner.id] || 0;
      const ownershipPct = totalCapital > 0 ? partnerCapital / totalCapital : 0;
      return {
        partner_id: partner.id,
        period_start: periodStart,
        period_end: periodEnd,
        net_profit: Number(netProfit),
        ownership_percentage: Math.round(ownershipPct * 10000) / 10000,
        profit_share: Number((Number(netProfit) * ownershipPct).toFixed(2)),
      };
    });

    const { data: inserted, error: insErr } = await admin
      .from("profit_distributions")
      .insert(distributions)
      .select("*, partners(name)");

    if (insErr) {
      const parsed = getResponseError(insErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}

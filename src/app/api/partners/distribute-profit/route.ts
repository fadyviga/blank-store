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
      .select("partner_id, amount, type")
      .lte("created_at", periodEnd);

    const capitalByPartner: Record<string, number> = {};
    let totalCapital = 0;
    for (const tx of allTx || []) {
      const delta = tx.type === "deposit" ? Number(tx.amount) : -Number(tx.amount);
      capitalByPartner[tx.partner_id] = (capitalByPartner[tx.partner_id] || 0) + delta;
      totalCapital += delta;
    }

    const result = partners.map((partner) => {
      const partnerCapital = capitalByPartner[partner.id] || 0;
      const ownershipPct = totalCapital > 0 ? partnerCapital / totalCapital : 0;
      return {
        partner_id: partner.id,
        partner_name: partner.name,
        capital: partnerCapital,
        ownershipPercentage: ownershipPct,
        profitShare: Number((Number(netProfit) * ownershipPct).toFixed(2)),
      };
    });

    return NextResponse.json({
      periodStart,
      periodEnd,
      netProfit: Number(netProfit),
      totalCapital,
      distributions: result,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}

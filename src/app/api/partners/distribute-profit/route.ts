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

    // Get all partners
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

    // For each partner, find the capital snapshot that covers periodStart
    const distributions: {
      partner_id: string;
      period_start: string;
      period_end: string;
      net_profit: number;
      ownership_percentage: number;
      profit_share: number;
    }[] = [];

    for (const partner of partners) {
      // Find the snapshot active at periodStart:
      // effective_from <= periodStart AND (effective_to IS NULL OR effective_to >= periodEnd)
      // We want the one with the LATEST effective_from that is still <= periodStart
      const { data: snapshots, error: snapErr } = await admin
        .from("capital_snapshots")
        .select("capital, ownership_percentage, effective_from, effective_to")
        .eq("partner_id", partner.id)
        .lte("effective_from", periodStart)
        .or(`effective_to.is.null,effective_to.gte.${periodEnd}`)
        .order("effective_from", { ascending: false })
        .limit(1);

      if (snapErr) {
        const parsed = getResponseError(snapErr);
        return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
      }

      const snapshot = snapshots?.[0];
      const ownershipPct = snapshot?.ownership_percentage ?? 0;
      const profitShare = Number((Number(netProfit) * ownershipPct).toFixed(2));

      distributions.push({
        partner_id: partner.id,
        period_start: periodStart,
        period_end: periodEnd,
        net_profit: Number(netProfit),
        ownership_percentage: ownershipPct,
        profit_share: profitShare,
      });
    }

    // Insert all distributions
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

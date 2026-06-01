import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: partners, error } = await admin
      .from("partners")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ data: [], warning: "Partners table not found. Run the migration." });
      }
      return NextResponse.json({ error: parsed.cleanedMessage, data: [] }, { status: 200 });
    }

    const { data: allTx } = await admin
      .from("partner_capital_transactions")
      .select("partner_id, amount");

    const { data: allProfitDist } = await admin
      .from("profit_distributions")
      .select("profit_share, partner_id");

    const { data: latestTx } = await admin
      .from("partner_capital_transactions")
      .select("partner_id, transaction_date")
      .order("transaction_date", { ascending: false });

    const capitalByPartner: Record<string, number> = {};
    let totalCapital = 0;
    for (const tx of allTx || []) {
      capitalByPartner[tx.partner_id] = (capitalByPartner[tx.partner_id] || 0) + Number(tx.amount);
      totalCapital += Number(tx.amount);
    }

    const profitByPartner: Record<string, number> = {};
    for (const d of allProfitDist || []) {
      profitByPartner[d.partner_id] = (profitByPartner[d.partner_id] || 0) + Number(d.profit_share);
    }

    const latestTxByPartner: Record<string, string> = {};
    for (const tx of latestTx || []) {
      if (!latestTxByPartner[tx.partner_id]) {
        latestTxByPartner[tx.partner_id] = tx.transaction_date;
      }
    }

    const enriched = (partners || []).map((partner) => {
      const currentCapital = capitalByPartner[partner.id] || 0;
      return {
        ...partner,
        currentCapital,
        ownershipPercentage: totalCapital > 0 ? currentCapital / totalCapital : 0,
        totalProfitEarned: profitByPartner[partner.id] || 0,
        lastUpdated: latestTxByPartner[partner.id] || partner.created_at,
        hasTransactions: currentCapital > 0,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error", data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, initialCapital, initialCapitalDate, initialCapitalNote } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Partner name is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("partners")
      .select("id")
      .eq("name", name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A partner with this name already exists" }, { status: 409 });
    }

    const { data: partner, error: createErr } = await admin
      .from("partners")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (createErr) {
      const parsed = getResponseError(createErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (initialCapital && Number(initialCapital) > 0) {
      const capitalAmount = Number(initialCapital);
      const date = initialCapitalDate || new Date().toISOString().slice(0, 10);

      await admin
        .from("partner_capital_transactions")
        .insert({
          partner_id: partner.id,
          type: "initial",
          amount: capitalAmount,
          note: initialCapitalNote || "Initial capital",
          transaction_date: date,
        });
    }

    return NextResponse.json(partner, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}

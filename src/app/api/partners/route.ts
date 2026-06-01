import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { computeCapital, getLatestSnapshot, generateSnapshot, getTransactionsByPartner } from "./_utils";

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

    const txPartnerIds = await getTransactionsByPartner(admin);
    const snapshot = await getLatestSnapshot(admin);

    let capitalByPartner: Record<string, number> = {};
    let totalCapital = 0;

    if (snapshot) {
      totalCapital = Number(snapshot.total_capital);
      for (const item of snapshot.items) {
        capitalByPartner[item.partner_id] = Number(item.capital);
      }
    } else {
      const computed = await computeCapital(admin);
      capitalByPartner = computed.capitalByPartner;
      totalCapital = computed.totalCapital;
    }

    const enriched = (partners || []).map((partner) => {
      const currentCapital = capitalByPartner[partner.id] || 0;
      return {
        ...partner,
        currentCapital,
        ownershipPercentage: totalCapital > 0 ? currentCapital / totalCapital : 0,
        hasTransactions: txPartnerIds.has(partner.id),
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error", data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { name, initialCapital } = body;

    if (!name || !(name as string).trim()) {
      return NextResponse.json({ error: "Partner name is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: existing } = await admin
      .from("partners")
      .select("id")
      .eq("name", (name as string).trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A partner with this name already exists" }, { status: 409 });
    }

    const { data: partner, error: createErr } = await admin
      .from("partners")
      .insert({ name: (name as string).trim() })
      .select()
      .single();

    if (createErr) {
      const parsed = getResponseError(createErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (initialCapital && Number(initialCapital) > 0) {
      const { error: txErr } = await admin
        .from("partner_transactions")
        .insert({
          partner_id: partner.id,
          type: "deposit",
          amount: Number(initialCapital),
        });

      if (txErr) {
        const parsed = getResponseError(txErr);
        return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
      }
    }

    await generateSnapshot(admin);

    return NextResponse.json(partner, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) || "Server error" }, { status: 400 });
  }
}

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

    const enriched = await Promise.all(
      (partners || []).map(async (partner) => {
        const { data: snapshots } = await admin
          .from("capital_snapshots")
          .select("capital, ownership_percentage, created_at")
          .eq("partner_id", partner.id)
          .eq("is_current", true)
          .maybeSingle();

        const { data: distributions } = await admin
          .from("profit_distributions")
          .select("profit_share, partner_id");

        const totalProfitEarned = (distributions || [])
          .filter((d) => d.partner_id === partner.id)
          .reduce((sum, d) => sum + (d.profit_share || 0), 0);

        const { data: contributions } = await admin
          .from("partner_contributions")
          .select("created_at")
          .eq("partner_id", partner.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const { data: contribCount } = await admin
          .from("partner_contributions")
          .select("id", { count: "exact", head: true })
          .eq("partner_id", partner.id);

        return {
          ...partner,
          currentCapital: snapshots?.capital ?? 0,
          ownershipPercentage: snapshots?.ownership_percentage ?? 0,
          totalProfitEarned,
          lastUpdated: contributions?.[0]?.created_at || snapshots?.created_at || partner.created_at,
          hasTransactions: (contribCount?.length ?? 0) > 0,
        };
      })
    );

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

    // Check for duplicate name
    const { data: existing } = await admin
      .from("partners")
      .select("id")
      .eq("name", name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A partner with this name already exists" }, { status: 409 });
    }

    // Create partner
    const { data: partner, error: createErr } = await admin
      .from("partners")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (createErr) {
      const parsed = getResponseError(createErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    // If initialCapital > 0, create contribution and snapshot
    if (initialCapital && Number(initialCapital) > 0) {
      const capitalAmount = Number(initialCapital);
      const date = initialCapitalDate || new Date().toISOString().slice(0, 10);

      // Get all existing partners for ownership recalculation
      const { data: allPartners } = await admin
        .from("partners")
        .select("id");

      // Get current snapshots for all existing partners
      const currentSnapshots: Record<string, { id: string; capital: number }> = {};
      for (const p of allPartners || []) {
        if (p.id === partner.id) continue;
        const { data: snap } = await admin
          .from("capital_snapshots")
          .select("id, capital")
          .eq("partner_id", p.id)
          .eq("is_current", true)
          .maybeSingle();
        if (snap) {
          currentSnapshots[p.id] = snap;
        }
      }

      // Close all current snapshots (day before)
      const dayBefore = new Date(date);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const effectiveTo = dayBefore.toISOString().slice(0, 10);

      for (const pId of Object.keys(currentSnapshots)) {
        await admin
          .from("capital_snapshots")
          .update({ effective_to: effectiveTo, is_current: false })
          .eq("id", currentSnapshots[pId].id);
      }

      // Calculate total capital
      let totalCapital = capitalAmount;
      for (const pId of Object.keys(currentSnapshots)) {
        totalCapital += currentSnapshots[pId].capital;
      }

      // Create snapshot for new partner
      const newPct = totalCapital > 0 ? capitalAmount / totalCapital : 1;
      await admin
        .from("capital_snapshots")
        .insert({
          partner_id: partner.id,
          capital: capitalAmount,
          ownership_percentage: Math.round(newPct * 10000) / 10000,
          effective_from: date,
          is_current: true,
        });

      // Create snapshots for existing partners with recalculated percentages
      for (const pId of Object.keys(currentSnapshots)) {
        const cap = currentSnapshots[pId].capital;
        const pct = totalCapital > 0 ? cap / totalCapital : 0;
        await admin
          .from("capital_snapshots")
          .insert({
            partner_id: pId,
            capital: cap,
            ownership_percentage: Math.round(pct * 10000) / 10000,
            effective_from: date,
            is_current: true,
          });
      }

      // Create contribution record
      await admin
        .from("partner_contributions")
        .insert({
          partner_id: partner.id,
          amount: capitalAmount,
          note: initialCapitalNote || "Initial capital",
          contribution_date: date,
        });
    }

    return NextResponse.json(partner, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}

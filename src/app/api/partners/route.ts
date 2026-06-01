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

        return {
          ...partner,
          currentCapital: snapshots?.capital ?? 0,
          ownershipPercentage: snapshots?.ownership_percentage ?? 0,
          totalProfitEarned,
          lastUpdated: contributions?.[0]?.created_at || snapshots?.created_at || partner.created_at,
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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Partner name is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("partners")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      const parsed = getResponseError(error);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminClient();

    const { data: partner, error } = await admin
      .from("partners")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ error: "Partners table not found" }, { status: 404 });
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 404 });
    }

    const { data: snapshot } = await admin
      .from("capital_snapshots")
      .select("capital, ownership_percentage, effective_from, effective_to")
      .eq("partner_id", id)
      .eq("is_current", true)
      .maybeSingle();

    const { data: distributions } = await admin
      .from("profit_distributions")
      .select("profit_share");

    const totalProfitEarned = (distributions || [])
      .reduce((sum, d) => sum + (d.profit_share || 0), 0);

    return NextResponse.json({
      ...partner,
      currentCapital: snapshot?.capital ?? 0,
      ownershipPercentage: snapshot?.ownership_percentage ?? 0,
      totalProfitEarned,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminClient();

    const { error } = await admin.from("partners").delete().eq("id", id);
    if (error) {
      const parsed = getResponseError(error);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

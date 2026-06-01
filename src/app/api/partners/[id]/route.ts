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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Partner name is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Check for duplicate name
    const { data: existing } = await admin
      .from("partners")
      .select("id")
      .neq("id", id)
      .eq("name", name.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "A partner with this name already exists" }, { status: 409 });
    }

    const { data, error } = await admin
      .from("partners")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      const parsed = getResponseError(error);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminClient();

    // Check for existing capital transactions
    const { data: contributions, error: countErr } = await admin
      .from("partner_contributions")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", id);

    if (countErr) {
      const parsed = getResponseError(countErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (contributions && contributions.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete partner with transaction history" },
        { status: 400 }
      );
    }

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

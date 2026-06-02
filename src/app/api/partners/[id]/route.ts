import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { computeCapital, getLatestSnapshot } from "../_utils";
import { requireAdmin } from "@/lib/dashboard-auth";

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

    const snapshot = await getLatestSnapshot(admin);

    let currentCapital = 0;
    let ownershipPercentage = 0;

    if (snapshot) {
      const item = snapshot.items.find((i: any) => i.partner_id === id);
      currentCapital = item ? Number(item.capital) : 0;
      const totalCapital = Number(snapshot.total_capital);
      ownershipPercentage = totalCapital > 0 ? currentCapital / totalCapital : 0;
    } else {
      const { capitalByPartner, totalCapital } = await computeCapital(admin);
      currentCapital = capitalByPartner[id] || 0;
      ownershipPercentage = totalCapital > 0 ? currentCapital / totalCapital : 0;
    }

    return NextResponse.json({
      ...partner,
      currentCapital,
      ownershipPercentage,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = requireAdmin(request);
  if (access) return access;
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Partner name is required" }, { status: 400 });
    }

    const admin = getAdminClient();

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
      .update({ name: name.trim() })
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = requireAdmin(request);
  if (access) return access;
  try {
    const { id } = await params;
    const admin = getAdminClient();

    const { data: tx, error: countErr } = await admin
      .from("partner_transactions")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", id)
      .eq("is_test", false);

    if (countErr) {
      const parsed = getResponseError(countErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (tx && tx.length > 0) {
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

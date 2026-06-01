import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminClient();

    const { data, error } = await admin
      .from("partner_contributions")
      .select("*")
      .eq("partner_id", id)
      .order("contribution_date", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ data: [], warning: "partner_contributions table not found" });
      }
      return NextResponse.json({ error: parsed.cleanedMessage, data: [] }, { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error", data: [] }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, note, contribution_date } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }
    if (!contribution_date) {
      return NextResponse.json({ error: "Contribution date is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Verify partner exists
    const { data: partner, error: partnerErr } = await admin
      .from("partners")
      .select("id")
      .eq("id", id)
      .single();
    if (partnerErr || !partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const contributionDate = contribution_date;

    // --- Snapshot logic: close all current snapshots, create new ones ---

    // 1. Get all partners' current snapshots
    const { data: allPartners } = await admin
      .from("partners")
      .select("id, name");

    const currentSnapshots: Record<string, { id: string; capital: number }> = {};
    for (const p of allPartners || []) {
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

    // 2. Calculate new capital for contributing partner
    const oldCapital = currentSnapshots[id]?.capital ?? 0;
    const newCapital = oldCapital + Number(amount);

    // 3. Close all current snapshots
    for (const pId of Object.keys(currentSnapshots)) {
      const dayBefore = new Date(contributionDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      const effectiveTo = dayBefore.toISOString().slice(0, 10);

      await admin
        .from("capital_snapshots")
        .update({ effective_to: effectiveTo, is_current: false })
        .eq("id", currentSnapshots[pId].id);
    }

    // 4. Calculate total new capital for ownership %
    let totalCapital = Number(amount); // starts with new contribution
    for (const pId of Object.keys(currentSnapshots)) {
      totalCapital += currentSnapshots[pId].capital;
    }
    // Also include partners with no existing snapshot (capital = 0)

    // 5. Create new snapshot for contributing partner
    const newOwnershipPct = totalCapital > 0 ? newCapital / totalCapital : 0;
    const { error: snapErr1 } = await admin
      .from("capital_snapshots")
      .insert({
        partner_id: id,
        capital: newCapital,
        ownership_percentage: Math.round(newOwnershipPct * 10000) / 10000,
        effective_from: contributionDate,
        is_current: true,
      });
    if (snapErr1) {
      const parsed = getResponseError(snapErr1);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    // 6. Create new snapshots for other partners
    for (const pId of Object.keys(currentSnapshots)) {
      if (pId === id) continue;
      const cap = currentSnapshots[pId].capital;
      const pct = totalCapital > 0 ? cap / totalCapital : 0;
      const { error: snapErr } = await admin
        .from("capital_snapshots")
        .insert({
          partner_id: pId,
          capital: cap,
          ownership_percentage: Math.round(pct * 10000) / 10000,
          effective_from: contributionDate,
          is_current: true,
        });
      if (snapErr) {
        const parsed = getResponseError(snapErr);
        return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
      }
    }

    // 7. Insert the contribution record
    const { data: contribution, error: contribErr } = await admin
      .from("partner_contributions")
      .insert({
        partner_id: id,
        amount: Number(amount),
        note: note || null,
        contribution_date: contributionDate,
      })
      .select()
      .single();

    if (contribErr) {
      const parsed = getResponseError(contribErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json(contribution, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}

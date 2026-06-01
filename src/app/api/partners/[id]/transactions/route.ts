import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { generateSnapshot } from "../../_utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminClient();

    const { data, error } = await admin
      .from("partner_transactions")
      .select("*")
      .eq("partner_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ data: [], warning: "partner_transactions table not found" });
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
    const { amount, type } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    if (!type || !["deposit", "withdraw"].includes(type)) {
      return NextResponse.json({ error: "Type must be 'deposit' or 'withdraw'" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: partner, error: partnerErr } = await admin
      .from("partners")
      .select("id")
      .eq("id", id)
      .single();

    if (partnerErr || !partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    if (type === "withdraw") {
      const { capitalByPartner } = await (
        await import("../../_utils")
      ).computeCapital(admin);
      const currentCapital = capitalByPartner[id] || 0;
      if (Number(amount) > currentCapital) {
        return NextResponse.json(
          { error: `Insufficient capital. Available: ${currentCapital.toLocaleString()}` },
          { status: 400 }
        );
      }
    }

    const { data: tx, error: txErr } = await admin
      .from("partner_transactions")
      .insert({
        partner_id: id,
        type,
        amount: Number(amount),
      })
      .select()
      .single();

    if (txErr) {
      const parsed = getResponseError(txErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    await generateSnapshot(admin);

    return NextResponse.json(tx, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}

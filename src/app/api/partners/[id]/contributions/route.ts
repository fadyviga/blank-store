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
      .from("partner_capital_transactions")
      .select("*")
      .eq("partner_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ data: [], warning: "partner_capital_transactions table not found" });
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
    const { amount, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
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

    const { data: tx, error: txErr } = await admin
      .from("partner_capital_transactions")
      .insert({
        partner_id: id,
        type: "deposit",
        amount: Number(amount),
        notes: notes || null,
      })
      .select()
      .single();

    if (txErr) {
      const parsed = getResponseError(txErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json(tx, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid JSON" }, { status: 400 });
  }
}

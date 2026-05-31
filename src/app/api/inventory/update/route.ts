import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function PATCH(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { variant_id, action, amount } = body as {
      variant_id?: string;
      action?: string;
      amount?: number;
    };

    if (!variant_id) {
      return NextResponse.json({ error: "variant_id is required" }, { status: 400 });
    }
    if (!amount || amount < 1) {
      return NextResponse.json({ error: "amount must be at least 1" }, { status: 400 });
    }
    if (action !== "increase" && action !== "decrease") {
      return NextResponse.json({ error: "action must be 'increase' or 'decrease'" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { data: variant, error: fetchErr } = await admin
      .from("product_variants")
      .select("stock")
      .eq("id", variant_id)
      .maybeSingle();

    if (fetchErr || !variant) {
      const parsed = fetchErr ? getResponseError(fetchErr) : null;
      if (parsed?.htmlResponse || parsed?.tableNotFound) {
        return NextResponse.json(
          { error: "Variants table not found. Run schema migration." },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const currentStock = variant.stock ?? 0;
    const newStock =
      action === "increase"
        ? currentStock + amount
        : currentStock - amount;

    const { error: updateErr } = await admin
      .from("product_variants")
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", variant_id);

    if (updateErr) {
      return NextResponse.json(
        { error: getResponseError(updateErr).cleanedMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      variant_id,
      previous_stock: currentStock,
      new_stock: newStock,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

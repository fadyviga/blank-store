import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { product_id, color_id, amount } = body as {
      product_id?: string;
      color_id?: string;
      amount?: number;
    };

    if (!product_id) {
      return NextResponse.json({ error: "product_id is required" }, { status: 400 });
    }
    if (!color_id) {
      return NextResponse.json({ error: "color_id is required" }, { status: 400 });
    }
    if (!amount || amount < 1) {
      return NextResponse.json({ error: "amount must be at least 1" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Find all variants matching product + color
    const { data: variants, error: fetchErr } = await admin
      .from("product_variants")
      .select("id, stock")
      .eq("product_id", product_id)
      .eq("color_id", color_id);

    if (fetchErr) {
      return NextResponse.json({ error: getResponseError(fetchErr).cleanedMessage }, { status: 500 });
    }

    if (!variants || variants.length === 0) {
      return NextResponse.json({ error: "No variants found for this product and color" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const results: { id: string; previous_stock: number; new_stock: number }[] = [];

    for (const v of variants) {
      const previous_stock = v.stock ?? 0;
      const new_stock = previous_stock + amount;

      const { error: updateErr } = await admin
        .from("product_variants")
        .update({ stock: new_stock, updated_at: now })
        .eq("id", v.id);

      if (updateErr) {
        return NextResponse.json({ error: getResponseError(updateErr).cleanedMessage }, { status: 500 });
      }

      results.push({ id: v.id, previous_stock, new_stock });
    }

    return NextResponse.json({
      success: true,
      updatedCount: results.length,
      amountAdded: amount,
      results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get("variantId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    const admin = getAdminClient();
    let query = admin
      .from("inventory_logs")
      .select("*, product_variants!inner(product_id, sku, product_colors(name), product_sizes(label))")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (variantId) query = query.eq("variant_id", variantId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variantId, change, reason, orderId } = body;

    if (!variantId || change === undefined || !reason) {
      return NextResponse.json(
        { error: "variantId, change, and reason are required" },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { data: variant, error: fetchErr } = await admin
      .from("product_variants")
      .select("stock")
      .eq("id", variantId)
      .single();

    if (fetchErr || !variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const newStock = variant.stock + change;
    if (newStock < 0) {
      return NextResponse.json(
        { error: "Insufficient stock" },
        { status: 400 }
      );
    }

    const { error: updateErr } = await admin
      .from("product_variants")
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", variantId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const logEntry: Record<string, unknown> = {
      variant_id: variantId,
      change,
      reason,
    };
    if (orderId) logEntry.order_id = orderId;

    const { error: logErr } = await admin
      .from("inventory_logs")
      .insert(logEntry);

    if (logErr) {
      return NextResponse.json({ error: logErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, newStock });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

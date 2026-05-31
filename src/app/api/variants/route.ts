import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("product_variants")
      .select("*, product_colors(*), product_sizes(*)")
      .order("created_at", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        console.error("[api/variants] Variants table not found. Run schema migration.");
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
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
    const { productId, colorId, sizeId, sku, price, stock, image } = body;
    if (!productId || !colorId || !sizeId || !sku) {
      return NextResponse.json({ error: "productId, colorId, sizeId, and sku are required" }, { status: 400 });
    }
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("product_variants")
      .insert({ product_id: productId, color_id: colorId, size_id: sizeId, sku, price: price || null, stock: stock ?? 0, image: image || null })
      .select()
      .single();
    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ error: "Variants table not configured yet. Run schema migration." }, { status: 501 });
      }
      if (error.code === "23505") {
        return NextResponse.json({ error: "This variant combination already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, price, stock, sku, image } = body;
    if (!id) return NextResponse.json({ error: "Variant ID is required" }, { status: 400 });
    const admin = getAdminClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (price !== undefined) updates.price = price;
    if (stock !== undefined) updates.stock = stock;
    if (sku !== undefined) updates.sku = sku;
    if (image !== undefined) updates.image = image;

    const { data, error } = await admin.from("product_variants").update(updates).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: getResponseError(error).cleanedMessage }, { status: 500 });

    if (stock !== undefined) {
      const prevStock = body._prevStock ?? stock;
      const change = stock - prevStock;
      if (change !== 0) {
        try {
          await admin.from("inventory_logs").insert({ variant_id: id, change, reason: body.reason || "manual_adjustment" });
        } catch {
          // inventory_logs table may not exist
        }
      }
    }
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Variant ID is required" }, { status: 400 });
    const admin = getAdminClient();
    const { error } = await admin.from("product_variants").delete().eq("id", id);
    if (error) return NextResponse.json({ error: getResponseError(error).cleanedMessage }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

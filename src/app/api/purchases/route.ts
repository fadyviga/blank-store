import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const logId = Date.now().toString(36);
  console.log(`[api/purchases:${logId}] GET`);

  try {
    const admin = getAdminClient();

    const { data, error } = await admin
      .from("purchases")
      .select("*, purchase_items(*, product_id(*), color_id(*), size_id(*))")
      .order("created_at", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.htmlResponse || parsed.tableNotFound) {
        console.error(`[api/purchases:${logId}] Purchases table missing: ${parsed.cleanedMessage}`);
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
  const logId = Date.now().toString(36);
  console.log(`[api/purchases:${logId}] POST`);

  try {
    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const {
      supplier_name,
      notes,
      items,
      apply_to_all_sizes,
      created_at,
    } = body as {
      supplier_name?: string;
      notes?: string;
      items?: Array<{
        product_id: string;
        color_id: string;
        size_id: string;
        quantity: number;
        unit_cost: number;
      }>;
      apply_to_all_sizes?: boolean;
      created_at?: string;
    };

    // ✅ OPTIONAL supplier name
    const cleanSupplier = supplier_name?.trim() || null;

    // ✅ Manual or auto date
    const purchaseDate = created_at
      ? new Date(created_at).toISOString()
      : new Date().toISOString();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items array is required with at least one item" },
        { status: 400 }
      );
    }

    for (const [i, item] of items.entries()) {
      if (!item.product_id)
        return NextResponse.json({ error: `items[${i}].product_id is required` }, { status: 400 });

      if (!item.color_id)
        return NextResponse.json({ error: `items[${i}].color_id is required` }, { status: 400 });

      if (!apply_to_all_sizes && !item.size_id) {
        return NextResponse.json({ error: `items[${i}].size_id is required` }, { status: 400 });
      }

      if (!item.quantity || item.quantity < 1) {
        return NextResponse.json({ error: `items[${i}].quantity must be at least 1` }, { status: 400 });
      }

      if (!item.unit_cost || item.unit_cost < 0) {
        return NextResponse.json({ error: `items[${i}].unit_cost must be >= 0` }, { status: 400 });
      }
    }

    const admin = getAdminClient();

    let expandedItems: Array<{
      product_id: string;
      color_id: string;
      size_id: string;
      quantity: number;
      unit_cost: number;
    }> = [];

    if (apply_to_all_sizes) {
      for (const item of items) {
        const { data: sizes, error: sizesErr } = await admin
          .from("product_sizes")
          .select("id");

        if (sizesErr) {
          return NextResponse.json(
            { error: getResponseError(sizesErr).cleanedMessage },
            { status: 500 }
          );
        }

        for (const size of sizes || []) {
          expandedItems.push({
            product_id: item.product_id,
            color_id: item.color_id,
            size_id: size.id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
          });
        }
      }
    } else {
      expandedItems = items.map((item) => ({
        product_id: item.product_id,
        color_id: item.color_id,
        size_id: item.size_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      }));
    }

    let total_cost = 0;
    for (const item of expandedItems) {
      total_cost += item.quantity * item.unit_cost;
    }

    console.log(
      `[api/purchases:${logId}] Creating purchase: supplier="${cleanSupplier}", items=${expandedItems.length}, total_cost=${total_cost}, date=${purchaseDate}`
    );

    const { data: purchase, error: purchaseErr } = await admin
      .from("purchases")
      .insert({
        supplier_name: cleanSupplier,
        notes: notes || "",
        total_cost,
        created_at: purchaseDate,
      })
      .select()
      .maybeSingle();

    if (purchaseErr || !purchase) {
      const parsed = purchaseErr ? getResponseError(purchaseErr) : null;

      return NextResponse.json(
        {
          error: parsed ? parsed.cleanedMessage : "Failed to create purchase",
        },
        { status: 500 }
      );
    }

    const purchaseId = purchase.id;

    const createdItems: any[] = [];
    let stockUpdated = 0;
    let stockFailed = 0;

    for (const item of expandedItems) {
      const itemTotal = item.quantity * item.unit_cost;

      const { data: purchaseItem, error: itemErr } = await admin
        .from("purchase_items")
        .insert({
          purchase_id: purchaseId,
          product_id: item.product_id,
          color_id: item.color_id,
          size_id: item.size_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: itemTotal,
          created_at: purchaseDate,
        })
        .select()
        .maybeSingle();

      if (itemErr) {
        stockFailed++;
        continue;
      }

      createdItems.push(purchaseItem);

      const { data: variant, error: vErr } = await admin
        .from("product_variants")
        .select("id, stock")
        .eq("product_id", item.product_id)
        .eq("color_id", item.color_id)
        .eq("size_id", item.size_id)
        .maybeSingle();

      if (vErr || !variant) {
        stockFailed++;
        continue;
      }

      const newStock = (variant.stock || 0) + item.quantity;

      const { error: updErr } = await admin
        .from("product_variants")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", variant.id);

      if (updErr) {
        stockFailed++;
        continue;
      }

      stockUpdated++;
    }

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchaseId,
        supplier_name: cleanSupplier,
        notes: purchase.notes,
        total_cost,
        created_at: purchase.created_at,
        items: createdItems,
      },
      stock_updated: stockUpdated,
      stock_failed: stockFailed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api/purchases:${logId}] Unhandled error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Purchase ID is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { error } = await admin
      .from("purchases")
      .delete()
      .eq("id", id);

    if (error) {
      const parsed = getResponseError(error);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    const admin = getAdminClient();

    const { data, error } = await admin
      .from("purchases")
      .select("*, purchase_items(*, product_id(*), color_id(*), size_id(*))")
      .order("created_at", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    const body = await request.json().catch(() => ({}));

    const {
      supplier_name,
      notes,
      items,
      apply_to_all_sizes,
      created_at,
    } = body;

    // ✅ no required validation
    const cleanSupplier = supplier_name?.trim() || null;

    const purchaseDate = created_at
      ? new Date(created_at).toISOString()
      : new Date().toISOString();

    const safeItems = Array.isArray(items) ? items : [];

    const admin = getAdminClient();

    let expandedItems: any[] = [];

    if (apply_to_all_sizes) {
      for (const item of safeItems) {
        const { data: existingVariants } = await admin
          .from("product_variants")
          .select("size_id")
          .eq("product_id", item?.product_id || 0)
          .eq("color_id", item?.color_id || 0);

        for (const v of existingVariants || []) {
          expandedItems.push({
            product_id: item?.product_id || null,
            color_id: item?.color_id || null,
            size_id: v.size_id,
            quantity: Number(item?.quantity || 0),
            unit_cost: Number(item?.unit_cost || 0),
          });
        }
      }
    } else {
      expandedItems = safeItems.map((item: any) => ({
        product_id: item?.product_id || null,
        color_id: item?.color_id || null,
        size_id: item?.size_id || null,
        quantity: Number(item?.quantity || 0),
        unit_cost: Number(item?.unit_cost || 0),
      }));
    }

    let total_cost = 0;
    for (const item of expandedItems) {
      total_cost += (item.quantity || 0) * (item.unit_cost || 0);
    }

    const { data: purchase } = await admin
      .from("purchases")
      .insert({
        supplier_name: cleanSupplier,
        notes: notes || "",
        total_cost,
        created_at: purchaseDate,
      })
      .select()
      .maybeSingle();

    if (!purchase) {
      console.error(`[api/purchases:${logId}] Purchase insert returned no data`);
      return NextResponse.json({ error: "Failed to create purchase record" }, { status: 500 });
    }

    const purchaseId = purchase.id;

    const createdItems: any[] = [];

    let stockUpdated = 0;
    let stockFailed = 0;

    for (const item of expandedItems) {
      const itemTotal = (item.quantity || 0) * (item.unit_cost || 0);

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
        console.error(`[api/purchases:${logId}] purchase_items insert error:`, itemErr);
        return NextResponse.json({ error: `Failed to insert purchase item: ${itemErr.message}` }, { status: 500 });
      }

      createdItems.push(purchaseItem);

      const { data: variant, error: variantErr } = await admin
        .from("product_variants")
        .select("id, stock")
        .eq("product_id", item.product_id)
        .eq("color_id", item.color_id)
        .eq("size_id", item.size_id)
        .maybeSingle();

      if (variantErr) {
        console.error(`[api/purchases:${logId}] Variant lookup error for item:`, variantErr);
        stockFailed++;
        continue;
      }

      if (variant) {
        const { error: updateErr } = await admin
          .from("product_variants")
          .update({
            stock: (variant.stock || 0) + (item.quantity || 0),
            updated_at: new Date().toISOString(),
          })
          .eq("id", variant.id);

        if (updateErr) {
          console.error(`[api/purchases:${logId}] Stock update error for variant ${variant.id}:`, updateErr);
          stockFailed++;
        } else {
          stockUpdated++;
        }
      } else {
        stockFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      purchase: {
        id: purchaseId,
        supplier_name: cleanSupplier,
        notes,
        total_cost,
        created_at: purchaseDate,
        items: createdItems,
      },
      stock_updated: stockUpdated,
      stock_failed: stockFailed,
    });
  } catch (err: unknown) {
    console.error(`[api/purchases:${logId}] Unhandled error:`, err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Purchase ID is required" }, { status: 400 });
  }

  const admin = getAdminClient();

  const { error } = await admin.from("purchases").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
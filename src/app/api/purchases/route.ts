import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

type PurchaseItemInput = {
  product_id: string | null;
  color_id: string | null;
  size_id: string | null;
  quantity: number;
  unit_cost: number;
};

function normalizeItem(raw: Record<string, unknown>): PurchaseItemInput {
  const product_id = (raw.product_id ?? raw.productId ?? null) as string | null;
  const color_id = (raw.color_id ?? raw.colorId ?? null) as string | null;
  const size_id = (raw.size_id ?? raw.sizeId ?? null) as string | null;
  return {
    product_id: product_id || null,
    color_id: color_id || null,
    size_id: size_id || null,
    quantity: Number(raw.quantity ?? 0),
    unit_cost: Number(raw.unit_cost ?? raw.unitCost ?? 0),
  };
}

function parsePurchaseDate(created_at: unknown): string {
  if (!created_at || typeof created_at !== "string") {
    return new Date().toISOString();
  }
  const trimmed = created_at.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00.000Z`).toISOString();
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}

function mapPurchaseForClient(row: Record<string, unknown>) {
  const purchaseItems = (row.purchase_items as Record<string, unknown>[]) || [];
  const items = purchaseItems.map((pi) => {
    const products = pi.products as { name?: string } | undefined;
    const productEmbed = pi.product_id as { name?: string } | undefined;
    const colors = pi.product_colors as { name?: string } | undefined;
    const colorEmbed = pi.color_id as { name?: string } | undefined;
    const sizes = pi.product_sizes as { label?: string } | undefined;
    const sizeEmbed = pi.size_id as { label?: string } | undefined;
    const quantity = Number(pi.quantity ?? 0);
    const unit_cost = Number(pi.unit_cost ?? 0);
    const line_total = Number(pi.total_cost ?? quantity * unit_cost);
    return {
      product_name: products?.name ?? productEmbed?.name,
      color_name: colors?.name ?? colorEmbed?.name,
      size_label: sizes?.label ?? sizeEmbed?.label,
      quantity,
      unit_cost,
      line_total,
    };
  });

  return {
    id: String(row.id),
    supplier: row.supplier_name ?? "",
    notes: row.notes ?? "",
    total: Number(row.total_cost ?? 0),
    created_at: row.created_at,
    items,
  };
}

async function rollbackPurchase(admin: ReturnType<typeof getAdminClient>, purchaseId: number) {
  await admin.from("purchase_items").delete().eq("purchase_id", purchaseId);
  await admin.from("purchases").delete().eq("id", purchaseId);
}

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data, error } = await admin
      .from("purchases")
      .select("*, purchase_items(*)")
      .order("created_at", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      console.error("[api/purchases] GET error:", parsed.cleanedMessage);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json((data || []).map((row) => mapPurchaseForClient(row as Record<string, unknown>)));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/purchases] GET unhandled:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    const body = await request.json().catch(() => ({}));

    const supplierRaw = body.supplier_name ?? body.supplier;
    const cleanSupplier =
      typeof supplierRaw === "string" && supplierRaw.trim() ? supplierRaw.trim() : "";

    const notes = typeof body.notes === "string" ? body.notes : "";
    const apply_to_all_sizes = Boolean(body.apply_to_all_sizes ?? body.applyToAllSizes);
    const purchaseDate = parsePurchaseDate(body.created_at);

    const safeItems = Array.isArray(body.items) ? body.items : [];
    const admin = getAdminClient();

    let expandedItems: PurchaseItemInput[] = [];

    if (apply_to_all_sizes) {
      for (const raw of safeItems) {
        const item = normalizeItem(raw as Record<string, unknown>);
        if (!item.product_id || !item.color_id) continue;

        const { data: existingVariants, error: variantListErr } = await admin
          .from("product_variants")
          .select("size_id")
          .eq("product_id", item.product_id)
          .eq("color_id", item.color_id);

        if (variantListErr) {
          console.error(`[api/purchases:${logId}] Variant list error:`, variantListErr);
          return NextResponse.json(
            { error: `Failed to load variants: ${variantListErr.message}` },
            { status: 500 }
          );
        }

        for (const v of existingVariants || []) {
          expandedItems.push({
            ...item,
            size_id: v.size_id as string,
          });
        }
      }
    } else {
      expandedItems = safeItems.map((raw: Record<string, unknown>) =>
        normalizeItem(raw)
      );
    }

    if (expandedItems.length === 0) {
      return NextResponse.json(
        { error: "At least one purchase item with product, color, and size is required" },
        { status: 400 }
      );
    }

    for (const item of expandedItems) {
      if (!item.product_id || !item.color_id || !item.size_id) {
        return NextResponse.json(
          { error: "Each item must include product, color, and size" },
          { status: 400 }
        );
      }
      if (item.quantity <= 0) {
        return NextResponse.json({ error: "Item quantity must be greater than 0" }, { status: 400 });
      }
    }

    let total_cost = 0;
    for (const item of expandedItems) {
      total_cost += item.quantity * item.unit_cost;
    }

    const { data: purchase, error: purchaseErr } = await admin
      .from("purchases")
      .insert({
        supplier_name: cleanSupplier,
        notes,
        total_cost,
        created_at: purchaseDate,
      })
      .select()
      .single();

    if (purchaseErr) {
      console.error(`[api/purchases:${logId}] Purchase insert error:`, purchaseErr);
      const parsed = getResponseError(purchaseErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (!purchase) {
      console.error(`[api/purchases:${logId}] Purchase insert returned no data`);
      return NextResponse.json({ error: "Failed to create purchase record" }, { status: 500 });
    }

    const purchaseId = purchase.id as number;

    const itemRows = expandedItems.map((item) => ({
      purchase_id: purchaseId,
      product_id: item.product_id,
      color_id: item.color_id,
      size_id: item.size_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total_cost: item.quantity * item.unit_cost,
      created_at: purchaseDate,
    }));

    const { data: createdItems, error: itemsErr } = await admin
      .from("purchase_items")
      .insert(itemRows)
      .select();

    if (itemsErr) {
      console.error(`[api/purchases:${logId}] purchase_items batch insert error:`, itemsErr);
      await rollbackPurchase(admin, purchaseId);
      const parsed = getResponseError(itemsErr);
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    let stockUpdated = 0;
    let stockFailed = 0;
    const stockErrors: string[] = [];

    for (const item of expandedItems) {
      const { data: variant, error: variantErr } = await admin
        .from("product_variants")
        .select("id, stock")
        .eq("product_id", item.product_id!)
        .eq("color_id", item.color_id!)
        .eq("size_id", item.size_id!)
        .maybeSingle();

      if (variantErr) {
        console.error(`[api/purchases:${logId}] Variant lookup error:`, variantErr);
        stockFailed++;
        stockErrors.push(variantErr.message);
        continue;
      }

      if (!variant) {
        stockFailed++;
        stockErrors.push(
          `No variant for product ${item.product_id}, color ${item.color_id}, size ${item.size_id}`
        );
        continue;
      }

      const { error: updateErr } = await admin
        .from("product_variants")
        .update({
          stock: (variant.stock || 0) + item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", variant.id);

      if (updateErr) {
        console.error(`[api/purchases:${logId}] Stock update error for variant ${variant.id}:`, updateErr);
        stockFailed++;
        stockErrors.push(updateErr.message);
      } else {
        stockUpdated++;
      }
    }

    return NextResponse.json({
      success: true,
      purchase: mapPurchaseForClient({
        ...purchase,
        purchase_items: createdItems || [],
      } as Record<string, unknown>),
      stock_updated: stockUpdated,
      stock_failed: stockFailed,
      stock_errors: stockErrors.length > 0 ? stockErrors : undefined,
    });
  } catch (err: unknown) {
    console.error(`[api/purchases:${logId}] Unhandled error:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Purchase ID is required" }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const { error } = await admin.from("purchases").delete().eq("id", id);

    if (error) {
      console.error("[api/purchases] DELETE error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

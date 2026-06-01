import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError, isHtmlResponse } from "@/lib/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const WHATSAPP_NUMBER = "201287659463";

function sendWhatsAppRestockAlert(name: string, color: string, size: string, stock: number) {
  const message = `⚠️ Restock Alert:\nProduct: ${name}\nVariant: ${color} - ${size}\nStock: ${stock}`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  console.log(`[whatsapp] Restock alert URL: ${url}`);
  return url;
}

// Structured result for inventory actions
interface StockActionResult {
  processed: number;
  total: number;
  skippedItems: Array<{ name: string; color: string; size: string; reason: string }>;
  missingVariants: Array<{ name: string; color: string; size: string }>;
}

async function updateStockForOrder(
  admin: SupabaseClient,
  orderId: string,
  logId: string,
  action: "deduct" | "restore"
): Promise<StockActionResult> {
  const isDeduct = action === "deduct";
  const reason = isDeduct ? "order_processing" : "order_cancelled";
  const result: StockActionResult = { processed: 0, total: 0, skippedItems: [], missingVariants: [] };

  console.log(`[api/orders:${logId}] updateStockForOrder: action=${action}, orderId=${orderId}`);

  // Fetch items from the orders JSON/string field
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("items")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    console.error(`[api/orders:${logId}] Failed to fetch order ${orderId}:`, orderErr?.message);
    return result;
  }

  let items: any[] = [];
  if (typeof order.items === "string") {
    try { items = JSON.parse(order.items); } catch { items = []; }
  } else if (Array.isArray(order.items)) {
    items = order.items;
  }

  result.total = items.length;
  console.log(`[api/orders:${logId}] updateStockForOrder: ${items.length} items`);

  for (const item of items) {
    try {
      const productName = item.product_name || item.name || "";
      const colorName = item.color || "";
      const rawSize = (item.size || "").trim();

      const sizeLabel = rawSize
  .replace(/^XXL$/i, "2XL")
  .replace(/^XXXL$/i, "3XL");

      const sizeNote = rawSize !== sizeLabel ? ` (normalized from "${rawSize}")` : "";
      console.log(`[api/orders:${logId}] Resolving: product="${productName}", color="${colorName}", size="${sizeLabel}"${sizeNote}`);

      if (!productName) {
        console.error(`[api/orders:${logId}] SKIP: item has no name`);
        result.skippedItems.push({ name: "", color: colorName, size: sizeLabel, reason: "missing product name" });
        continue;
      }

      // Look up product by name (ILIKE substring match for flexibility)
      const { data: products } = await admin
  .from("products")
  .select("id, name");

console.log(
  `[api/orders:${logId}] Products in DB:`,
  products?.map((p) => p.name)
);

const searchWords = productName
  .toLowerCase()
  .split(" ")
  .filter(Boolean);

const product =
  products?.find((p) => {
    const dbName = p.name.toLowerCase();

    return searchWords.every((word) =>
      dbName.includes(word)
    );
  }) || null;

  console.log(
    `[api/orders:${logId}] Looking for "${productName}"`
  );
  
  console.log(
    `[api/orders:${logId}] Match result:`,
    product
  );
      if (!product) {
        console.warn(`[api/orders:${logId}] SKIP: product not found — "${productName}"`);
        result.missingVariants.push({ name: productName, color: colorName, size: sizeLabel });
        continue;
      }
      console.log(`[api/orders:${logId}]   → product ${product.id}`);

      // Look up color by name
      const { data: color } = await admin
        .from("product_colors")
        .select("id")
        .eq("product_id", product.id)
        .ilike("name", colorName)
        .maybeSingle();

      if (!color) {
        console.warn(`[api/orders:${logId}] SKIP: color not found — "${colorName}" for product ${product.id}`);
        result.missingVariants.push({ name: productName, color: colorName, size: sizeLabel });
        continue;
      }
      console.log(`[api/orders:${logId}]   → color ${color.id}`);

      // Look up size by label
      const { data: size } = await admin
        .from("product_sizes")
        .select("id")
        .ilike("label", sizeLabel)
        .maybeSingle();

      if (!size) {
        console.warn(`[api/orders:${logId}] SKIP: size not found — "${sizeLabel}"`);
        result.missingVariants.push({ name: productName, color: colorName, size: sizeLabel });
        continue;
      }
      console.log(`[api/orders:${logId}]   → size ${size.id}`);

      // Find the specific variant (product × color × size)
      const { data: variant, error: vErr } = await admin
        .from("product_variants")
        .select("id, stock")
        .eq("product_id", product.id)
        .eq("color_id", color.id)
        .eq("size_id", size.id)
        .maybeSingle();

      if (vErr) {
        console.error(`[api/orders:${logId}] SKIP: variant lookup error:`, vErr.message);
        result.skippedItems.push({ name: productName, color: colorName, size: sizeLabel, reason: vErr.message });
        continue;
      }

      if (!variant) {
        console.warn(`[api/orders:${logId}] SKIP: no variant row for product=${product.id} color=${color.id} size=${size.id}`);
        result.missingVariants.push({ name: productName, color: colorName, size: sizeLabel });
        continue;
      }
      console.log(`[api/orders:${logId}]   → variant ${variant.id} (current stock=${variant.stock})`);

      const qty = item.quantity || 1;
      const change = isDeduct ? -qty : qty;
      const newStock = (variant.stock || 0) + change;

      const { error: updErr } = await admin
        .from("product_variants")
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", variant.id);

      if (updErr) {
        console.error(`[api/orders:${logId}] SKIP: failed to update variant ${variant.id}:`, updErr.message);
        result.skippedItems.push({ name: productName, color: colorName, size: sizeLabel, reason: updErr.message });
        continue;
      }

      const { error: logErr } = await admin
        .from("inventory_logs")
        .insert({ variant_id: variant.id, change, reason, order_id: orderId });

      if (logErr) {
        console.warn(`[api/orders:${logId}] inventory_logs insert failed:`, logErr.message);
      }

      if (isDeduct && newStock < 0) {
        sendWhatsAppRestockAlert(productName, colorName, sizeLabel, newStock);
      }

      console.log(`[api/orders:${logId}] ${isDeduct ? "DEDUCT" : "RESTORE"} OK: variant ${variant.id}: ${variant.stock} → ${newStock} (qty=${qty})`);
      result.processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.error(`[api/orders:${logId}] UNEXPECTED ERROR:`, msg);
      result.skippedItems.push({
        name: item.product_name || item.name || "unknown",
        color: item.color || "",
        size: item.size || "",
        reason: `unexpected error: ${msg}`,
      });
    }
  }

  console.log(`[api/orders:${logId}] Done: ${result.processed}/${result.total} processed, ${result.skippedItems.length} skipped, ${result.missingVariants.length} missing`);
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const logId = Date.now().toString(36);
  console.log(`[api/orders:${logId}] GET`, Object.fromEntries(searchParams));

  try {
    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      const msg = configErr instanceof Error ? configErr.message : "Supabase not configured";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data, error } = await admin.from("orders").select("*").order("created_at", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.htmlResponse || parsed.tableNotFound) {
        console.error(`[api/orders:${logId}] Supabase unreachable or orders table missing: ${parsed.cleanedMessage}`);
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    const orders = (data || []).map((row: any) => {
      let parsedItems = row.items || [];
      if (typeof row.items === "string") {
        try { parsedItems = JSON.parse(row.items); } catch { parsedItems = []; }
      }
      return {
        id: String(row.id),
        displayId: row.display_id || `BLK-${String(row.id).padStart(6, "0")}`,
        customer: {
          name: row.name || "",
          phone: row.phone || "",
          address: row.address || row.customer_address || "",
          email: row.email || "",
        },
        items: parsedItems,
        subtotal: row.subtotal || row.total || 0,
        delivery: row.delivery || 0,
        total: row.total || 0,
        status: row.status || "pending",
        createdAt: row.created_at || new Date().toISOString(),
        userId: row.user_id || null,
        internalNotes: row.internal_notes || "",
        trackingNumber: row.tracking_number || "",
        couponCode: row.coupon_code || undefined,
        discountAmount: row.discount_amount ? Number(row.discount_amount) : undefined,
      };
    });

    return NextResponse.json(orders);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { customer, items, subtotal, userId, couponCode, discountAmount } = body as {
      customer?: { name?: string; phone?: string; address?: string; email?: string };
      items?: Array<{ name: string; color?: string; size?: string; price: number; quantity: number; image?: string }>;
      subtotal?: number;
      userId?: string;
      couponCode?: string;
      discountAmount?: number;
    };

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields: customer, items" }, { status: 400 });
    }
    if (!customer.name?.trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    if (!customer.phone?.trim()) return NextResponse.json({ error: "Customer phone is required" }, { status: 400 });
    if (!customer.address?.trim()) return NextResponse.json({ error: "Customer address is required" }, { status: 400 });

    const delivery = (subtotal || 0) >= 1000 ? 0 : 50;
    const discount = Math.max(0, discountAmount || 0);
    const total = Math.max(0, (subtotal || 0) + delivery - discount);

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      return NextResponse.json(
        { error: configErr instanceof Error ? configErr.message : "Supabase not configured" },
        { status: 500 }
      );
    }

    // Enrich items with product_id, color_id, size_id, variant_id for reliable stock deduction
    const enrichedItems = await Promise.all(
      (items || []).map(async (item: any) => {
        const enriched = { ...item };

        const normalizedSize = (item.size || "")
  .replace(/^XXL$/i, "2XL")
  .replace(/^XXXL$/i, "3XL");
        try {
          // Find product: try exact match first, then substring
          let product: { id: string } | null = null;

          const { data: exactProduct } = await admin
            .from("products")
            .select("id")
            .ilike("name", item.name || "")
            .maybeSingle();
          product = exactProduct;


          if (!product) {
            const { data: fuzzyProduct } = await admin
              .from("products")
              .select("id")
              .ilike("name", `%${item.name}%`)
              .maybeSingle();
            product = fuzzyProduct;
          }

          if (product) {
            enriched.product_id = product.id;

            const { data: color } = await admin
              .from("product_colors")
              .select("id")
              .eq("product_id", product.id)
              .ilike("name", item.color || "")
              .maybeSingle();
            if (color) {
              enriched.color_id = color.id;

              const { data: size } = await admin
                .from("product_sizes")
                .select("id")
                .ilike("label", normalizedSize)
                .maybeSingle();
              if (size) {
                enriched.size_id = size.id;

                const { data: variant } = await admin
                  .from("product_variants")
                  .select("id")
                  .eq("product_id", product.id)
                  .eq("color_id", color.id)
                  .eq("size_id", size.id)
                  .maybeSingle();
                if (variant) {
                  enriched.variant_id = variant.id;
                }
              }
            }
          }
        } catch { /* non-critical enrichment */ }

        return enriched;
      })
    );

    const enrichedCount = enrichedItems.filter((i: any) => i.variant_id).length;
    const idCount = enrichedItems.filter((i: any) => i.product_id && i.color_id && i.size_id).length;
    console.log(`[api/orders:${logId}] Enriched: ${enrichedCount}/${enrichedItems.length} with variant_id, ${idCount}/${enrichedItems.length} with full IDs`);

    // Only use columns that exist in the actual DB schema
    const orderRow: Record<string, unknown> = {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
      items: JSON.stringify(enrichedItems),
      subtotal: subtotal || 0,
      delivery,
      total,
      created_at: new Date().toISOString(),
    };

    if (couponCode) orderRow.coupon_code = couponCode;
    if (discountAmount && discountAmount > 0) orderRow.discount_amount = discountAmount;

    console.log(`[api/orders:${logId}] Inserting order with columns:`, Object.keys(orderRow));

    const { data: inserted, error: orderErr } = await admin
      .from("orders")
      .insert(orderRow)
      .select()
      .maybeSingle();

    if (orderErr) {
      console.error(`[api/orders:${logId}] Insert error:`, orderErr);
      const parsed = getResponseError(orderErr);
      const msg = parsed.htmlResponse
        ? "Database connection failed. Your Vercel NEXT_PUBLIC_SUPABASE_URL points to blank-eg.vercel.app instead of your Supabase project. Fix it in Vercel Dashboard > Environment Variables."
        : `Failed to create order: ${parsed.cleanedMessage}`;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const orderId = inserted?.id || String(Date.now());
    const displayId = `BLK-${String(orderId).padStart(6, "0")}`;

    console.log(`[api/orders:${logId}] Order created: ${displayId} (id=${orderId})`);

    return NextResponse.json({
      success: true,
      order: {
        id: String(orderId),
        displayId,
        customer,
        items,
        subtotal: subtotal || 0,
        delivery,
        total,
        status: "pending",
        createdAt: new Date().toISOString(),
        userId,
        couponCode: couponCode || undefined,
        discountAmount: discountAmount || undefined,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api/orders:${logId}] Unhandled error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, status, internalNotes, trackingNumber } = body;

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      return NextResponse.json(
        { error: configErr instanceof Error ? configErr.message : "Supabase not configured" },
        { status: 500 }
      );
    }

    // Fetch current order (status + stock_processed) to determine lifecycle action
    let currentStatus: string | null = null;
    let stockProcessed = false;
    if (status) {
      const { data: currentOrder, error: fetchErr } = await admin
        .from("orders")
        .select("status, stock_processed")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr) {
        console.error(`[api/orders:${logId}] Failed to fetch current order:`, fetchErr.message);
      } else if (currentOrder) {
        currentStatus = currentOrder.status;
        stockProcessed = currentOrder.stock_processed === true;
      }
    }

    const statusChanged = status && currentStatus !== null && status !== currentStatus;
    console.log(`[api/orders:${logId}] PATCH order ${id}: newStatus=${status}, oldStatus=${currentStatus}, stockProcessed=${stockProcessed}, statusChanged=${statusChanged}`);

    // Compute lifecycle action based on state transition
    // Deduct stock when entering Processing or Completed (only if not already deducted)
    let needsDeduct = (status === "processing" || status === "completed") && !stockProcessed && statusChanged;
    // Restore stock when Cancelled (only if previously deducted)
    let needsRestore = status === "cancelled" && stockProcessed && statusChanged;

    console.log(`[api/orders:${logId}] needsDeduct=${needsDeduct}, needsRestore=${needsRestore} (currentStatus=${currentStatus}, newStatus=${status}, stockProcessed=${stockProcessed})`);

    // Update order status + non-inventory fields first
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (internalNotes !== undefined) updates.internal_notes = internalNotes;
    if (trackingNumber !== undefined) updates.tracking_number = trackingNumber;

    const { error } = await admin.from("orders").update(updates).eq("id", id);
    if (error) {
      const parsed = getResponseError(error);
      if (parsed.htmlResponse) {
        return NextResponse.json({
          error: "Database connection failed. Check NEXT_PUBLIC_SUPABASE_URL in Vercel environment variables.",
          hint: "Must point to your Supabase project URL, not your Vercel deployment URL.",
        }, { status: 500 });
      }
      if (parsed.columnNotFound) {
        return NextResponse.json({
          error: "Database column missing. Run schema-fix.sql in Supabase SQL Editor to add missing columns.",
          migrationFile: "schema-fix.sql",
        }, { status: 400 });
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    // --- Inventory lifecycle — runs AFTER status update ---
    let inventoryResult: StockActionResult | null = null;
    let stockFlagUpdate: boolean | null = null;

    if (needsDeduct) {
      console.log(`[api/orders:${logId}] [inventory] Stock deduct triggered — "${currentStatus}" → "${status}"`);
      inventoryResult = await updateStockForOrder(admin, id as string, logId, "deduct");
      if (inventoryResult.processed > 0) {
        const { error: spErr } = await admin.from("orders").update({ stock_processed: true }).eq("id", id);
        if (spErr) {
          console.error(`[api/orders:${logId}] Failed to set stock_processed=true:`, spErr.message);
        } else {
          stockFlagUpdate = true;
          console.log(`[api/orders:${logId}] [inventory] Stock deducted (${inventoryResult.processed}/${inventoryResult.total} items), stock_processed=true`);
        }
      } else {
        console.warn(`[api/orders:${logId}] Deduct processed 0/${inventoryResult.total} items — stock_processed NOT set, retries will re-attempt`);
      }
    } else if (needsRestore) {
      console.log(`[api/orders:${logId}] [inventory] Stock restore triggered — "${currentStatus}" → "${status}"`);
      inventoryResult = await updateStockForOrder(admin, id as string, logId, "restore");
      if (inventoryResult.processed > 0) {
        const { error: spErr } = await admin.from("orders").update({ stock_processed: false }).eq("id", id);
        if (spErr) {
          console.error(`[api/orders:${logId}] Failed to set stock_processed=false:`, spErr.message);
        } else {
          stockFlagUpdate = false;
          console.log(`[api/orders:${logId}] [inventory] Stock restored (${inventoryResult.processed}/${inventoryResult.total} items), stock_processed=false`);
        }
      }
    } else if (statusChanged) {
      console.log(`[api/orders:${logId}] [inventory] No inventory action — "${currentStatus}" → "${status}" (stockProcessed=${stockProcessed})`);
      if (status === "completed" && stockProcessed) {
        console.log(`[api/orders:${logId}] [inventory] Duplicate deduction prevented — stock already deducted for this order`);
      }
      if (status === "cancelled" && !stockProcessed) {
        console.log(`[api/orders:${logId}] [inventory] Restore skipped — stock was never deducted for this order`);
      }
    }

    const responseBody: Record<string, any> = { success: true };
    if (inventoryResult) {
      responseBody.processedItems = inventoryResult.processed;
      responseBody.skippedItems = inventoryResult.skippedItems;
      responseBody.missingVariants = inventoryResult.missingVariants;
    }
    if (stockFlagUpdate !== null) {
      responseBody.stockProcessed = stockFlagUpdate;
    }

    return NextResponse.json(responseBody);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Order ID is required" }, { status: 400 });

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      return NextResponse.json(
        { error: configErr instanceof Error ? configErr.message : "Supabase not configured" },
        { status: 500 }
      );
    }

    const { error } = await admin.from("orders").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

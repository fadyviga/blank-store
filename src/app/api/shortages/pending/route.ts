import { NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export interface PendingShortageItem {
  order_id: string;
  display_id: string;
  customer_name: string;
  order_date: string;
  product_name: string;
  color: string;
  size: string;
  ordered_quantity: number;
  current_stock: number;
  missing_quantity: number;
  status_indicator: "out_of_stock" | "partial" | "full";
}

interface SizeOrderRef {
  display_id: string;
  customer_name: string;
  ordered_quantity: number;
  missing_quantity: number;
  order_date: string;
  order_id: string;
}

interface SizeGroup {
  size: string;
  missing_total: number;
  orders: SizeOrderRef[];
}

interface ColorGroup {
  color: string;
  sizes: SizeGroup[];
}

interface ProductGroup {
  product_name: string;
  colors: ColorGroup[];
}

interface PendingShortagesResponse {
  summary: {
    total_pending_orders_with_shortages: number;
    total_missing_units: number;
    total_affected_products: number;
  };
  items: PendingShortageItem[];
  grouped: ProductGroup[];
}

function normalizeSize(s: string): string {
  return s.replace(/^XXL$/i, "2XL").replace(/^XXXL$/i, "3XL");
}

function parseItems(raw: unknown): any[] {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("id, display_id, name, created_at, items")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (ordersErr) {
      const parsed = getResponseError(ordersErr);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        return NextResponse.json(emptyResponse());
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json(emptyResponse());
    }

    interface ParsedItem {
      orderId: string;
      displayId: string;
      customerName: string;
      orderDate: string;
      productName: string;
      color: string;
      size: string;
      orderedQty: number;
      variantId: string | null;
      productId: string | null;
      colorId: string | null;
      sizeId: string | null;
    }

    const allParsed: ParsedItem[] = [];
    const variantIds = new Set<string>();

    for (const order of orders) {
      const items = parseItems(order.items);
      const displayId = order.display_id || `BLK-${String(order.id).padStart(6, "0")}`;
      const customerName = order.name || "Unknown";
      const orderDate = order.created_at || "";

      for (const item of items) {
        const productName = item.product_name || item.name || "";
        const color = item.color || "";
        const size = normalizeSize(item.size || "");
        const orderedQty = Number(item.quantity) || 1;
        const vid: string | null = item.variant_id || null;

        if (vid) variantIds.add(vid);

        allParsed.push({
          orderId: order.id,
          displayId,
          customerName,
          orderDate,
          productName,
          color,
          size,
          orderedQty,
          variantId: vid,
          productId: item.product_id || null,
          colorId: item.color_id || null,
          sizeId: item.size_id || null,
        });
      }
    }

    const stockByVariantId = new Map<string, number>();
    const stockByCompositeKey = new Map<string, number>();

    if (variantIds.size > 0) {
      const { data: variantRows, error: vErr } = await admin
        .from("product_variants")
        .select("id, stock")
        .in("id", [...variantIds]);

      if (!vErr) {
        for (const v of variantRows || []) {
          stockByVariantId.set(v.id, v.stock ?? 0);
        }
      }
    }

    const { data: allVariants, error: allVErr } = await admin
      .from("product_variants")
      .select("id, stock, products!product_id(name), product_colors!color_id(name), product_sizes!size_id(label)");

    if (allVErr) {
      const parsed = getResponseError(allVErr);
      if (!parsed.tableNotFound && !parsed.htmlResponse) {
        return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
      }
    }

    for (const v of allVariants || []) {
      const pName = (v.products as any)?.name || "";
      const color = (v.product_colors as any)?.name || "";
      const size = (v.product_sizes as any)?.label || "";
      const key = `${pName}||${color}||${size}`;
      stockByCompositeKey.set(key, (stockByCompositeKey.get(key) || 0) + (v.stock ?? 0));

      const compositeIdKey = `${(v as any).product_id}||${(v as any).color_id}||${(v as any).size_id}`;
      if (!stockByCompositeKey.has(compositeIdKey)) {
        stockByCompositeKey.set(compositeIdKey, v.stock ?? 0);
      }
    }

    const items: PendingShortageItem[] = [];
    const affectedOrderSet = new Set<string>();
    const affectedProductSet = new Set<string>();

    for (const p of allParsed) {
      let stock = 0;

      if (p.variantId && stockByVariantId.has(p.variantId)) {
        stock = stockByVariantId.get(p.variantId)!;
      } else if (p.productId && p.colorId && p.sizeId) {
        const compositeIdKey = `${p.productId}||${p.colorId}||${p.sizeId}`;
        stock = stockByCompositeKey.get(compositeIdKey) ?? 0;
      } else {
        const textKey = `${p.productName}||${p.color}||${p.size}`;
        stock = stockByCompositeKey.get(textKey) ?? 0;
      }

      const missing = Math.max(0, p.orderedQty - stock);
      if (missing <= 0) continue;

      let indicator: PendingShortageItem["status_indicator"];
      if (stock === 0) {
        indicator = "out_of_stock";
      } else if (stock < p.orderedQty) {
        indicator = "partial";
      } else {
        indicator = "full";
      }

      affectedOrderSet.add(p.orderId);
      affectedProductSet.add(p.productName);

      items.push({
        order_id: p.orderId,
        display_id: p.displayId,
        customer_name: p.customerName,
        order_date: p.orderDate,
        product_name: p.productName,
        color: p.color,
        size: p.size,
        ordered_quantity: p.orderedQty,
        current_stock: stock,
        missing_quantity: missing,
        status_indicator: indicator,
      });
    }

    const totalMissing = items.reduce((sum, i) => sum + i.missing_quantity, 0);

    const summary = {
      total_pending_orders_with_shortages: affectedOrderSet.size,
      total_missing_units: totalMissing,
      total_affected_products: affectedProductSet.size,
    };

    const groupMap = new Map<string, Map<string, Map<string, SizeOrderRef[]>>>();

    for (const item of items) {
      if (!groupMap.has(item.product_name)) {
        groupMap.set(item.product_name, new Map());
      }
      const colorMap = groupMap.get(item.product_name)!;
      if (!colorMap.has(item.color)) {
        colorMap.set(item.color, new Map());
      }
      const sizeMap = colorMap.get(item.color)!;
      if (!sizeMap.has(item.size)) {
        sizeMap.set(item.size, []);
      }
      sizeMap.get(item.size)!.push({
        display_id: item.display_id,
        customer_name: item.customer_name,
        ordered_quantity: item.ordered_quantity,
        missing_quantity: item.missing_quantity,
        order_date: item.order_date,
        order_id: item.order_id,
      });
    }

    const grouped: ProductGroup[] = [];
    for (const [product_name, colorMap] of groupMap) {
      const colors: ColorGroup[] = [];
      for (const [color, sizeMap] of colorMap) {
        const sizes: SizeGroup[] = [];
        for (const [size, orderRefs] of sizeMap) {
          sizes.push({
            size,
            missing_total: orderRefs.reduce((s, r) => s + r.missing_quantity, 0),
            orders: orderRefs,
          });
        }
        colors.push({ color, sizes });
      }
      grouped.push({ product_name, colors });
    }

    return NextResponse.json({
      summary,
      items,
      grouped,
    } satisfies PendingShortagesResponse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function emptyResponse(): PendingShortagesResponse {
  return {
    summary: { total_pending_orders_with_shortages: 0, total_missing_units: 0, total_affected_products: 0 },
    items: [],
    grouped: [],
  };
}

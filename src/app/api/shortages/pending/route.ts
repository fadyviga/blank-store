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
  quantity: number;
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

const STATUS: PendingShortageItem["status_indicator"][] = [
  "out_of_stock",
  "partial",
  "full",
];

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
        return NextResponse.json({ items: [], summary: { total_pending_orders_with_shortages: 0, total_missing_units: 0, total_affected_products: 0 }, grouped: [] });
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        summary: { total_pending_orders_with_shortages: 0, total_missing_units: 0, total_affected_products: 0 },
        items: [],
        grouped: [],
      });
    }

    const { data: variants, error: variantsErr } = await admin
      .from("product_variants")
      .select("stock, products!product_id(name), product_colors!color_id(name), product_sizes!size_id(label)");

    if (variantsErr) {
      const parsed = getResponseError(variantsErr);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        return NextResponse.json({ items: [], summary: { total_pending_orders_with_shortages: 0, total_missing_units: 0, total_affected_products: 0 }, grouped: [] });
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    const variantStockMap: Record<string, number> = {};
    for (const v of variants || []) {
      const pName = (v.products as any)?.name || "";
      const color = (v.product_colors as any)?.name || "";
      const size = (v.product_sizes as any)?.label || "";
      const key = `${pName}||${color}||${size}`;
      variantStockMap[key] = (variantStockMap[key] || 0) + (v.stock ?? 0);
    }

    const items: PendingShortageItem[] = [];
    const affectedOrderSet = new Set<string>();
    const affectedProductSet = new Set<string>();

    for (const order of orders) {
      let parsedItems: any[] = [];
      if (typeof order.items === "string") {
        try { parsedItems = JSON.parse(order.items); } catch { continue; }
      } else if (Array.isArray(order.items)) {
        parsedItems = order.items;
      }

      const displayId = order.display_id || `BLK-${String(order.id).padStart(6, "0")}`;
      const customerName = order.name || "Unknown";
      const orderDate = order.created_at || "";

      for (const item of parsedItems) {
        const pName = item.product_name || item.name || "";
        const color = item.color || "";
        const size = (item.size || "").replace(/^XXL$/i, "2XL").replace(/^XXXL$/i, "3XL");
        const orderedQty = Number(item.quantity) || 1;

        const key = `${pName}||${color}||${size}`;
        const currentStock = variantStockMap[key] || 0;
        const missing = Math.max(0, orderedQty - currentStock);

        if (missing <= 0) continue;

        let indicator: PendingShortageItem["status_indicator"];
        if (currentStock === 0) {
          indicator = "out_of_stock";
        } else if (currentStock < orderedQty) {
          indicator = "partial";
        } else {
          indicator = "full";
        }

        affectedOrderSet.add(order.id);
        affectedProductSet.add(pName);

        items.push({
          order_id: order.id,
          display_id: displayId,
          customer_name: customerName,
          order_date: orderDate,
          product_name: pName,
          color,
          size,
          ordered_quantity: orderedQty,
          current_stock: currentStock,
          missing_quantity: missing,
          status_indicator: indicator,
        });
      }
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
        quantity: item.ordered_quantity,
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
            missing_total: orderRefs.reduce((s, r) => s + r.quantity, 0),
            orders: orderRefs,
          });
        }
        colors.push({ color, sizes });
      }
      grouped.push({ product_name, colors });
    }

    const response: PendingShortagesResponse = { summary, items, grouped };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

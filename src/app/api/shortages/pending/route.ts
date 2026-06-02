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
  _debug?: {
    variant_id: string | null;
    product_id: string | null;
    color_id: string | null;
    size_id: string | null;
    stock_from_db: number;
    lookup_method: "variant_id" | "composite_id" | "text_key" | "fuzzy_text";
    matched_variant_product_name?: string;
  };
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

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

interface VariantRecord {
  id: string;
  stock: number;
  productName: string;
  color: string;
  size: string;
}

function fuzzyMatchStock(
  itemName: string,
  itemColor: string,
  itemSize: string,
  variants: VariantRecord[]
): { stock: number; matchedName: string; variantId: string } | null {
  const normItemName = normalizeText(itemName);
  const normItemColor = normalizeText(itemColor);
  const normItemSize = normalizeSize(normalizeText(itemSize));

  let best: { stock: number; matchedName: string; variantId: string; score: number } | null = null;

  for (const v of variants) {
    const normVarName = normalizeText(v.productName);
    const normVarColor = normalizeText(v.color);
    const normVarSize = normalizeSize(normalizeText(v.size));

    if (normVarColor !== normItemColor) continue;
    if (normVarSize !== normItemSize) continue;

    let score = 0;

    if (normVarName === normItemName) {
      score = 100;
    } else if (normVarName.includes(normItemName) || normItemName.includes(normVarName)) {
      score = 80;
    } else {
      const itemWords = normItemName.split(/\s+/).filter(Boolean);
      const varWords = normVarName.split(/\s+/).filter(Boolean);
      const allMatch = itemWords.every((w) => varWords.includes(w));
      if (allMatch && itemWords.length > 0) {
        score = 60;
      }
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { stock: v.stock, matchedName: v.productName, variantId: v.id, score };
    }
  }

  return best;
}

function parseItems(raw: unknown): any[] {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

function emptyResponse(): PendingShortagesResponse {
  return {
    summary: { total_pending_orders_with_shortages: 0, total_missing_units: 0, total_affected_products: 0 },
    items: [],
    grouped: [],
  };
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

    // ── Build variant lookup maps ──────────────────────────────────────────
    // Fetch ALL variants with their FK columns explicitly included.
    // Supabase does NOT return FK columns (product_id, color_id, size_id)
    // unless they are listed in the select string.
    const { data: allVariants, error: allVErr } = await admin
      .from("product_variants")
      .select(
        "id, stock, product_id, color_id, size_id, " +
        "products!product_id(name), " +
        "product_colors!color_id(name), " +
        "product_sizes!size_id(label)"
      );

    if (allVErr) {
      const parsed = getResponseError(allVErr);
      if (!parsed.tableNotFound && !parsed.htmlResponse) {
        return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
      }
    }

    const stockByVariantId = new Map<string, number>();
    const stockByCompositeId = new Map<string, number>();
    const stockByText = new Map<string, number>();
    const variantRecords: VariantRecord[] = [];

    for (const v of (allVariants || []) as unknown as Array<Record<string, unknown>>) {
      const sid = String(v.id);
      const s = Number(v.stock) || 0;

      stockByVariantId.set(sid, s);

      const pId = v.product_id as string | undefined;
      const cId = v.color_id as string | undefined;
      const szId = v.size_id as string | undefined;

      if (pId && cId && szId) {
        const compositeKey = `${pId}||${cId}||${szId}`;
        stockByCompositeId.set(compositeKey, s);
      }

      const pName = String((v.products as Record<string, unknown>)?.name || "");
      const color = String((v.product_colors as Record<string, unknown>)?.name || "");
      const size = String((v.product_sizes as Record<string, unknown>)?.label || "");
      if (pName && color && size) {
        const textKey = `${pName}||${color}||${size}`;
        const existing = stockByText.get(textKey) || 0;
        stockByText.set(textKey, existing + s);

        variantRecords.push({
          id: sid,
          stock: s,
          productName: pName,
          color,
          size,
        });
      }
    }

    console.log(
      "[api/shortages/pending] variant maps built:",
      JSON.stringify({
        byVariantId: stockByVariantId.size,
        byCompositeId: stockByCompositeId.size,
        byText: stockByText.size,
        fuzzyRecords: variantRecords.length,
        totalVariants: (allVariants || []).length,
        variantSample: [...stockByVariantId.entries()].slice(0, 3),
      })
    );

    // ── Evaluate each item independently ───────────────────────────────────
    const items: PendingShortageItem[] = [];
    const affectedOrderSet = new Set<string>();
    const affectedProductSet = new Set<string>();

    for (const p of allParsed) {
      let stock = 0;
      let lookupMethod: "variant_id" | "composite_id" | "text_key" | "fuzzy_text";
      let matchedVariantProductName: string | undefined;

      if (p.variantId) {
        const queried = stockByVariantId.get(p.variantId);
        if (queried !== undefined) {
          stock = queried;
          lookupMethod = "variant_id";
        } else {
          console.warn(
            "[api/shortages/pending] variant_id not found in DB:",
            p.variantId,
            "for item",
            p.productName,
            p.color,
            p.size
          );
          stock = 0;
          lookupMethod = "variant_id";
        }
      } else if (p.productId && p.colorId && p.sizeId) {
        const compositeKey = `${p.productId}||${p.colorId}||${p.sizeId}`;
        stock = stockByCompositeId.get(compositeKey) ?? 0;
        lookupMethod = "composite_id";
      } else {
        const textKey = `${p.productName}||${p.color}||${p.size}`;
        stock = stockByText.get(textKey) ?? 0;
        lookupMethod = "text_key";
      }

      // If exact text key failed and we have a variantRecords array, try fuzzy
      if (stock === 0 && lookupMethod === "text_key" && variantRecords.length > 0) {
        const fuzzy = fuzzyMatchStock(p.productName, p.color, p.size, variantRecords);
        if (fuzzy) {
          stock = fuzzy.stock;
          lookupMethod = "fuzzy_text";
          matchedVariantProductName = fuzzy.matchedName;
          console.log(
            "[api/shortages/pending] FUZZY MATCH:",
            `"${p.productName}" "${p.color}" "${p.size}"`,
            `→ variant "${fuzzy.matchedName}" (id=${fuzzy.variantId})`,
            `stock=${fuzzy.stock}`
          );
        }
      }

      console.log(
        "[SHORTAGE CHECK]",
        JSON.stringify({
          product: p.productName,
          color: p.color,
          size: p.size,
          variantId: p.variantId,
          productId: p.productId,
          colorId: p.colorId,
          sizeId: p.sizeId,
          stock,
          ordered: p.orderedQty,
          lookupMethod,
          matchedVariantProductName,
        })
      );

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

      const shortageItem: PendingShortageItem = {
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
        _debug: {
          variant_id: p.variantId,
          product_id: p.productId,
          color_id: p.colorId,
          size_id: p.sizeId,
          stock_from_db: stock,
          lookup_method: lookupMethod,
          ...(matchedVariantProductName ? { matched_variant_product_name: matchedVariantProductName } : {}),
        },
      };

      // Log every item with stock=0
      if (stock === 0) {
        console.log(
          "[api/shortages/pending] STOCK_ZERO:",
          JSON.stringify(shortageItem._debug),
          "product:",
          p.productName,
          p.color,
          p.size
        );
      }

      items.push(shortageItem);
    }

    const totalMissing = items.reduce((sum, i) => sum + i.missing_quantity, 0);

    const summary = {
      total_pending_orders_with_shortages: affectedOrderSet.size,
      total_missing_units: totalMissing,
      total_affected_products: affectedProductSet.size,
    };

    // ── Build grouped output ───────────────────────────────────────────────
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

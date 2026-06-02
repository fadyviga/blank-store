import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export interface ShortageItem {
  product_name: string;
  color: string;
  size: string;
  available_stock: number;
  required_quantity: number;
  shortage: number;
}

interface ShortageSummary {
  total_missing_units: number;
  products_with_shortages: number;
  affected_orders: number;
}

interface RestockColor {
  color: string;
  sizes: { size: string; shortage: number }[];
  total_needed: number;
}

interface RestockPlanning {
  product_name: string;
  colors: RestockColor[];
}

interface ShortagesResponse {
  shortages: ShortageItem[];
  summary: ShortageSummary;
  restock_planning: RestockPlanning[];
}

export async function GET(request: NextRequest) {
  try {
    const admin = getAdminClient();
    const { searchParams } = new URL(request.url);

    const productFilter = searchParams.get("product")?.toLowerCase() || "";
    const colorFilter = searchParams.get("color")?.toLowerCase() || "";
    const sizeFilter = searchParams.get("size")?.toLowerCase() || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const format = searchParams.get("format") || "json";

    let orderQuery = admin
      .from("orders")
      .select("items, status, created_at")
      .in("status", ["pending", "processing"]);

    if (startDate) orderQuery = orderQuery.gte("created_at", startDate);
    if (endDate) orderQuery = orderQuery.lte("created_at", endDate + "T23:59:59.999Z");

    const { data: orders, error: ordersErr } = await orderQuery;

    if (ordersErr) {
      const parsed = getResponseError(ordersErr);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    const requiredMap: Record<string, { product_name: string; color: string; size: string; quantity: number }> = {};
    let affectedOrders = 0;

    for (const order of orders || []) {
      let items: any[] = [];
      if (typeof order.items === "string") {
        try { items = JSON.parse(order.items); } catch { continue; }
      } else if (Array.isArray(order.items)) {
        items = order.items;
      }

      let hasRelevantItem = false;
      for (const item of items) {
        const pName = item.product_name || item.name || "";
        const color = item.color || "";
        const size = (item.size || "").replace(/^XXL$/i, "2XL").replace(/^XXXL$/i, "3XL");
        const qty = Number(item.quantity) || 1;

        if (productFilter && !pName.toLowerCase().includes(productFilter)) continue;
        if (colorFilter && !color.toLowerCase().includes(colorFilter)) continue;
        if (sizeFilter && !size.toLowerCase().includes(sizeFilter)) continue;

        const key = `${pName}||${color}||${size}`;
        if (!requiredMap[key]) {
          requiredMap[key] = { product_name: pName, color, size, quantity: 0 };
        }
        requiredMap[key].quantity += qty;
        hasRelevantItem = true;
      }
      if (hasRelevantItem) affectedOrders++;
    }

    const { data: variants, error: variantsErr } = await admin
      .from("product_variants")
      .select("stock, products!product_id(name), product_colors!color_id(name), product_sizes!size_id(label)");

    if (variantsErr) {
      const parsed = getResponseError(variantsErr);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        return NextResponse.json([]);
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

    const shortages: ShortageItem[] = [];

    for (const [key, req] of Object.entries(requiredMap)) {
      const available = variantStockMap[key] || 0;
      const shortage = req.quantity - available;
      if (shortage <= 0) continue;

      shortages.push({
        product_name: req.product_name,
        color: req.color,
        size: req.size,
        available_stock: available,
        required_quantity: req.quantity,
        shortage,
      });
    }

    shortages.sort((a, b) => b.shortage - a.shortage);

    const uniqueProducts = new Set(shortages.map((s) => s.product_name));
    const totalMissing = shortages.reduce((sum, s) => sum + s.shortage, 0);

    const summary: ShortageSummary = {
      total_missing_units: totalMissing,
      products_with_shortages: uniqueProducts.size,
      affected_orders: affectedOrders,
    };

    const planningMap = new Map<string, Map<string, RestockColor>>();
    for (const s of shortages) {
      if (!planningMap.has(s.product_name)) {
        planningMap.set(s.product_name, new Map());
      }
      const colorMap = planningMap.get(s.product_name)!;
      if (!colorMap.has(s.color)) {
        colorMap.set(s.color, { color: s.color, sizes: [], total_needed: 0 });
      }
      const colorEntry = colorMap.get(s.color)!;
      colorEntry.sizes.push({ size: s.size, shortage: s.shortage });
      colorEntry.total_needed += s.shortage;
    }

    const restock_planning: RestockPlanning[] = [];
    for (const [product_name, colorMap] of planningMap) {
      restock_planning.push({
        product_name,
        colors: Array.from(colorMap.values()),
      });
    }

    const response: ShortagesResponse = { shortages, summary, restock_planning };

    if (format === "csv") {
      const header = "Product Name,Color,Size,Available Stock,Required Quantity,Shortage";
      const rows = shortages.map(
        (s) =>
          `"${s.product_name}","${s.color}","${s.size}",${s.available_stock},${s.required_quantity},${s.shortage}`
      );
      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=shortages.csv",
        },
      });
    }

    if (format === "xlsx") {
      const header = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Shortages">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">Product Name</Data></Cell>
    <Cell><Data ss:Type="String">Color</Data></Cell>
    <Cell><Data ss:Type="String">Size</Data></Cell>
    <Cell><Data ss:Type="String">Available Stock</Data></Cell>
    <Cell><Data ss:Type="String">Required Quantity</Data></Cell>
    <Cell><Data ss:Type="String">Shortage</Data></Cell>
   </Row>`;
      const rows = shortages
        .map(
          (s) =>
            `   <Row>
    <Cell><Data ss:Type="String">${escXml(s.product_name)}</Data></Cell>
    <Cell><Data ss:Type="String">${escXml(s.color)}</Data></Cell>
    <Cell><Data ss:Type="String">${escXml(s.size)}</Data></Cell>
    <Cell><Data ss:Type="Number">${s.available_stock}</Data></Cell>
    <Cell><Data ss:Type="Number">${s.required_quantity}</Data></Cell>
    <Cell><Data ss:Type="Number">${s.shortage}</Data></Cell>
   </Row>`
        )
        .join("\n");
      const footer = `  </Table>
 </Worksheet>
</Workbook>`;
      const xlsx = header + "\n" + rows + "\n" + footer;
      return new NextResponse(xlsx, {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": "attachment; filename=shortages.xls",
        },
      });
    }

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

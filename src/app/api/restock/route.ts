import { NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("product_variants")
      .select("*, product_colors(name), product_sizes(label), products!product_id(name)")
      .lt("stock", 0)
      .order("stock", { ascending: true });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        console.error("[api/restock] Variants table not found. Run schema migration.");
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    const items = (data || []).map((v: any) => {
      const stock = v.stock ?? 0;
      const productName = v.products?.name || "Oversized Tee";
      return {
        id: v.id,
        sku: v.sku,
        stock,
        missing: Math.abs(stock),
        stock_level: stock <= -5 ? "critical_stock" : "low_stock",
        product_name: productName,
        color: v.product_colors?.name || "Unknown",
        size: v.product_sizes?.label || "Unknown",
        whatsapp_url: `https://wa.me/201287659463?text=${encodeURIComponent(
          `⚠️ Restock Alert:\nProduct: ${productName}\nVariant: ${v.product_colors?.name || "Unknown"} - ${v.product_sizes?.label || "Unknown"}\nStock: ${stock}`
        )}`,
      };
    });

    return NextResponse.json({
      total: items.length,
      critical: items.filter((i: any) => i.stock_level === "critical_stock").length,
      items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

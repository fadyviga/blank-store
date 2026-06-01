import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

interface ProductStock {
  productId: string;
  productName: string;
  totalStock: number;
}

interface LowStockVariant {
  variantId: string;
  productName: string;
  stock: number;
}

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: variants, error: vErr } = await admin
      .from("product_variants")
      .select("id, product_id, stock, products(name)");

    if (vErr) {
      return NextResponse.json({ error: vErr.message }, { status: 500 });
    }

    let totalStock = 0;
    const stockByProduct: Record<string, { name: string; stock: number }> = {};
    const lowStockThreshold = Number(process.env.LOW_STOCK_THRESHOLD) || 5;
    const lowStockVariants: LowStockVariant[] = [];

    for (const v of variants || []) {
      const stock = Number(v.stock) || 0;
      totalStock += stock;

      const pid = v.product_id;
      const pName = (v.products as { name?: string } | null)?.name || "Unknown";
      if (!stockByProduct[pid]) {
        stockByProduct[pid] = { name: pName, stock: 0 };
      }
      stockByProduct[pid].stock += stock;

      if (stock > 0 && stock <= lowStockThreshold) {
        lowStockVariants.push({ variantId: v.id, productName: pName, stock });
      }
    }

    const perProduct: ProductStock[] = Object.entries(stockByProduct)
      .map(([productId, data]) => ({ productId, productName: data.name, totalStock: data.stock }))
      .sort((a, b) => b.totalStock - a.totalStock);

    return NextResponse.json({
      totalStock,
      perProduct,
      lowStockVariants,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

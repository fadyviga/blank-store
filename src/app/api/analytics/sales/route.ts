import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

interface ProductSale {
  productId: string;
  productName: string;
  quantitySold: number;
}

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: orders, error: oErr } = await admin
      .from("orders")
      .select("items")
      .eq("status", "completed");

    if (oErr) {
      return NextResponse.json({ error: oErr.message }, { status: 500 });
    }

    const salesByProduct: Record<string, { name: string; qty: number }> = {};
    let totalSold = 0;

    for (const order of orders || []) {
      let items: any[] = [];
      if (typeof order.items === "string") {
        try { items = JSON.parse(order.items); } catch { continue; }
      } else if (Array.isArray(order.items)) {
        items = order.items;
      }

      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        totalSold += qty;

        const pid = item.product_id || item.id || "unknown";
        const name = item.name || "Unknown Item";
        if (!salesByProduct[pid]) {
          salesByProduct[pid] = { name, qty: 0 };
        }
        salesByProduct[pid].qty += qty;
      }
    }

    const perProduct: ProductSale[] = Object.entries(salesByProduct)
      .map(([productId, data]) => ({ productId, productName: data.name, quantitySold: data.qty }))
      .sort((a, b) => b.quantitySold - a.quantitySold);

    return NextResponse.json({
      totalSold,
      perProduct,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

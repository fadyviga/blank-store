import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

interface TopSellingProduct {
  productName: string;
  unitsSold: number;
  salesValue: number;
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

    const salesByProduct: Record<
      string,
      { name: string; units: number; value: number }
    > = {};
    let totalUnitsSold = 0;
    let totalSalesValue = 0;

    for (const order of orders || []) {
      let items: any[] = [];
      if (typeof order.items === "string") {
        try { items = JSON.parse(order.items); } catch { continue; }
      } else if (Array.isArray(order.items)) {
        items = order.items;
      }

      for (const item of items) {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        const lineValue = qty * price;

        totalUnitsSold += qty;
        totalSalesValue += lineValue;

        const pid = item.product_id || item.id || "unknown";
        const name = item.name || "Unknown Item";

        if (!salesByProduct[pid]) {
          salesByProduct[pid] = { name, units: 0, value: 0 };
        }
        salesByProduct[pid].units += qty;
        salesByProduct[pid].value += lineValue;
      }
    }

    const topSellingProducts: TopSellingProduct[] = Object.values(salesByProduct)
      .map(({ name, units, value }) => ({
        productName: name,
        unitsSold: units,
        salesValue: value,
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold);

    return NextResponse.json({
      totalUnitsSold,
      totalSalesValue,
      topSellingProducts,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

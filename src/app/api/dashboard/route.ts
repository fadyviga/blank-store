import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
    const customers = new Set(
      orders?.map((o) => o.customer_phone || o.user_id).filter(Boolean)
    );
    const totalCustomers = customers.size;

    const { data: products, error: prodErr } = await admin
      .from("products")
      .select("id, name");

    if (prodErr) {
      return NextResponse.json({ error: prodErr.message }, { status: 500 });
    }

    const { data: variants, error: varErr } = await admin
      .from("product_variants")
      .select("*, product_colors(name), product_sizes(label)")
      .order("stock", { ascending: true });

    if (varErr) {
      return NextResponse.json({ error: varErr.message }, { status: 500 });
    }

    const lowStockVariants = variants?.filter((v) => v.stock > 0 && v.stock <= 5) || [];
    const outOfStockVariants = variants?.filter((v) => v.stock <= 0) || [];
    const totalVariants = variants?.length || 0;
    const totalProducts = products?.length || 0;

    const monthlyRevenue: Record<string, number> = {};
    orders?.forEach((o) => {
      if (o.status !== "cancelled") {
        const month = o.created_at?.slice(0, 7);
        if (month) monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (o.total || 0);
      }
    });

    const revenueByMonth = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));

    const recentOrders = orders?.slice(0, 10) || [];
    const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;

    return NextResponse.json({
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalProducts,
      totalVariants,
      lowStockVariants: lowStockVariants.length,
      outOfStockVariants: outOfStockVariants.length,
      pendingOrders,
      lowStockItems: lowStockVariants,
      outOfStockItems: outOfStockVariants,
      recentOrders,
      revenueByMonth,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

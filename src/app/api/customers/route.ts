import { NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: orders, error: ordersErr } = await admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersErr) {
      const parsed = getResponseError(ordersErr);
      if (parsed.htmlResponse || parsed.tableNotFound) {
        console.error("[api/customers] Supabase unreachable:", parsed.cleanedMessage);
        return NextResponse.json([]);
      }
      return NextResponse.json([]);
    }

    const customerMap = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        email: string;
        totalOrders: number;
        totalSpent: number;
        firstOrder: string;
        lastOrder: string;
      }
    >();

    orders?.forEach((o) => {
      const key = o.phone || o.name || o.id;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: o.user_id || String(o.id),
          name: o.name || o.customer_name || "Unknown",
          phone: o.phone || o.customer_phone || "",
          email: o.email || o.customer_email || "",
          totalOrders: 0,
          totalSpent: 0,
          firstOrder: o.created_at,
          lastOrder: o.created_at,
        });
      }
      const c = customerMap.get(key)!;
      c.totalOrders++;
      c.totalSpent += o.total || 0;
      if (o.created_at > c.lastOrder) c.lastOrder = o.created_at;
      if (o.created_at < c.firstOrder) c.firstOrder = o.created_at;
    });

    return NextResponse.json(Array.from(customerMap.values()));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

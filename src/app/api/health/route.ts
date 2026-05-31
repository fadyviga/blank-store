import { NextResponse } from "next/server";
import { getAdminClient, getSupabaseStatus } from "@/lib/supabase-admin";

export async function GET() {
  const dbStatus = getSupabaseStatus();
  const diagnostics: Record<string, unknown> = {};

  if (dbStatus.configured) {
    try {
      const admin = getAdminClient();

      // Try to detect actual columns by attempting inserts with minimal data
      const testId = crypto.randomUUID();
      const testCols: Record<string, string | number> = {
        id: testId,
        display_id: "DIAG",
        status: "pending",
      };

      // Test which columns exist by trying one at a time
      const columnTests = [
        "total",
        "subtotal",
        "delivery",
        "customer_name",
        "customer_phone",
        "customer_address",
        "customer_email",
        "user_id",
        "created_at",
        "internal_notes",
        "tracking_number",
      ];

      const existingColumns: string[] = ["id", "display_id", "status"];
      for (const col of columnTests) {
        const row: Record<string, unknown> = { id: testId, display_id: "DIAG_" + col, status: "pending" };
        row[col] = col === "user_id" ? testId : col === "created_at" ? new Date().toISOString() : col.includes("notes") || col.includes("tracking") ? "" : 0;
        const { error } = await admin.from("orders").insert(row);
        if (!error) {
          existingColumns.push(col);
        }
        // Clean up test rows
        await admin.from("orders").delete().eq("id", row.id);
      }

      diagnostics.existingColumns = existingColumns;
      diagnostics.tableExists = true;

      // Test order_items table
      const { data: itemData, error: itemError } = await admin
        .from("order_items")
        .select("*")
        .limit(0);
      diagnostics.orderItemsTableExists = !itemError;
      diagnostics.orderItemsError = itemError?.message || null;

      // Try to detect order_items columns
      if (!itemError) {
        const itemColumnTests = ["order_id", "product_name", "color", "size", "price", "quantity", "image"];
        const existingItemCols: string[] = [];
        for (const col of itemColumnTests) {
          const row: Record<string, unknown> = { id: testId };
          row[col] = col === "price" || col === "quantity" ? 0 : col === "order_id" ? testId : "test";
          const { error: insErr } = await admin.from("order_items").insert(row);
          if (!insErr) {
            existingItemCols.push(col);
          }
          await admin.from("order_items").delete().eq("id", testId);
        }
        diagnostics.existingOrderItemColumns = existingItemCols;
      }
    } catch (err) {
      diagnostics.error = err instanceof Error ? err.message : String(err);
    }
  }

  const health = {
    status: dbStatus.configured ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    diagnostics,
    api: {
      routes: [
        "/api/orders",
        "/api/products",
        "/api/variants",
        "/api/inventory",
        "/api/colors",
        "/api/sizes",
        "/api/customers",
        "/api/dashboard",
      ],
    },
  };

  return NextResponse.json(health, {
    status: dbStatus.configured ? 200 : 503,
  });
}

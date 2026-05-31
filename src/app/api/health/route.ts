import { NextResponse } from "next/server";
import { getAdminClient, getSupabaseStatus } from "@/lib/supabase-admin";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function maskUrl(url: string): string {
  try { const u = new URL(url); return `${u.protocol}//${u.hostname}${u.pathname.length > 1 ? "/[...]" : ""}`; }
  catch { return "(invalid URL)"; }
}

function maskKey(key: string): string {
  if (key.length < 16) return "(too short)";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

export async function GET() {
  const dbStatus = getSupabaseStatus();
  const diagnostics: Record<string, unknown> = {};

  diagnostics.env = {
    NEXT_PUBLIC_SUPABASE_URL: rawUrl ? maskUrl(rawUrl) : "(not set)",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? maskKey(process.env.SUPABASE_SERVICE_ROLE_KEY) : "(not set)",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "(not set)",
  };

  diagnostics.tableTests = {};

  if (dbStatus.configured) {
    try {
      const admin = getAdminClient();

      // Test which tables exist
      const tablesToTest = ["orders", "products", "product_colors", "product_variants", "product_sizes", "inventory_logs", "cart_items"];
      for (const table of tablesToTest) {
        try {
          const { error } = await admin.from(table as any).select("id").limit(1);
          diagnostics.tableTests[table] = error ? `ERROR: ${error.message?.slice(0, 80)}` : "EXISTS";
        } catch (e) {
          diagnostics.tableTests[table] = `CRASH: ${e instanceof Error ? e.message : String(e)}`;
        }
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
    api: { routes: ["/api/orders", "/api/products", "/api/variants", "/api/inventory", "/api/colors", "/api/sizes", "/api/customers", "/api/dashboard"] },
  };

  return NextResponse.json(health, { status: dbStatus.configured ? 200 : 503 });
}

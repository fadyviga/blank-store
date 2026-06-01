import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get("periodStart");
    const periodEnd = searchParams.get("periodEnd");

    const admin = getAdminClient();
    let query = admin
      .from("profit_distributions")
      .select("*")
      .eq("partner_id", id)
      .order("distributed_at", { ascending: false });

    if (periodStart) {
      query = query.gte("period_start", periodStart);
    }
    if (periodEnd) {
      query = query.lte("period_end", periodEnd);
    }

    const { data, error } = await query;

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ data: [], warning: "profit_distributions table not found" });
      }
      return NextResponse.json({ error: parsed.cleanedMessage, data: [] }, { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error", data: [] }, { status: 500 });
  }
}

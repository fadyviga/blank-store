import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/dashboard-auth";

export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("product_sizes")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        console.error("[api/sizes] Sizes table not found. Run schema migration.");
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = requireAdmin(request);
  if (access) return access;
  try {
    const body = await request.json();
    const { label, sortOrder } = body;
    if (!label?.trim()) {
      return NextResponse.json({ error: "Size label is required" }, { status: 400 });
    }
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("product_sizes")
      .insert({ label: label.trim().toUpperCase(), sort_order: sortOrder || 0 })
      .select()
      .single();
    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ error: "Sizes table not configured yet." }, { status: 501 });
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const access = requireAdmin(request);
  if (access) return access;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Size ID is required" }, { status: 400 });
    const admin = getAdminClient();
    const { error } = await admin.from("product_sizes").delete().eq("id", id);
    if (error) return NextResponse.json({ error: getResponseError(error).cleanedMessage }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

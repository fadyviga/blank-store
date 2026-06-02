import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/dashboard-auth";

export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("product_colors")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        console.error("[api/colors] Colors table not found. Run schema migration.");
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
    const { productId, name, hex, image } = body;
    if (!productId || !name?.trim()) {
      return NextResponse.json({ error: "productId and name are required" }, { status: 400 });
    }
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("product_colors")
      .insert({ product_id: productId, name: name.trim(), hex: hex || "#000000", image: image || "" })
      .select()
      .single();
    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ error: "Colors table not configured yet." }, { status: 501 });
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
    if (!id) return NextResponse.json({ error: "Color ID is required" }, { status: 400 });
    const admin = getAdminClient();
    const { error } = await admin.from("product_colors").delete().eq("id", id);
    if (error) return NextResponse.json({ error: getResponseError(error).cleanedMessage }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

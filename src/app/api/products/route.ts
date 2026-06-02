import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/dashboard-auth";

export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("products")
      .select("*, product_colors(*), product_variants(*)")
      .order("sort_order", { ascending: true, nullsFirst: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        console.error("[api/products] Products table not found. Run schema migration.");
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
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    const { name, description, basePrice, price, comparePrice, category, image, images, sortOrder } = body as { name?: string; description?: string; basePrice?: number; price?: number; comparePrice?: number | null; category?: string; image?: string; images?: string[]; sortOrder?: number };
    if (!name?.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    const admin = getAdminClient();
    const insertRow: Record<string, unknown> = {
      name: name.trim(),
      description: description || "",
      base_price: basePrice || 0,
      price: price ?? basePrice ?? 0,
      compare_price: comparePrice || null,
      category: category || "tees",
      image: image || "",
      images: images || [],
      sort_order: sortOrder ?? 0,
    };
    const { data, error } = await admin
      .from("products")
      .insert(insertRow)
      .select()
      .single();
    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound) {
        return NextResponse.json({ error: "Products table not configured yet. Run schema migration." }, { status: 501 });
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = requireAdmin(request);
  if (access) return access;
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    const { id, name, description, basePrice, price, comparePrice, category, image, images, sortOrder } = body as { id?: string; name?: string; description?: string; basePrice?: number; price?: number; comparePrice?: number | null; category?: string; image?: string; images?: string[]; sortOrder?: number };
    if (!id) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    const admin = getAdminClient();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (basePrice !== undefined) updates.base_price = basePrice;
    if (price !== undefined) updates.price = price;
    if (comparePrice !== undefined) updates.compare_price = comparePrice;
    if (category !== undefined) updates.category = category;
    if (image !== undefined) updates.image = image;
    if (images !== undefined) updates.images = images;
    if (sortOrder !== undefined) updates.sort_order = sortOrder;
    const { data, error } = await admin.from("products").update(updates).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: getResponseError(error).cleanedMessage }, { status: 500 });
    return NextResponse.json(data);
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
    if (!id) return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    const admin = getAdminClient();
    const { error } = await admin.from("products").delete().eq("id", id);
    if (error) return NextResponse.json({ error: getResponseError(error).cleanedMessage }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

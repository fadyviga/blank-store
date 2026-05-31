import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const logId = Date.now().toString(36);
  console.log(`[api/orders:${logId}] GET`, Object.fromEntries(searchParams));

  try {
    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      const msg = configErr instanceof Error ? configErr.message : "Supabase not configured";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data, error } = await admin.from("orders").select("*").order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orders = (data || []).map((row: any) => ({
      id: String(row.id),
      displayId: row.display_id || `BLK-${String(row.id).padStart(6, "0")}`,
      customer: {
        name: row.name || "",
        phone: row.phone || "",
        address: row.address || row.customer_address || "",
        email: row.email || "",
      },
      items: typeof row.items === "string" ? JSON.parse(row.items) : (row.items || []),
      subtotal: row.subtotal || row.total || 0,
      delivery: row.delivery || 0,
      total: row.total || 0,
      status: row.status || "pending",
      createdAt: row.created_at || new Date().toISOString(),
      userId: row.user_id || null,
      internalNotes: row.internal_notes || "",
      trackingNumber: row.tracking_number || "",
    }));

    return NextResponse.json(orders);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const { customer, items, subtotal, userId } = body as {
      customer?: { name?: string; phone?: string; address?: string; email?: string };
      items?: Array<{ name: string; color?: string; size?: string; price: number; quantity: number; image?: string }>;
      subtotal?: number;
      userId?: string;
    };

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields: customer, items" }, { status: 400 });
    }
    if (!customer.name?.trim()) return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    if (!customer.phone?.trim()) return NextResponse.json({ error: "Customer phone is required" }, { status: 400 });
    if (!customer.address?.trim()) return NextResponse.json({ error: "Customer address is required" }, { status: 400 });

    const delivery = (subtotal || 0) >= 1000 ? 0 : 50;
    const total = (subtotal || 0) + delivery;

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      return NextResponse.json(
        { error: configErr instanceof Error ? configErr.message : "Supabase not configured" },
        { status: 500 }
      );
    }

    // Only use columns that exist in the actual DB schema
    const orderRow: Record<string, unknown> = {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      address: customer.address.trim(),
      items: JSON.stringify(items),
      total,
      created_at: new Date().toISOString(),
    };

    console.log(`[api/orders:${logId}] Inserting order with columns:`, Object.keys(orderRow));

    const { data: inserted, error: orderErr } = await admin
      .from("orders")
      .insert(orderRow)
      .select()
      .maybeSingle();

    if (orderErr) {
      console.error(`[api/orders:${logId}] Insert error:`, orderErr);
      return NextResponse.json({ error: `Failed to create order: ${orderErr.message}` }, { status: 500 });
    }

    const orderId = inserted?.id || String(Date.now());
    const displayId = `BLK-${String(orderId).padStart(6, "0")}`;

    console.log(`[api/orders:${logId}] Order created: ${displayId} (id=${orderId})`);

    return NextResponse.json({
      success: true,
      order: {
        id: String(orderId),
        displayId,
        customer,
        items,
        subtotal: subtotal || 0,
        delivery,
        total,
        status: "pending",
        createdAt: new Date().toISOString(),
        userId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api/orders:${logId}] Unhandled error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id, status, internalNotes, trackingNumber } = body;

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      return NextResponse.json(
        { error: configErr instanceof Error ? configErr.message : "Supabase not configured" },
        { status: 500 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (internalNotes !== undefined) updates.internal_notes = internalNotes;
    if (trackingNumber !== undefined) updates.tracking_number = trackingNumber;

    const { error } = await admin.from("orders").update(updates).eq("id", id);
    if (error) {
      if (error.message?.includes("Could not find the")) {
        return NextResponse.json({
          error: `Database column missing: ${error.message}. Run the schema migration SQL in your Supabase SQL Editor to add missing columns.`,
          migrationFile: "schema-fix.sql",
        }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Order ID is required" }, { status: 400 });

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      return NextResponse.json(
        { error: configErr instanceof Error ? configErr.message : "Supabase not configured" },
        { status: 500 }
      );
    }

    const { error } = await admin.from("orders").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

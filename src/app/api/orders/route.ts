import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

function generateDisplayId(): string {
  const hex = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join("");
  return `BLK-${hex}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const admin = getAdminClient();
    let query = admin
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq("user_id", userId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, items, subtotal, userId } = body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: customer, items" },
        { status: 400 }
      );
    }

    if (!customer.name?.trim()) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (!customer.phone?.trim()) {
      return NextResponse.json(
        { error: "Customer phone is required" },
        { status: 400 }
      );
    }

    if (!customer.address?.trim()) {
      return NextResponse.json(
        { error: "Customer address is required" },
        { status: 400 }
      );
    }

    const delivery = subtotal >= 1000 ? 0 : 50;
    const total = subtotal + delivery;

    const orderId = crypto.randomUUID();
    const displayId = generateDisplayId();
    const createdAt = new Date().toISOString();

    const admin = getAdminClient();

    const orderRow = {
      id: orderId,
      user_id: userId || null,
      display_id: displayId,
      customer_name: customer.name.trim(),
      customer_phone: customer.phone.trim(),
      customer_address: customer.address.trim(),
      customer_email: customer.email || "",
      subtotal,
      delivery,
      total,
      status: "pending",
      created_at: createdAt,
    };

    const { error: orderErr } = await admin.from("orders").insert(orderRow);
    if (orderErr) {
      return NextResponse.json(
        { error: `Failed to create order: ${orderErr.message}` },
        { status: 500 }
      );
    }

    const orderItems = items.map(
      (item: {
        name: string;
        color?: string;
        size?: string;
        price: number;
        quantity: number;
        image?: string;
      }) => ({
        order_id: orderId,
        product_name: item.name,
        color: item.color || "",
        size: item.size || "",
        price: item.price,
        quantity: item.quantity,
        image: item.image || "",
      })
    );

    const { error: itemsErr } = await admin
      .from("order_items")
      .insert(orderItems);
    if (itemsErr) {
      await admin.from("orders").delete().eq("id", orderId);
      return NextResponse.json(
        { error: `Failed to create order items: ${itemsErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        displayId,
        customer,
        items,
        subtotal,
        delivery,
        total,
        status: "pending",
        createdAt,
        userId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, internalNotes, trackingNumber } = body;

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const updates: Record<string, string> = {};
    if (status) updates.status = status;
    if (internalNotes !== undefined) updates.internal_notes = internalNotes;
    if (trackingNumber !== undefined) updates.tracking_number = trackingNumber;

    const { error } = await admin.from("orders").update(updates).eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    const { error: itemsErr } = await admin
      .from("order_items")
      .delete()
      .eq("order_id", id);
    if (itemsErr) {
      return NextResponse.json({ error: itemsErr.message }, { status: 500 });
    }

    const { error } = await admin.from("orders").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

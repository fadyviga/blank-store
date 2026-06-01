import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const admin = getAdminClient();

    const { data: coupons, error } = await admin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
    }

    return NextResponse.json(coupons || []);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
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

    // Admin create mode
    if (body._admin === true) {
      const { code, discount_value, discount_type } = body as {
        code?: string;
        discount_value?: number;
        discount_type?: string;
      };

      if (!code || typeof code !== "string" || !code.trim()) {
        return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
      }
      if (!discount_value || discount_value <= 0) {
        return NextResponse.json({ error: "Discount value must be greater than 0" }, { status: 400 });
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

      // Check for duplicate
      const { data: existing } = await admin
        .from("coupons")
        .select("id")
        .ilike("code", code.trim())
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 409 });
      }

      const { data: created, error: insertErr } = await admin
        .from("coupons")
        .insert({
          code: code.trim().toUpperCase(),
          discount_value: discount_value,
          discount_type: discount_type === "percentage" ? "percentage" : "fixed",
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) {
        const parsed = getResponseError(insertErr);
        return NextResponse.json({ error: parsed.cleanedMessage }, { status: 500 });
      }

      return NextResponse.json(created, { status: 201 });
    }

    // Public validation mode (existing checkout flow)
    const { code, orderTotal } = body as { code?: string; orderTotal?: number };

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ valid: false, error: "Coupon code is required" }, { status: 400 });
    }

    console.log(`[api/coupons:${logId}] Validating code="${code.trim()}", orderTotal=${orderTotal}`);

    let admin;
    try {
      admin = getAdminClient();
    } catch (configErr) {
      const msg = configErr instanceof Error ? configErr.message : "Supabase not configured";
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data: coupon, error } = await admin
      .from("coupons")
      .select("*")
      .ilike("code", code.trim())
      .maybeSingle();

    if (error) {
      const parsed = getResponseError(error);
      if (parsed.tableNotFound || parsed.htmlResponse) {
        console.error(`[api/coupons:${logId}] Coupons table not found: ${parsed.cleanedMessage}`);
        return NextResponse.json({ valid: false, error: "Invalid discount code" });
      }
      console.error(`[api/coupons:${logId}] Query error: ${parsed.cleanedMessage}`);
      return NextResponse.json({ valid: false, error: "Invalid discount code" });
    }

    if (!coupon) {
      console.log(`[api/coupons:${logId}] Coupon not found for code="${code.trim()}"`);
      return NextResponse.json({ valid: false, error: "Invalid discount code" });
    }

    if (coupon.is_active !== true) {
      console.log(`[api/coupons:${logId}] Coupon found but is_active=false (id=${coupon.id})`);
      return NextResponse.json({ valid: false, error: "Invalid discount code" });
    }

    const discountType: "fixed" | "percentage" = coupon.discount_type === "percentage" ? "percentage" : "fixed";
    const discountValue = Number(coupon.discount_value) || 0;

    if (discountType === "fixed" && typeof orderTotal === "number" && discountValue > orderTotal) {
      console.log(`[api/coupons:${logId}] Discount ${discountValue} exceeds orderTotal ${orderTotal}`);
      return NextResponse.json({ valid: false, error: "Invalid discount code" });
    }

    console.log(`[api/coupons:${logId}] Coupon valid: id=${coupon.id}, type=${discountType}, value=${discountValue}`);
    return NextResponse.json({ valid: true, discountType, discountValue: Number(discountValue) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[api/coupons:${logId}] Unhandled error:`, message);
    return NextResponse.json({ valid: false, error: "Invalid discount code" });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Coupon ID is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin.from("coupons").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: getResponseError(error).cleanedMessage }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

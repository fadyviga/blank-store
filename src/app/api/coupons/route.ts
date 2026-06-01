import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getResponseError } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const logId = Date.now().toString(36);

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

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

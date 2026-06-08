"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, Loader2, Ruler, Tag, XCircle, Package } from "lucide-react";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { saveOrder } from "../../lib/order";
import SizeChart from "../components/SizeChart";
import {
  DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  getApplicableBundle,
  getBundleTotal,
  getBundleSavings,
} from "@/types";

interface Errors {
  name?: string;
  phone?: string;
  address?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [apiDiagnostics, setApiDiagnostics] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountValue: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.name || user.email.split("@")[0] || "");
      setPhone((prev) => prev || user.phone || "");
    }
  }, [user]);

  const cartCtx = useCart();
  const cart = cartCtx?.cart ?? [];
  const cartTotal = cartCtx?.cartTotal ?? 0;
  const clearCart = cartCtx?.clearCart ?? (() => {});

  const validate = (): Errors => {
    const errs: Errors = {};
    if (!name.trim()) errs.name = "Please enter your name";
    if (!phone.trim()) errs.phone = "Please enter your phone number";
    else {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 11)
        errs.phone = "Enter a valid Egyptian phone number (e.g. 01012345678)";
    }
    if (!address.trim()) errs.address = "Please enter your delivery address";
    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  const checkApiHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setApiDiagnostics(
        `API: ${data.status}, DB: ${data.database?.configured ? "configured" : "missing key"}, URL: ${data.database?.url ? "ok" : "missing"}`
      );
    } catch {
      setApiDiagnostics("API health check failed - endpoint unreachable");
    }
  }, []);

  useEffect(() => {
    checkApiHealth();
  }, [checkApiHealth]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setAppliedCoupon(null);
    try {
      const effectiveTotal = hasBundle ? bundleTotal + delivery : cartTotal + delivery;
      console.log("[Checkout] Applying coupon:", couponCode.trim(), "orderTotal:", effectiveTotal);
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), orderTotal: effectiveTotal }),
      });
      const data = await res.json();
      console.log("[Checkout] Coupon response:", data);
      if (data.valid) {
        setAppliedCoupon({ code: couponCode.trim(), discountValue: data.discountValue });
        setCouponCode("");
        showToast(`Coupon applied! You saved ${data.discountValue} EGP`, "success");
      } else {
        const errMsg = data.error || "Invalid discount code";
        setCouponError(errMsg);
        showToast(errMsg, "error");
      }
    } catch {
      setCouponError("Could not validate coupon");
      showToast("Could not validate coupon", "error");
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  const placeOrder = async () => {
    setSubmitError("");

    setTouched({ name: true, phone: true, address: true });
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    if (!Array.isArray(cart) || cart.length === 0) {
      setSubmitError("Your cart is empty");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          email: "",
        },
        items: cart.map((item) => ({
          name: item.name,
          color: item.color,
          size: item.size,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        subtotal: hasBundle ? bundleTotal : cartTotal,
        deliveryFee: delivery,
        total: Math.max(0, total),
        userId: user?.id,
        couponCode: appliedCoupon?.code,
        discountAmount: discount > 0 ? discount : undefined,
      };
      console.log("[Checkout] Calling saveOrder with payload:", {
        ...payload,
        couponCode: payload.couponCode,
        discountAmount: payload.discountAmount,
      });
      const result = await saveOrder(payload);
      console.log("[Checkout] saveOrder returned:", result);

      if (!result.success) {
        setSubmitError("Failed to place order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      clearCart();
      showToast("Order placed successfully!", "success");

      const displayId = result.order?.displayId || "";
      await new Promise((r) => setTimeout(r, 600));
      router.push(`/thanks?id=${displayId}`);
    } catch (ex) {
      const message = ex instanceof Error ? ex.message : "Something went wrong";
      console.error("[Checkout] Order failed:", message);
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-black border rounded-xl px-5 py-4 outline-none transition-all duration-200 ${
      touched[field] && errors[field as keyof Errors]
        ? "border-red-500"
        : "border-white/[0.08] focus:border-white/30 focus:animate-focus-ring"
    }`;

  const itemCount = Array.isArray(cart)
    ? cart.reduce((sum, item) => sum + (item.quantity || 0), 0)
    : 0;

  const bundle = getApplicableBundle(itemCount);
  const bundleTotal = getBundleTotal(itemCount);
  const bundleSavings = getBundleSavings(itemCount);
  const hasBundle = bundle !== null && bundleSavings > 0;

  const delivery = cartTotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const discount = appliedCoupon?.discountValue || 0;
  const total = (hasBundle ? bundleTotal : cartTotal) + delivery - discount;

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10 md:px-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/cart")}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-all duration-300 mb-10 group"
        >
          <ArrowLeft size={15} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          Back to Cart
        </button>

        <h1 className="text-[clamp(2rem,4vw,3rem)] font-black tracking-tight mb-10">Checkout</h1>

        {apiDiagnostics && (
          <div className="mb-4 text-[10px] font-mono text-zinc-600 bg-zinc-950 border border-white/5 rounded-xl px-4 py-2">
            Diagnostics: {apiDiagnostics}
          </div>
        )}

        {!Array.isArray(cart) || cart.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag size={48} className="mx-auto text-zinc-600 mb-4" />
            <p className="text-zinc-400 text-lg mb-6">Your cart is empty</p>
            <button
              onClick={() => router.push("/")}
              className="bg-white text-black px-8 py-4 rounded-full font-bold"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 order-2 md:order-1">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    placeOrder();
                  }}
                  className="space-y-5 md:space-y-6"
                >
                  <div>
                    <label className="block text-xs text-zinc-500 tracking-wider uppercase mb-2.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmed Hassan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onBlur={() => handleBlur("name")}
                      className={inputClass("name")}
                    />
                    {touched.name && errors.name && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                        <span>⚠</span> {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-500 tracking-wider uppercase mb-2.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 01012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => handleBlur("phone")}
                      className={inputClass("phone")}
                    />
                    {touched.phone && errors.phone && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                        <span>⚠</span> {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-500 tracking-wider uppercase mb-2.5">
                      Delivery Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 15 El-Tahrir St, Downtown, Cairo"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onBlur={() => handleBlur("address")}
                      className={inputClass("address")}
                    />
                    {touched.address && errors.address && (
                      <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                        <span>⚠</span> {errors.address}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-sm text-zinc-400 bg-zinc-900/50 rounded-xl px-4 py-3 border border-white/[0.05]">
                    <span className="text-base">💰</span>
                    <span className="text-sm">Cash on delivery available</span>
                  </div>

                  {submitError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 text-center">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer ${
                      isSubmitting
                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        : "bg-white text-black hover:scale-[1.02] active:scale-[0.97] hover:shadow-[0_0_32px_-6px_rgba(255,255,255,0.2)]"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={18} />
                        Place Order
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-zinc-600 tracking-wide">
                    You&apos;ll receive a confirmation message shortly after placing your order.
                  </p>
                </form>
            </div>

            <div className="md:col-span-2 order-1 md:order-2">
              <div className="bg-zinc-900/80 border border-white/[0.07] rounded-3xl p-5 md:p-6 sticky top-28">
                {hasBundle && (
                  <div className="mb-5 rounded-xl bg-white/[0.03] border border-zinc-500/20 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center shrink-0">
                        <Package size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight">
                          {bundle!.label} Bundle
                        </p>
                        <p className="text-xs text-zinc-500">
                          {bundle!.price} EGP &mdash; Save {bundleSavings} EGP
                        </p>
                      </div>
                      {bundle!.isBestValue && (
                        <span className="text-[9px] uppercase tracking-[0.2em] font-bold bg-gradient-to-r from-zinc-200 to-white text-black px-2 py-0.5 rounded-full shrink-0">
                          Best Value
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <h2 className="text-base font-bold tracking-tight mb-5">Order Summary</h2>

                <div className="space-y-3 mb-5">
                  {cart.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-3 pb-3 border-b border-white/[0.05] last:border-0"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate leading-tight">
                          {item.name}
                        </p>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          {item.color} / {item.size}
                        </p>
                        <p className="text-zinc-600 text-xs mt-0.5">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium shrink-0">
                        {item.price * item.quantity} <span className="text-zinc-500 text-xs font-normal">EGP</span>
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-4 pb-2 border-t border-white/[0.06]">
                  <label className="text-xs text-zinc-500 flex items-center gap-1.5 tracking-wide">
                    <Tag size={11} /> Discount Code
                  </label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                      <span className="text-sm text-green-400 font-medium">
                        {appliedCoupon.code}: -{appliedCoupon.discountValue} EGP
                      </span>
                      <button onClick={removeCoupon} className="text-green-400 hover:text-green-300 shrink-0 ml-3 transition cursor-pointer">
                        <XCircle size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-stretch">
                      <input
                        type="text"
                        placeholder="Enter code"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                        className="flex-1 min-w-0 bg-black border border-white/[0.08] rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-white/30"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="shrink-0 px-5 py-3 bg-white text-black rounded-xl text-sm font-medium hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {couponLoading ? <Loader2 size={14} /> : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-red-400 text-xs mt-1">{couponError}</p>
                  )}
                </div>

                <div className="pt-3 pb-2">
                  <button
                    onClick={() => setSizeGuideOpen(true)}
                    className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-all duration-200 cursor-pointer"
                  >
                    <Ruler size={12} />
                    Size Guide
                  </button>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-white/[0.06]">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Items ({itemCount})</span>
                    <span className="text-zinc-300">{cartTotal} EGP</span>
                  </div>
                  {hasBundle && (
                    <div className="flex justify-between text-sm text-green-400">
                      <span className="flex items-center gap-1.5">
                        <Package size={11} />
                        Bundle Discount
                      </span>
                      <span>-{bundleSavings} EGP</span>
                    </div>
                  )}
                  {hasBundle && bundle?.isBestValue && (
                    <div className="flex justify-end">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold bg-gradient-to-r from-zinc-200 to-white text-black px-2.5 py-0.5 rounded-full">
                        Best Value Bundle
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Delivery</span>
                    <span className={delivery === 0 ? "text-green-400" : "text-zinc-300"}>
                      {delivery === 0 ? (
                        <><s className="text-zinc-600 mr-1.5">50 EGP</s>FREE</>
                      ) : (
                        `${delivery} EGP`
                      )}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-green-400">
                      <span>Discount</span>
                      <span>-{discount} EGP</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-3 border-t border-white/[0.06]">
                    <span>Total</span>
                    <span className="tracking-tight">{Math.max(0, total)} EGP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <SizeChart
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
      />
    </main>
  );
}

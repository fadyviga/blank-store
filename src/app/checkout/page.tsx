"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingBag, Loader2, Ruler, Tag, XCircle } from "lucide-react";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { saveOrder } from "../../lib/order";
import SizeChart from "../components/SizeChart";
import { DELIVERY_THRESHOLD, DELIVERY_FEE } from "@/types";

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
      console.log("[Checkout] Applying coupon:", couponCode.trim(), "orderTotal:", cartTotal + delivery);
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), orderTotal: cartTotal + delivery }),
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
        subtotal: cartTotal,
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
    `w-full bg-black border rounded-xl px-5 py-4 outline-none transition ${
      touched[field] && errors[field as keyof Errors]
        ? "border-red-500"
        : "border-white/10 focus:border-white/30"
    }`;

  const delivery = cartTotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const discount = appliedCoupon?.discountValue || 0;
  const total = cartTotal + delivery - discount;

  const itemCount = Array.isArray(cart)
    ? cart.reduce((sum, item) => sum + (item.quantity || 0), 0)
    : 0;

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/cart")}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8"
        >
          <ArrowLeft size={18} />
          Back to Cart
        </button>

        <h1 className="text-4xl font-bold mb-8">Checkout</h1>

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
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
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
                    <p className="text-red-400 text-sm mt-1.5 flex items-center gap-1">
                      <span>⚠</span> {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
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
                    <p className="text-red-400 text-sm mt-1.5 flex items-center gap-1">
                      <span>⚠</span> {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
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
                    <p className="text-red-400 text-sm mt-1.5 flex items-center gap-1">
                      <span>⚠</span> {errors.address}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-400 bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
                  <span>💰</span>
                  <span>Cash on delivery available</span>
                </div>

                {submitError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 text-center">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                    isSubmitting
                      ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                      : "bg-white text-black hover:scale-[1.02] cursor-pointer"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={20} />
                      Place Order
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-zinc-500">
                  You&apos;ll receive a confirmation message shortly after
                  placing your order.
                </p>
              </form>
            </div>

            <div className="md:col-span-2 order-1 md:order-2">
              <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 sticky top-24">
                <h2 className="text-lg font-bold mb-5">Order Summary</h2>

                <div className="space-y-4 mb-5">
                  {cart.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-3 pb-4 border-b border-white/5 last:border-0"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.name}
                        </p>
                        <p className="text-zinc-400 text-xs mt-0.5">
                          {item.color} / {item.size}
                        </p>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium shrink-0">
                        {item.price * item.quantity} EGP
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-4 pb-2 border-t border-white/10">
                  <label className="text-xs text-zinc-500 flex items-center gap-1.5">
                    <Tag size={12} /> Discount Code
                  </label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
                      <span className="text-sm text-green-400 font-medium">
                        {appliedCoupon.code}: -{appliedCoupon.discountValue} EGP
                      </span>
                      <button onClick={removeCoupon} className="text-green-400 hover:text-green-300 shrink-0 ml-3">
                        <XCircle size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-stretch">
                      <input
                        type="text"
                        placeholder="Enter discount code"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                        className="flex-1 min-w-0 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="shrink-0 px-5 py-3 bg-white text-black rounded-xl text-sm font-medium hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {couponLoading ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-red-400 text-xs mt-1">{couponError}</p>
                  )}
                </div>

                <div className="pt-2 pb-2">
                  <button
                    onClick={() => setSizeGuideOpen(true)}
                    className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition"
                  >
                    <Ruler size={13} />
                    Size Guide
                  </button>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>Items ({itemCount})</span>
                    <span>{cartTotal} EGP</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>Delivery</span>
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
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
                    <span>Total</span>
                    <span>{Math.max(0, total)} EGP</span>
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

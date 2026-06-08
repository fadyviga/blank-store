export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "completed"
  | "cancelled";

export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
  email?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  color: string;
  size: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  displayId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  productTotal: number;
  subtotal: number;
  delivery: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  userId?: string;
  internalNotes?: string;
  trackingNumber?: string;
  couponCode?: string;
  discountAmount?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  price: number;
  comparePrice: number | null;
  category: string;
  image: string;
  images: string[];
  sortOrder: number;
  createdAt: string;
}

export interface ProductColor {
  id: string;
  productId: string;
  name: string;
  hex: string;
  image: string;
}

export interface ProductSize {
  id: string;
  label: string;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  colorId: string;
  sizeId: string;
  sku: string;
  price: number | null;
  stock: number;
  image: string | null;
}

export interface InventoryLog {
  id: string;
  variantId: string;
  change: number;
  reason: string;
  orderId?: string;
  createdAt: string;
}

export interface CustomerProfile {
  id: string;
  email: string;
  phone: string;
  name: string;
  role?: "admin" | "user";
  totalOrders: number;
  totalSpent: number;
  firstOrder?: string;
  lastOrder?: string;
  createdAt?: string;
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  confirmed: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  processing: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  completed: "text-green-400 border-green-500/30 bg-green-500/10",
  cancelled: "text-red-400 border-red-500/30 bg-red-500/10",
};

export const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

export const DELIVERY_THRESHOLD = 1000;
export const DELIVERY_FEE = 50;
export const BASE_PRICE = 495;
export const COMPARE_PRICE = 550;

// Bundle offer constants
export const BUNDLE_2_COUNT = 2;
export const BUNDLE_2_PRICE = 900;
export const BUNDLE_3_COUNT = 3;
export const BUNDLE_3_PRICE = 1250;
export const BUNDLE_4_COUNT = 4;
export const BUNDLE_4_PRICE = 1500;

export interface BundleInfo {
  count: number;
  price: number;
  label: string;
  isBestValue: boolean;
}

export function getApplicableBundle(qty: number): BundleInfo | null {
  if (qty >= BUNDLE_4_COUNT)
    return { count: BUNDLE_4_COUNT, price: BUNDLE_4_PRICE, label: "4 Tees", isBestValue: true };
  if (qty >= BUNDLE_3_COUNT)
    return { count: BUNDLE_3_COUNT, price: BUNDLE_3_PRICE, label: "3 Tees", isBestValue: false };
  if (qty >= BUNDLE_2_COUNT)
    return { count: BUNDLE_2_COUNT, price: BUNDLE_2_PRICE, label: "2 Tees", isBestValue: false };
  return null;
}

export function getBundleTotal(qty: number): number {
  const bundle = getApplicableBundle(qty);
  if (!bundle) return qty * BASE_PRICE;
  return bundle.price + Math.max(0, qty - bundle.count) * BASE_PRICE;
}

export function getBundleSavings(qty: number): number {
  return qty * BASE_PRICE - getBundleTotal(qty);
}

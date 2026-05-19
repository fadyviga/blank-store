import { supabase } from "./supabase";

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
  subtotal: number;
  delivery: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  userId?: string;
}

function generateDisplayId(): string {
  const hex = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join("");
  return `BLK-${hex}`;
}

export function createOrder(
  customer: OrderCustomer,
  items: OrderItem[],
  subtotal: number,
  userId?: string
): Order {
  const delivery = subtotal >= 1000 ? 0 : 50;
  return {
    id: crypto.randomUUID(),
    displayId: generateDisplayId(),
    customer,
    items,
    subtotal,
    delivery,
    total: subtotal + delivery,
    status: "pending",
    createdAt: new Date().toISOString(),
    userId,
  };
}

function fromDB(row: any): Order {
  return {
    id: row.id,
    displayId: row.display_id,
    customer: {
      name: row.customer_name || "",
      phone: row.customer_phone || "",
      address: row.customer_address || "",
      email: row.customer_email || "",
    },
    items: [],
    subtotal: row.subtotal || 0,
    delivery: row.delivery || 0,
    total: row.total || 0,
    status: row.status || "pending",
    createdAt: row.created_at || new Date().toISOString(),
    userId: row.user_id,
  };
}

function toDBRow(order: Order) {
  return {
    id: order.id,
    user_id: order.userId || null,
    display_id: order.displayId,
    customer_name: order.customer.name,
    customer_phone: order.customer.phone,
    customer_address: order.customer.address,
    customer_email: order.customer.email || "",
    subtotal: order.subtotal,
    delivery: order.delivery,
    total: order.total,
    status: order.status,
    created_at: order.createdAt,
  };
}

export async function saveOrder(order: Order): Promise<string | null> {
  if (!supabase) return "Supabase is not configured";
  const { error: orderErr } = await supabase.from("orders").insert(toDBRow(order));
  if (orderErr) return orderErr.message;

  if (order.items.length > 0) {
    const items = order.items.map((item) => ({
      order_id: order.id,
      product_name: item.name,
      color: item.color,
      size: item.size,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(items);
    if (itemsErr) return itemsErr.message;
  }

  return null;
}

export async function loadOrders(): Promise<Order[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => {
    const order = fromDB(row);
    order.items = (row.order_items || []).map((item: any) => ({
      id: item.id,
      name: item.product_name,
      color: item.color || "",
      size: item.size || "",
      price: item.price,
      quantity: item.quantity,
      image: item.image || "",
    }));
    return order;
  });
}

export async function loadUserOrders(userId: string): Promise<Order[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row: any) => {
    const order = fromDB(row);
    order.items = (row.order_items || []).map((item: any) => ({
      id: item.id,
      name: item.product_name,
      color: item.color || "",
      size: item.size || "",
      price: item.price,
      quantity: item.quantity,
      image: item.image || "",
    }));
    return order;
  });
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order[]> {
  if (supabase) {
    await supabase.from("orders").update({ status }).eq("id", id);
  }
  return loadOrders();
}

export async function deleteOrderById(id: string): Promise<Order[]> {
  if (supabase) {
    await supabase.from("orders").delete().eq("id", id);
  }
  return loadOrders();
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  confirmed: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  processing: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  completed: "text-green-400 border-green-500/30 bg-green-500/10",
  cancelled: "text-red-400 border-red-500/30 bg-red-500/10",
};

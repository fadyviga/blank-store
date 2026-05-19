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
}

function generateDisplayId(): string {
  const hex = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join("");
  return `BLK-${hex}`;
}

function parseDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function createOrder(
  customer: OrderCustomer,
  items: OrderItem[],
  subtotal: number
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
  };
}

export function normalizeOrder(raw: any): Order {
  const isNew = raw.customer && raw.displayId && raw.createdAt;

  if (isNew) {
    return raw as Order;
  }

  return {
    id: String(raw.id || crypto.randomUUID()),
    displayId: `BLK-${String(raw.id || Date.now()).slice(-6).toUpperCase().padStart(6, "0")}`,
    customer: {
      name: raw.name || "",
      phone: raw.phone || "",
      address: raw.address || "",
      email: raw.customer?.email || raw.email || "",
    },
    items: raw.items || [],
    subtotal: raw.total || 0,
    delivery: 0,
    total: raw.total || 0,
    status: "pending",
    createdAt: parseDate(raw.date || raw.createdAt),
  };
}

function toDB(orders: Order[]) {
  return orders.map((o) => ({
    id: o.id,
    display_id: o.displayId,
    customer_email: o.customer.email || "",
    customer_name: o.customer.name,
    customer_phone: o.customer.phone,
    customer_address: o.customer.address,
    items: JSON.stringify(o.items),
    subtotal: o.subtotal,
    delivery: o.delivery,
    total: o.total,
    status: o.status,
    created_at: o.createdAt,
  }));
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
    items: typeof row.items === "string" ? JSON.parse(row.items) : row.items || [],
    subtotal: row.subtotal || 0,
    delivery: row.delivery || 0,
    total: row.total || 0,
    status: row.status || "pending",
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function loadLocal(): Order[] {
  try {
    const stored = localStorage.getItem("orders");
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeOrder);
  } catch {
    return [];
  }
}

export function saveLocal(orders: Order[]): void {
  localStorage.setItem("orders", JSON.stringify(orders));
}

export async function loadOrders(): Promise<Order[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        const orders = data.map(fromDB);
        saveLocal(orders);
        return orders;
      }
    } catch {}
  }
  return loadLocal();
}

export async function saveOrders(orders: Order[]): Promise<void> {
  saveLocal(orders);
  if (!supabase) return;
  try {
    const existing = await supabase.from("orders").select("id");
    const existingIds = new Set((existing.data || []).map((r: any) => r.id));
    const toInsert = orders.filter((o) => !existingIds.has(o.id));
    if (toInsert.length > 0) {
      await supabase.from("orders").insert(toDB(toInsert));
    }
    for (const order of orders) {
      await supabase
        .from("orders")
        .update({
          status: order.status,
          customer_name: order.customer.name,
          customer_phone: order.customer.phone,
          customer_address: order.customer.address,
        })
        .eq("id", order.id);
    }
  } catch {}
}

export async function syncOrderToSupabase(order: Order): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("orders").insert(toDB([order]));
  } catch {}
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order[]> {
  const orders = loadLocal().map((o) =>
    o.id === id ? { ...o, status } : o
  );
  saveLocal(orders);
  if (supabase) {
    try {
      await supabase.from("orders").update({ status }).eq("id", id);
    } catch {}
  }
  return orders;
}

export async function deleteOrderById(id: string): Promise<Order[]> {
  const orders = loadLocal().filter((o) => o.id !== id);
  saveLocal(orders);
  if (supabase) {
    try {
      await supabase.from("orders").delete().eq("id", id);
    } catch {}
  }
  return orders;
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  confirmed: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  processing: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  completed: "text-green-400 border-green-500/30 bg-green-500/10",
  cancelled: "text-red-400 border-red-500/30 bg-red-500/10",
};

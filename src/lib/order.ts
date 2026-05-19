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
      email: "",
    },
    items: raw.items || [],
    subtotal: raw.total || 0,
    delivery: 0,
    total: raw.total || 0,
    status: "pending",
    createdAt: parseDate(raw.date || raw.createdAt),
  };
}

export function loadOrders(): Order[] {
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

export function saveOrders(orders: Order[]): void {
  localStorage.setItem("orders", JSON.stringify(orders));
}

export function deleteOrderById(id: string): Order[] {
  const orders = loadOrders().filter((o) => o.id !== id);
  saveOrders(orders);
  return orders;
}

export function updateOrderStatus(
  id: string,
  status: OrderStatus
): Order[] {
  const orders = loadOrders().map((o) =>
    o.id === id ? { ...o, status } : o
  );
  saveOrders(orders);
  return orders;
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  confirmed: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  processing: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  completed: "text-green-400 border-green-500/30 bg-green-500/10",
  cancelled: "text-red-400 border-red-500/30 bg-red-500/10",
};

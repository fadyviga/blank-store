import type { Order, OrderStatus } from "@/types";

export type { Order, OrderStatus, OrderCustomer, OrderItem } from "@/types";
export { STATUS_COLORS, STATUS_OPTIONS } from "@/types";

const API_BASE = "/api";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export async function saveOrder(order: {
  customer: { name: string; phone: string; address: string; email?: string };
  items: Array<{
    name: string;
    color: string;
    size: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  subtotal: number;
  userId?: string;
}): Promise<{ success: boolean; order?: Order }> {
  const result = await apiFetch<{ success: boolean; order: Order }>("/orders", {
    method: "POST",
    body: JSON.stringify(order),
  });
  return result;
}

export async function loadOrders(params?: {
  userId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Order[]> {
  const searchParams = new URLSearchParams();
  if (params?.userId) searchParams.set("userId", params.userId);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const qs = searchParams.toString();
  return apiFetch<Order[]>(`/orders${qs ? `?${qs}` : ""}`);
}

export async function loadUserOrders(userId: string): Promise<Order[]> {
  return loadOrders({ userId });
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  await apiFetch("/orders", {
    method: "PATCH",
    body: JSON.stringify({ id, status }),
  });
}

export async function updateOrderDetails(
  id: string,
  data: { status?: OrderStatus; internalNotes?: string; trackingNumber?: string }
): Promise<void> {
  await apiFetch("/orders", {
    method: "PATCH",
    body: JSON.stringify({ id, ...data }),
  });
}

export async function deleteOrderById(id: string): Promise<void> {
  await apiFetch(`/orders?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

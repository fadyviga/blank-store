import type { Order, OrderStatus } from "@/types";

export type { Order, OrderStatus, OrderCustomer, OrderItem } from "@/types";
export { STATUS_COLORS, STATUS_OPTIONS } from "@/types";

const API_BASE = "/api";

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;

  console.log(`[apiFetch] >>> ${options?.method || "GET"} ${url}`);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (networkError) {
    const message =
      networkError instanceof Error ? networkError.message : "Network error";
    console.error(`[apiFetch] NETWORK ERROR: ${url}`, message);
    throw new Error(`Network request failed: ${message}`);
  }

  console.log(`[apiFetch] <<< ${res.status} ${res.statusText} (${url})`);

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const errorBody = await res.json();
        errorMessage = errorBody.error || errorMessage;
      } catch {
        errorMessage = `Server returned ${res.status} with invalid JSON response`;
      }
    } else {
      const textBody = await res.text().catch(() => "");
      const preview = textBody.slice(0, 150).replace(/\s+/g, " ").trim();
      console.error(`[apiFetch] NON-JSON ${res.status} response:`, preview);
      if (res.status === 404) {
        errorMessage =
          "The server could not find the requested endpoint. If this persists, the API may not be deployed correctly.";
      } else {
        errorMessage = `Server error (${res.status}). Check server logs for details.`;
      }
    }
    throw new Error(errorMessage);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data: T = await res.json();
      return data;
    } catch (parseError) {
      const text = await res.text().catch(() => "");
      console.error(
        `[apiFetch] JSON PARSE ERROR from ${url}:`,
        text.slice(0, 200)
      );
      throw new Error(
        `Invalid JSON response from server: ${text.slice(0, 100)}`
      );
    }
  }

  const text = await res.text();
  throw new Error(
    `Expected JSON response but got ${contentType || "unknown"}: ${text.slice(0, 100)}`
  );
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
  couponCode?: string;
  discountAmount?: number;
}): Promise<{ success: boolean; order?: Order }> {
  console.log("[saveOrder] Sending order to API:", {
    customer: order.customer,
    itemsCount: order.items.length,
    subtotal: order.subtotal,
  });
  const result = await apiFetch<{ success: boolean; order: Order }>(
    "/orders",
    {
      method: "POST",
      body: JSON.stringify(order),
    }
  );
  console.log("[saveOrder] Response:", result);
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
  data: {
    status?: OrderStatus;
    internalNotes?: string;
    trackingNumber?: string;
  }
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

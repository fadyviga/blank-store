"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";

export interface CartItem {
  id: string;
  name: string;
  color: string;
  size: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getLocalKey(userId?: string | null): string {
  return userId ? `cart_${userId}` : "cart_guest";
}

function loadLocalCart(key: string): CartItem[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalCart(key: string, items: CartItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {}
}

async function loadRemoteCart(userId: string): Promise<CartItem[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId);
  if (!data) return [];
  return data.map((row: any) => ({
    id: row.id,
    name: row.product_name,
    color: row.color || "",
    size: row.size || "",
    price: row.price,
    image: row.image || "",
    quantity: row.quantity,
  }));
}

async function syncCartToRemote(userId: string, items: CartItem[]) {
  if (!supabase) return;
  const { data: existing } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId);
  const existingIds = new Set((existing || []).map((r: any) => r.product_name + r.color + r.size));

  for (const item of items) {
    const key = item.name + item.color + item.size;
    if (existingIds.has(key)) {
      await supabase
        .from("cart_items")
        .update({ quantity: item.quantity, price: item.price, image: item.image })
        .eq("user_id", userId)
        .eq("product_name", item.name)
        .eq("color", item.color)
        .eq("size", item.size);
    } else {
      await supabase
        .from("cart_items")
        .insert({
          user_id: userId,
          product_name: item.name,
          color: item.color,
          size: item.size,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
        });
    }
  }

  const remoteKeys = new Set(items.map((i) => i.name + i.color + i.size));
  for (const row of existing || []) {
    const key = row.product_name + row.color + row.size;
    if (!remoteKeys.has(key)) {
      await supabase.from("cart_items").delete().eq("id", row.id);
    }
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const initRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id ?? null;
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;

    if (!initRef.current) {
      initRef.current = true;
      const localKey = getLocalKey(currentUserId);
      const local = loadLocalCart(localKey);
      if (currentUserId) {
        loadRemoteCart(currentUserId).then((remote) => {
          if (remote.length > 0) {
            const merged = mergeCarts(local, remote);
            setCart(merged);
            saveLocalCart(localKey, merged);
          } else if (local.length > 0) {
            setCart(local);
            syncCartToRemote(currentUserId, local);
          } else {
            setCart([]);
          }
          setInitialized(true);
        });
      } else {
        setCart(local);
        setInitialized(true);
      }
      return;
    }

    if (prevUserId !== undefined && prevUserId !== currentUserId) {
      saveLocalCart(getLocalKey(prevUserId), cartRef.current);
      if (currentUserId) {
        loadRemoteCart(currentUserId).then((remote) => {
          const merged = mergeCarts(cartRef.current, remote);
          setCart(merged);
          saveLocalCart(getLocalKey(currentUserId), merged);
          syncCartToRemote(currentUserId, merged);
        });
      } else {
        const localKey = getLocalKey(null);
        const local = loadLocalCart(localKey);
        setCart(local);
      }
    }
  }, [user?.id, authLoading]);

  useEffect(() => {
    if (!initialized) return;
    const currentUserId = user?.id ?? null;
    const localKey = getLocalKey(currentUserId);
    saveLocalCart(localKey, cart);
    if (currentUserId) {
      const timer = setTimeout(() => syncCartToRemote(currentUserId, cart), 300);
      return () => clearTimeout(timer);
    }
  }, [cart, initialized, user?.id]);

  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setCart((prev) => {
        const existing = prev.find(
          (i) => i.color === item.color && i.size === item.size
        );
        if (existing) {
          return prev.map((i) =>
            i.color === item.color && i.size === item.size
              ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
              : i
          );
        }
        return [...prev, { ...item, quantity: item.quantity ?? 1 }];
      });
    },
    []
  );

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.floor(quantity) } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    const currentUserId = user?.id ?? null;
    if (currentUserId && supabase) {
      supabase.from("cart_items").delete().eq("user_id", currentUserId);
    }
  }, [user?.id]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

function mergeCarts(local: CartItem[], remote: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const item of [...remote, ...local]) {
    const key = item.name + item.color + item.size;
    if (map.has(key)) {
      const existing = map.get(key)!;
      map.set(key, { ...existing, quantity: Math.max(existing.quantity, item.quantity) });
    } else {
      map.set(key, { ...item });
    }
  }
  return Array.from(map.values());
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return ctx;
}

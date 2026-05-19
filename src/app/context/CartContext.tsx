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

function getKey(email?: string | null): string {
  return email ? `cart_${email}` : "cart_guest";
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const prevEmailRef = useRef<string | null | undefined>(undefined);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const emailRef = useRef<string | null>(null);
  emailRef.current = user?.email ?? null;

  useEffect(() => {
    if (authLoading) return;

    const prevEmail = prevEmailRef.current;
    const currentEmail = user?.email ?? null;
    prevEmailRef.current = currentEmail;

    const prevKey = getKey(prevEmail);
    const currentKey = getKey(currentEmail);

    if (prevEmail !== undefined && prevKey !== currentKey) {
      try {
        localStorage.setItem(prevKey, JSON.stringify(cartRef.current));
      } catch {}
    }

    try {
      const stored = localStorage.getItem(currentKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCart(parsed);
          return;
        }
      }
    } catch {}

    setCart([]);
  }, [user?.email, authLoading]);

  useEffect(() => {
    if (prevEmailRef.current === undefined) return;
    const key = getKey(emailRef.current);
    try {
      localStorage.setItem(key, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setCart((prev) => {
        const existing = prev.find(
          (i) => i.color === item.color && i.size === item.size
        );
        if (existing) {
          return prev.map((i) =>
            i.color === item.color && i.size === item.size
              ? { ...i, quantity: i.quantity + 1 }
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
  }, []);

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

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCartContext must be used within a CartProvider");
  }
  return ctx;
}

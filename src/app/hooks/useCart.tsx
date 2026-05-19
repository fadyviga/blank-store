"use client";

export function useCart() {
  const addToCart = (item: any) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    cart.push(item);

    localStorage.setItem("cart", JSON.stringify(cart));

  };

  const getCart = () => {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  };

  const clearCart = () => {
    localStorage.removeItem("cart");
  };

  return { addToCart, getCart, clearCart };
}
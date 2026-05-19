"use client";

export function useCart() {
  const addToCart = (item: any) => {
    const existingItem = cart.find(
      (i: any) =>
        i.color === item.color &&
        i.size === item.size
    );
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        ...item,
        quantity: 1,
      });
    }

  return { addToCart, getCart, clearCart };
}
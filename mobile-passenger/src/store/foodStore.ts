import { create } from 'zustand';

import type { CartItem, MenuItem, Restaurant } from '../types/food';

type FoodStore = {
  activeRestaurant: Restaurant | null;
  cart: CartItem[];
  promoCode: string;
  deliveryAddress: string;
  deliveryInstructions: string;
  tip: number;
  setActiveRestaurant: (restaurant: Restaurant | null) => void;
  addToCart: (item: MenuItem, quantity: number, specialInstructions?: string) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  setPromoCode: (code: string) => void;
  setDeliveryAddress: (address: string) => void;
  setDeliveryInstructions: (instructions: string) => void;
  setTip: (tip: number) => void;
  cartSubtotal: () => number;
  cartItemCount: () => number;
};

export const useFoodStore = create<FoodStore>((set, get) => ({
  activeRestaurant: null,
  cart: [],
  promoCode: '',
  deliveryAddress: '',
  deliveryInstructions: '',
  tip: 0,
  setActiveRestaurant: (restaurant) => set({ activeRestaurant: restaurant, cart: [] }),
  addToCart: (item, quantity, specialInstructions) => {
    const existingIndex = get().cart.findIndex((cartItem) => cartItem.menuItem.id === item.id);
    if (existingIndex >= 0) {
      set((state) => {
        const updated = [...state.cart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          subtotal: (updated[existingIndex].quantity + quantity) * item.price,
        };
        return { cart: updated };
      });
      return;
    }

    set((state) => ({
      cart: [
        ...state.cart,
        {
          id: `cart-${item.id}-${Date.now()}`,
          menuItem: item,
          quantity,
          specialInstructions,
          subtotal: item.price * quantity,
        },
      ],
    }));
  },
  removeFromCart: (itemId) => set((state) => ({ cart: state.cart.filter((cartItem) => cartItem.id !== itemId) })),
  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(itemId);
      return;
    }

    set((state) => ({
      cart: state.cart.map((cartItem) =>
        cartItem.id === itemId
          ? { ...cartItem, quantity, subtotal: cartItem.menuItem.price * quantity }
          : cartItem,
      ),
    }));
  },
  clearCart: () => set({ cart: [], promoCode: '', tip: 0, activeRestaurant: null }),
  setPromoCode: (code) => set({ promoCode: code.trim().toUpperCase() }),
  setDeliveryAddress: (address) => set({ deliveryAddress: address }),
  setDeliveryInstructions: (instructions) => set({ deliveryInstructions: instructions }),
  setTip: (tip) => set({ tip }),
  cartSubtotal: () => get().cart.reduce((sum, item) => sum + item.subtotal, 0),
  cartItemCount: () => get().cart.reduce((sum, item) => sum + item.quantity, 0),
}));

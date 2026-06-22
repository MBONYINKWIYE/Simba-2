import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types';

type CartState = {
  items: Record<number, { product: Product; quantity: number }>;
  savedItems: Record<number, { product: Product; quantity: number }>;
  selectedShopId: string | null;
  lastAddedItem: { productName: string; quantity: number; image: string } | null;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  decrementItem: (productId: number) => void;
  setSelectedShop: (shopId: string | null) => void;
  clearCart: () => void;
  saveForLater: (productId: number) => void;
  moveToCart: (productId: number) => void;
  removeSavedItem: (productId: number) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: {},
      savedItems: {},
      selectedShopId: null,
      lastAddedItem: null,
      addItem: (product) =>
        set((state) => {
          const current = state.items[product.id];
          const nextQuantity = current ? current.quantity + 1 : 1;
          return {
            items: {
              ...state.items,
              [product.id]: {
                product,
                quantity: nextQuantity,
              },
            },
            lastAddedItem: {
              productName: product.name,
              quantity: nextQuantity,
              image: product.image,
            },
          };
        }),
      setSelectedShop: (shopId) => set({ selectedShopId: shopId }),
      removeItem: (productId) =>
        set((state) => {
          const next = { ...state.items };
          delete next[productId];
          return { items: next };
        }),
      decrementItem: (productId) =>
        set((state) => {
          const current = state.items[productId];
          if (!current) return state;
          if (current.quantity <= 1) {
            const next = { ...state.items };
            delete next[productId];
            return { items: next };
          }

          return {
            items: {
              ...state.items,
              [productId]: {
                ...current,
                quantity: current.quantity - 1,
              },
            },
          };
        }),
      clearCart: () => set((state) => ({ items: {}, selectedShopId: state.selectedShopId })),
      saveForLater: (productId) =>
        set((state) => {
          const item = state.items[productId];
          if (!item) return state;
          const nextItems = { ...state.items };
          delete nextItems[productId];
          return {
            items: nextItems,
            savedItems: {
              ...state.savedItems,
              [productId]: item,
            },
          };
        }),
      moveToCart: (productId) =>
        set((state) => {
          const item = state.savedItems[productId];
          if (!item) return state;
          const nextSaved = { ...state.savedItems };
          delete nextSaved[productId];
          return {
            items: {
              ...state.items,
              [productId]: item,
            },
            savedItems: nextSaved,
          };
        }),
      removeSavedItem: (productId) =>
        set((state) => {
          const next = { ...state.savedItems };
          delete next[productId];
          return { savedItems: next };
        }),
    }),
    {
      name: 'simba-cart',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

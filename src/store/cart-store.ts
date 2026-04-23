import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types';

type CartState = {
  items: Record<number, { product: Product; quantity: number }>;
  selectedShopId: string | null;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  decrementItem: (productId: number) => void;
  setSelectedShop: (shopId: string | null) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: {},
      selectedShopId: null,
      addItem: (product) =>
        set((state) => {
          const current = state.items[product.id];
          return {
            items: {
              ...state.items,
              [product.id]: {
                product,
                quantity: current ? current.quantity + 1 : 1,
              },
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
    }),
    {
      name: 'simba-cart',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

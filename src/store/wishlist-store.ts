import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types';

type WishlistState = {
  items: Record<string, Record<number, Product>>;
  toggleItem: (userId: string, product: Product) => void;
  removeItem: (userId: string, productId: number) => void;
  isInWishlist: (userId: string, productId: number) => boolean;
  getWishlist: (userId: string) => Product[];
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: {},
      toggleItem: (userId, product) =>
        set((state) => {
          const userItems = state.items[userId] ?? {};
          if (userItems[product.id]) {
            const next = { ...userItems };
            delete next[product.id];
            return {
              items: {
                ...state.items,
                [userId]: next,
              },
            };
          }
          return {
            items: {
              ...state.items,
              [userId]: {
                ...userItems,
                [product.id]: product,
              },
            },
          };
        }),
      removeItem: (userId, productId) =>
        set((state) => {
          const userItems = state.items[userId];
          if (!userItems) return state;
          const next = { ...userItems };
          delete next[productId];
          return {
            items: {
              ...state.items,
              [userId]: next,
            },
          };
        }),
      isInWishlist: (userId, productId) => {
        const state = get();
        return !!state.items[userId]?.[productId];
      },
      getWishlist: (userId) => {
        const state = get();
        const userItems = state.items[userId] ?? {};
        return Object.values(userItems);
      },
    }),
    {
      name: 'simba-wishlist',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

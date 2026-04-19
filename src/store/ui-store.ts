import { create } from 'zustand';

type UiState = {
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  isCartOpen: false,
  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
}));

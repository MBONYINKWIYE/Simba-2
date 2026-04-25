import { useCartStore } from '@/store/cart-store';

export function useOrderSummary() {
  const itemsMap = useCartStore((state) => state.items);
  const items = Object.values(itemsMap);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = 0;
  const serviceFee = 0;
  const total = subtotal;

  return {
    subtotal,
    deliveryFee,
    serviceFee,
    total,
  };
}

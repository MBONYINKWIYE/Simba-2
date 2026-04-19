import { DELIVERY_FEE, SERVICE_FEE } from '@/lib/constants';
import { useCartStore } from '@/store/cart-store';

export function useOrderSummary() {
  const itemsMap = useCartStore((state) => state.items);
  const items = Object.values(itemsMap);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal + DELIVERY_FEE + SERVICE_FEE;

  return {
    subtotal,
    deliveryFee: DELIVERY_FEE,
    serviceFee: SERVICE_FEE,
    total,
  };
}

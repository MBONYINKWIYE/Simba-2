export type Locale = 'en' | 'fr' | 'rw';

export type ProductRecord = {
  id: number;
  name: string;
  price: number;
  category: string;
  subcategoryId: number | null;
  inStock: boolean;
  image: string;
  unit: string;
};

export type StoreMetadata = {
  name: string;
  tagline: string;
  location: string;
  currency: string;
};

export type Product = ProductRecord & {
  slug: string;
  normalizedCategory: string;
};

export type CatalogResponse = {
  store: StoreMetadata;
  products: Product[];
};

export type CartItem = {
  productId: number;
  quantity: number;
  product: Product;
};

export type CheckoutFormValues = {
  fullName: string;
  phone: string;
  address: string;
  notes: string;
  paymentMethod: 'momo' | 'cash';
};

export type CheckoutItemPayload = {
  productId: number;
  productName: string;
  quantity: number;
  unitPriceRwf: number;
};

export type RequestToPayResult = {
  ok: boolean;
  status: number;
  orderId?: string;
  referenceId?: string;
  externalId?: string;
  accountHolderStatus?: string;
  providerPayload?: unknown;
  message?: string;
};

export type RequestToPayStatusResult = {
  ok: boolean;
  status: number;
  payload?: {
    status?: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    reason?: string;
    financialTransactionId?: string;
    externalId?: string;
    [key: string]: unknown;
  };
};

export type CreateCashOrderResult = {
  ok: boolean;
  orderId?: string;
};

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed';

export type OrderHistoryItem = {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price_rwf: number;
};

export type OrderHistoryRecord = {
  id: string;
  created_at: string;
  total_rwf: number;
  payment_method: 'momo' | 'cash';
  payment_status: PaymentStatus;
  fulfillment_status?: OrderStatus | null;
  delivery_address: string;
  full_name: string;
  phone: string;
  order_items: OrderHistoryItem[];
};

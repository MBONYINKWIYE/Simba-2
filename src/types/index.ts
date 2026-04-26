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
  stockQuantity?: number;
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
  pickupTime: string;
  paymentMethod: 'momo' | 'cash';
};

export type Shop = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  created_at: string;
};

export type AvailableShop = Shop & {
  available_product_count: number;
  average_rating: number;
  review_count: number;
};

export type ShopAdminAssignment = {
  id: string;
  user_id: string;
  user_email: string;
  shop_id: string;
  shop_name: string;
  role: 'admin' | 'manager' | 'staff';
  created_at: string;
};

export type InventoryRecord = {
  inventory_id: string;
  shop_id: string;
  shop_name: string;
  product_id: number;
  product_name: string;
  quantity: number;
  updated_at: string;
};

export type UserRole = 'customer' | 'shop_admin' | 'super_admin';

export type AuthRoleProfile = {
  role: UserRole;
  shopId: string | null;
  shopName: string | null;
  adminRole: 'admin' | 'manager' | 'staff' | null;
};

export type CheckoutItemPayload = {
  productId: number;
  productName: string;
  quantity: number;
  unitPriceRwf: number;
};

export type OrderCreatePayload = {
  checkout: CheckoutFormValues;
  items: CheckoutItemPayload[];
  subtotalRwf: number;
  deliveryFeeRwf: number;
  serviceFeeRwf: number;
  totalRwf: number;
  shopId: string;
  paymentAmountRwf?: number;
  paymentPlan?: 'momo' | 'cash-on-pickup';
};

export type OrderPaymentPayload = {
  provider?: string;
  receiverNumber?: string;
  paymentPlan?: 'momo' | 'cash-on-pickup';
  paymentAmountRwf?: number;
  depositRwf?: number;
  balanceDueRwf?: number;
  [key: string]: unknown;
};

export type RequestToPayResult = {
  ok: boolean;
  status: number;
  orderId?: string;
  referenceId?: string;
  externalId?: string;
  paymentAmountRwf?: number;
  accountHolderStatus?: string;
  providerPayload?: unknown;
  message?: string;
  warning?: string;
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
export type ShopOrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'rejected';

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
  user_id: string;
  created_at: string;
  pickup_time?: string | null;
  total_rwf: number;
  subtotal_rwf: number;
  delivery_fee_rwf: number;
  service_fee_rwf: number;
  payment_method: 'momo' | 'cash';
  payment_status: PaymentStatus;
  status?: ShopOrderStatus | null;
  fulfillment_status?: OrderStatus | null;
  delivery_address: string;
  full_name: string;
  phone: string;
  shop_id?: string | null;
  shops?: Pick<Shop, 'id' | 'name' | 'address' | 'phone'> | null;
  order_items: OrderHistoryItem[];
  review?: ReviewRecord | null;
  momo_reference?: string | null;
  momo_status?: string | null;
  payment_provider?: string | null;
  payment_payload?: OrderPaymentPayload;
  paid_at?: string | null;
};

export type ReviewRecord = {
  id: string;
  order_id: string;
  user_id: string;
  shop_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type ShopReviewSummary = {
  shop_id: string;
  average_rating: number;
  review_count: number;
};

export type AdminOrderRecord = {
  id: string;
  created_at: string;
  pickup_time?: string | null;
  full_name: string;
  phone: string;
  delivery_address: string;
  notes: string | null;
  payment_method: 'momo' | 'cash';
  payment_status: PaymentStatus;
  status: ShopOrderStatus;
  total_rwf: number;
  subtotal_rwf: number;
  delivery_fee_rwf: number;
  service_fee_rwf: number;
  user_email: string | null;
  shop_id: string;
  assigned_staff_user_id?: string | null;
  shops?: Pick<Shop, 'id' | 'name' | 'address' | 'phone'> | null;
  order_items: OrderHistoryItem[];
  momo_reference?: string | null;
  momo_status?: string | null;
  payment_provider?: string | null;
  payment_payload?: OrderPaymentPayload;
  paid_at?: string | null;
};

export type CatalogAiSearchResult = {
  answer: string;
  productIds: number[];
};

export type CatalogSearchContext = {
  intent: string;
  occasion: string | null;
  audience: string | null;
  budget: string | null;
  urgency: string | null;
  dietaryPreference: string | null;
  productHints: string[];
  normalizedQuery: string;
};

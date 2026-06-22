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

export type Promotion = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  product_id: number | null;
  category: string | null;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
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
  deliveryInstructions: string;
  notes: string;
  pickupTime: string;
  paymentMethod: 'momo' | 'cash' | 'cod';
  recurrence: Recurrence;
  deliveryMethod: 'pickup' | 'delivery';
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
  required_product_count: number;
  is_fully_available: boolean;
  average_rating: number;
  review_count: number;
  missing_items: {
    productId: number;
    productName: string;
    requestedQuantity: number;
    availableQuantity: number;
  }[];
};

export type ShopAdminAssignment = {
  id: string;
  user_id: string;
  user_email: string;
  user_full_name: string | null;
  shop_id: string;
  shop_name: string;
  role: 'admin' | 'manager' | 'staff';
  created_at: string;
};

export type DeliveryPerson = {
  id: string;
  shop_id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
};

export type UnassignedStaffProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
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

export type InventoryHistoryRecord = {
  history_id: string;
  shop_id: string;
  shop_name: string;
  product_id: number;
  product_name: string;
  operation_type: 'restock' | 'sale' | 'removal';
  quantity_change: number;
  previous_quantity: number;
  total_quantity: number;
  order_id: string | null;
  created_at: string;
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
  paymentPlan?: 'momo' | 'cash-on-pickup' | 'cod';
  recurrence?: Recurrence;
};

export type OrderPaymentPayload = {
  provider?: string;
  receiverNumber?: string;
  paymentPlan?: 'momo' | 'cash-on-pickup' | 'cod';
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
export type ShopOrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'rejected' | 'out_for_delivery' | 'delivered';
export type Recurrence = 'one_time' | 'weekly' | 'bi_weekly' | 'monthly';

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
  rejection_reason?: string | null;
  delivery_person_name?: string | null;
  delivery_person_phone?: string | null;
  recurrence?: Recurrence | null;
  next_delivery_date?: string | null;
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
  delivery_person_id?: string | null;
  delivery_person_name?: string | null;
  delivery_person_phone?: string | null;
  recurrence?: Recurrence | null;
  next_delivery_date?: string | null;
  shops?: Pick<Shop, 'id' | 'name' | 'address' | 'phone'> | null;
  order_items: OrderHistoryItem[];
  momo_reference?: string | null;
  momo_status?: string | null;
  payment_provider?: string | null;
  payment_payload?: OrderPaymentPayload;
  paid_at?: string | null;
  rejection_reason?: string | null;
};

export type AnalyticsPeriodStats = {
  revenue: number;
  orders: number;
};

export type AnalyticsDayData = {
  day: string;
  orders: number;
  revenue: number;
};

export type AnalyticsStatusData = {
  status: string;
  count: number;
};

export type AnalyticsProductData = {
  productName: string;
  quantitySold: number;
  revenue: number;
};

export type AnalyticsPaymentData = {
  paymentMethod: string;
  count: number;
  revenue: number;
};

export type ShopAnalytics = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  paidRevenue: number;
  paidOrders: number;
  today: AnalyticsPeriodStats;
  thisWeek: AnalyticsPeriodStats;
  thisMonth: AnalyticsPeriodStats;
  revenueByDay: AnalyticsDayData[];
  ordersByStatus: AnalyticsStatusData[];
  topProducts: AnalyticsProductData[];
  revenueByPayment: AnalyticsPaymentData[];
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
  mood: string | null;
  season: string | null;
  valuePreference: string | null;
  productHints: string[];
  brandHints: string[];
  normalizedQuery: string;
};

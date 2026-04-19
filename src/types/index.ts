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

export const queryKeys = {
  catalog: (locale: string) => ['catalog', locale] as const,
  product: (slug: string) => ['product', slug] as const,
  orders: (userId: string) => ['orders', userId] as const,
  authRole: (userId: string) => ['auth-role', userId] as const,
  shops: ['shops'] as const,
  availableShops: (itemsKey: string) => ['available-shops', itemsKey] as const,
  shopAdmins: ['shop-admins'] as const,
  shopReviewSummary: ['shop-review-summary'] as const,
  inventory: (scope: string) => ['inventory', scope] as const,
  adminOrders: (shopId: string) => ['admin-orders', shopId] as const,
  reviews: (userId: string) => ['reviews', userId] as const,
};

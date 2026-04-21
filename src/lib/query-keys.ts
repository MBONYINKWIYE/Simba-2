export const queryKeys = {
  catalog: (locale: string) => ['catalog', locale] as const,
  product: (slug: string) => ['product', slug] as const,
  orders: (userId: string) => ['orders', userId] as const,
};

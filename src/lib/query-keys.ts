export const queryKeys = {
  catalog: ['catalog'] as const,
  product: (slug: string) => ['product', slug] as const,
  orders: (userId: string) => ['orders', userId] as const,
};

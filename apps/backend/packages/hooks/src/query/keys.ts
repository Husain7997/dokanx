export const queryKeys = {
  auth: ["auth"] as const,
  tenant: ["tenant"] as const,
  products: ["products"] as const,
  product: (id: string) => ["products", id] as const,
  cart: ["cart"] as const,
  orders: ["orders"] as const,
  order: (id: string) => ["orders", id] as const,
  inventory: ["inventory"] as const,
  wallet: ["wallet"] as const,
  analytics: ["analytics"] as const,
  courier: ["courier"] as const,
  reviews: (productId: string) => ["reviews", productId] as const,
  marketplace: ["marketplace"] as const
};

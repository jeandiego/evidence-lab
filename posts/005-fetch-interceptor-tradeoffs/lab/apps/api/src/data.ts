// Dados fictícios de um e-commerce. O usuário é o seed de teste do lab.
export const USERS: Record<string, string> = { demo: "demo123" };

export const PRODUCTS = [
  { id: "p1", name: "Tênis Move", priceCents: 34900 },
  { id: "p2", name: "Fone Aura", priceCents: 59900 },
  { id: "p3", name: "Mochila Trilho", priceCents: 28900 },
  { id: "p4", name: "Luminária Nimbo", priceCents: 21900 },
];

const carts = new Map<string, Map<string, number>>();

export function cartOf(user: string) {
  return [...(carts.get(user) ?? new Map()).entries()].map(([productId, qty]) => ({ productId, qty }));
}

export function addToCart(user: string, productId: string) {
  const cart = carts.get(user) ?? new Map<string, number>();
  cart.set(productId, (cart.get(productId) ?? 0) + 1);
  carts.set(user, cart);
  return cartOf(user);
}

export function resetCarts() {
  carts.clear();
}

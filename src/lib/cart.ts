// src/lib/cart.ts
// Single source of truth: Cart + Orders (localStorage)
// ✅ Works with new key + legacy "cart" key (backwards compatible)
// ✅ No NaN: sanitizes price/quantity
// ✅ Future-proof: later vervangen door DB/Stripe/Printful

export type CartItem = {
  id: string;
  name: string;
  color: string;
  size: string;
  printArea: string;
  price: number;
  quantity: number;
};

export type ShippingAddress = {
  name: string;
  address1: string;
  address2?: string;
  zip: string;
  city: string;
  country: string;
};

export type Order = {
  id: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: ShippingAddress;
};

const CART_KEY = "loopawe_cart_v1";
const LEGACY_CART_KEY = "cart"; // <-- compat met oude code
const ORDERS_KEY = "loopawe_orders_v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function n(value: unknown, fallback = 0) {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
}

function normalizeItem(anyItem: any): CartItem | null {
  if (!anyItem) return null;

  const id = String(anyItem.id ?? "");
  if (!id) return null;

  const price = n(anyItem.price, 0);
  const quantity = Math.max(1, Math.floor(n(anyItem.quantity, 1)));

  return {
    id,
    name: String(anyItem.name ?? "Item"),
    color: String(anyItem.color ?? "—"),
    size: String(anyItem.size ?? "—"),
    printArea: String(anyItem.printArea ?? "—"),
    price,
    quantity,
  };
}

function id(prefix: string) {
  const chunk = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${chunk()}${chunk()}-${Date.now().toString(36).toUpperCase()}`;
}

/* =========================
   CART
========================= */

export function getCart(): CartItem[] {
  if (!isBrowser()) return [];

  // 1) Prefer new key
  const rawNew = localStorage.getItem(CART_KEY);
  const parsedNew = safeParse<any[]>(rawNew, []);

  // 2) Fallback legacy key if empty
  const rawLegacy = localStorage.getItem(LEGACY_CART_KEY);
  const parsedLegacy = safeParse<any[]>(rawLegacy, []);

  const source = (Array.isArray(parsedNew) && parsedNew.length > 0) ? parsedNew : parsedLegacy;
  const normalized = source.map(normalizeItem).filter(Boolean) as CartItem[];

  return normalized;
}

export function setCart(items: CartItem[]) {
  if (!isBrowser()) return;

  const normalized = items.map(normalizeItem).filter(Boolean) as CartItem[];
  localStorage.setItem(CART_KEY, JSON.stringify(normalized));

  // keep legacy in sync too (so old pages keep working)
  localStorage.setItem(LEGACY_CART_KEY, JSON.stringify(normalized));

  window.dispatchEvent(new Event("loopa_cart_updated"));
}

export function clearCart() {
  if (!isBrowser()) return;
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(LEGACY_CART_KEY);
  window.dispatchEvent(new Event("loopa_cart_updated"));
}

export function addToCart(item: Omit<CartItem, "id"> & { id?: string }) {
  const current = getCart();

  const newItem: CartItem = {
    id: item.id ?? id("CI"),
    name: item.name,
    color: item.color,
    size: item.size,
    printArea: item.printArea,
    price: n(item.price, 0),
    quantity: Math.max(1, Math.floor(n(item.quantity, 1))),
  };

  // merge if same variant
  const idx = current.findIndex(
    (x) =>
      x.name === newItem.name &&
      x.color === newItem.color &&
      x.size === newItem.size &&
      x.printArea === newItem.printArea
  );

  if (idx >= 0) {
    const merged = [...current];
    merged[idx] = {
      ...merged[idx],
      quantity: merged[idx].quantity + newItem.quantity,
      price: newItem.price, // keep latest price (future-proof)
    };
    setCart(merged);
    return;
  }

  setCart([...current, newItem]);
}

export function removeFromCart(itemId: string) {
  setCart(getCart().filter((x) => x.id !== itemId));
}

export function updateQuantity(itemId: string, quantity: number) {
  const q = Math.max(1, Math.floor(n(quantity, 1)));
  setCart(getCart().map((x) => (x.id === itemId ? { ...x, quantity: q } : x)));
}

// Backwards compat exports (if older code uses these names)
export const getCartItems = getCart;
export const clearCartItems = clearCart;

/* =========================
   ORDERS
========================= */

export function listOrders(): Order[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(ORDERS_KEY);
  const parsed = safeParse<Order[]>(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveOrder(order: Order) {
  if (!isBrowser()) return;
  const all = listOrders();
  localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...all]));
}

export function getOrderById(orderId: string): Order | null {
  const all = listOrders();
  return all.find((o) => o.id === orderId) ?? null;
}

/**
 * ✅ createOrder = maakt order op basis van huidige cart + shippingAddress
 * - Save order
 * - Clear cart
 * - Return order
 */
export function createOrder(args: { shippingAddress: ShippingAddress; shipping?: number }): Order {
  const items = getCart();
  if (items.length === 0) throw new Error("Cart is empty");

  const subtotal = items.reduce((sum, it) => sum + n(it.price, 0) * n(it.quantity, 1), 0);
  const shipping = n(args.shipping, 6.95);
  const total = subtotal + shipping;

  const order: Order = {
    id: id("LW"),
    createdAt: new Date().toISOString(),
    items,
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number(total.toFixed(2)),
    shippingAddress: args.shippingAddress,
  };

  saveOrder(order);
  clearCart();

  return order;
}
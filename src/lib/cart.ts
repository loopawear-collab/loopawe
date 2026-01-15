// src/lib/cart.ts
"use client";

/**
 * Local-first Cart + Orders (v1)
 * - Cart lives in localStorage
 * - Orders live in localStorage (demo checkout)
 * - Exports all helpers your UI needs:
 *   getCartItems, addToCart, removeFromCart, updateCartQuantity,
 *   clearCart, getCartSubtotal, getCartTotals,
 *   createOrder, listOrders, getOrderById
 */

export type CartItem = {
  id: string;

  name: string; // "T-shirt" | "Hoodie" (display)
  productType?: "tshirt" | "hoodie"; // optional

  designId?: string;

  color: string;
  colorHex?: string;
  size: string;
  printArea: string; // "Front" | "Back"

  price: number;
  quantity: number;

  previewDataUrl?: string;
};

export type ShippingAddress = {
  name?: string;
  address1?: string;
  address2?: string;
  zip?: string;
  city?: string;
  country?: string;
};

export type OrderItem = {
  id: string;

  name: string;
  productType?: "tshirt" | "hoodie";

  designId?: string;

  color: string;
  colorHex?: string;
  size: string;
  printArea: string;

  price: number;
  quantity: number;

  previewDataUrl?: string;
};

export type Order = {
  id: string;
  createdAt: string;

  items: OrderItem[];

  subtotal: number;
  shipping: number;
  total: number;

  shippingAddress?: ShippingAddress;
};

const CART_KEY = "loopa_cart_v1";
const ORDERS_KEY = "loopa_orders_v1";

const DEFAULT_SHIPPING = 6.95;

function nowISO() {
  return new Date().toISOString();
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uid(prefix = "LW") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

/** ---------- CART ---------- **/

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<CartItem[]>(localStorage.getItem(CART_KEY));
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed
    .filter(Boolean)
    .map((it: any) => ({
      id: String(it.id ?? uid("CI")),
      name: String(it.name ?? "Item"),
      productType: it.productType === "hoodie" ? "hoodie" : it.productType === "tshirt" ? "tshirt" : undefined,
      designId: it.designId ? String(it.designId) : undefined,
      color: String(it.color ?? "White"),
      colorHex: typeof it.colorHex === "string" ? it.colorHex : undefined,
      size: String(it.size ?? "M"),
      printArea: String(it.printArea ?? "Front"),
      price: typeof it.price === "number" && !Number.isNaN(it.price) ? it.price : 0,
      quantity: typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1,
      previewDataUrl: typeof it.previewDataUrl === "string" ? it.previewDataUrl : undefined,
    }));
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function getCartItems(): CartItem[] {
  return loadCart();
}

/**
 * Merge rule:
 * - same designId + productType + size + color + printArea => merge quantities
 * - otherwise new line
 */
export function addToCart(input: Omit<CartItem, "id"> | CartItem): CartItem[] {
  const cart = loadCart();

  const item: CartItem = {
    id: "id" in input && input.id ? String(input.id) : uid("CI"),
    name: String((input as any).name ?? "Item"),
    productType:
      (input as any).productType === "hoodie"
        ? "hoodie"
        : (input as any).productType === "tshirt"
        ? "tshirt"
        : undefined,
    designId: (input as any).designId ? String((input as any).designId) : undefined,
    color: String((input as any).color ?? "White"),
    colorHex: typeof (input as any).colorHex === "string" ? (input as any).colorHex : undefined,
    size: String((input as any).size ?? "M"),
    printArea: String((input as any).printArea ?? "Front"),
    price: typeof (input as any).price === "number" && !Number.isNaN((input as any).price) ? (input as any).price : 0,
    quantity:
      typeof (input as any).quantity === "number" && (input as any).quantity > 0 ? (input as any).quantity : 1,
    previewDataUrl: typeof (input as any).previewDataUrl === "string" ? (input as any).previewDataUrl : undefined,
  };

  const keyMatch = (a: CartItem, b: CartItem) =>
    (a.designId ?? "") === (b.designId ?? "") &&
    (a.productType ?? "") === (b.productType ?? "") &&
    a.size === b.size &&
    a.color === b.color &&
    a.printArea === b.printArea;

  const idx = cart.findIndex((c) => keyMatch(c, item));

  let next: CartItem[];
  if (idx >= 0) {
    const merged = { ...cart[idx], quantity: (cart[idx].quantity ?? 1) + (item.quantity ?? 1) };
    next = cart.slice();
    next[idx] = merged;
  } else {
    next = [item, ...cart];
  }

  saveCart(next);
  return next;
}

export function removeFromCart(itemId: string): CartItem[] {
  const cart = loadCart();
  const next = cart.filter((it) => it.id !== itemId);
  saveCart(next);
  return next;
}

export function updateCartQuantity(itemId: string, quantity: number): CartItem[] {
  const q = Math.max(1, Math.floor(quantity || 1));
  const cart = loadCart();
  const idx = cart.findIndex((it) => it.id === itemId);
  if (idx === -1) return cart;

  const next = cart.slice();
  next[idx] = { ...next[idx], quantity: q };
  saveCart(next);
  return next;
}

export function clearCart(): void {
  saveCart([]);
}

export function getCartSubtotal(): number {
  const cart = loadCart();
  return cart.reduce((sum, it) => sum + (it.price ?? 0) * (it.quantity ?? 1), 0);
}

export function getCartTotals(): { subtotal: number; shipping: number; total: number } {
  const items = loadCart();
  const subtotal = items.reduce((sum, it) => sum + (it.price ?? 0) * (it.quantity ?? 1), 0);
  const shipping = items.length > 0 ? DEFAULT_SHIPPING : 0;
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

/** ---------- ORDERS (demo checkout) ---------- **/

function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<Order[]>(localStorage.getItem(ORDERS_KEY));
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.filter(Boolean).map((o: any) => ({
    id: String(o.id ?? uid("ORD")),
    createdAt: typeof o.createdAt === "string" ? o.createdAt : nowISO(),
    items: Array.isArray(o.items)
      ? o.items.map((it: any) => ({
          id: String(it.id ?? uid("OI")),
          name: String(it.name ?? "Item"),
          productType:
            it.productType === "hoodie" ? "hoodie" : it.productType === "tshirt" ? "tshirt" : undefined,
          designId: it.designId ? String(it.designId) : undefined,
          color: String(it.color ?? "White"),
          colorHex: typeof it.colorHex === "string" ? it.colorHex : undefined,
          size: String(it.size ?? "M"),
          printArea: String(it.printArea ?? "Front"),
          price: typeof it.price === "number" && !Number.isNaN(it.price) ? it.price : 0,
          quantity: typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1,
          previewDataUrl: typeof it.previewDataUrl === "string" ? it.previewDataUrl : undefined,
        }))
      : [],
    subtotal: typeof o.subtotal === "number" && !Number.isNaN(o.subtotal) ? o.subtotal : 0,
    shipping: typeof o.shipping === "number" && !Number.isNaN(o.shipping) ? o.shipping : 0,
    total: typeof o.total === "number" && !Number.isNaN(o.total) ? o.total : 0,
    shippingAddress: o.shippingAddress && typeof o.shippingAddress === "object" ? o.shippingAddress : undefined,
  }));
}

function saveOrders(orders: Order[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function listOrders(): Order[] {
  return loadOrders().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOrderById(orderId: string): Order | null {
  const orders = loadOrders();
  return orders.find((o) => o.id === orderId) ?? null;
}

export function createOrder(input: { shippingAddress?: ShippingAddress } = {}): Order {
  const items = loadCart();

  const orderItems: OrderItem[] = items.map((it) => ({
    id: uid("OI"),
    name: it.name,
    productType: it.productType,
    designId: it.designId,
    color: it.color,
    colorHex: it.colorHex,
    size: it.size,
    printArea: it.printArea,
    price: it.price,
    quantity: it.quantity,
    previewDataUrl: it.previewDataUrl,
  }));

  const subtotal = items.reduce((sum, it) => sum + (it.price ?? 0) * (it.quantity ?? 1), 0);
  const shipping = items.length > 0 ? DEFAULT_SHIPPING : 0;
  const total = subtotal + shipping;

  const order: Order = {
    id: uid("ORD"),
    createdAt: nowISO(),
    items: orderItems,
    subtotal,
    shipping,
    total,
    shippingAddress: input.shippingAddress,
  };

  const orders = loadOrders();
  const next = [order, ...orders];
  saveOrders(next);

  // clear cart after “checkout”
  clearCart();

  return order;
}
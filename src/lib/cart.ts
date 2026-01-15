// src/lib/cart.ts
"use client";

/**
 * LOOPAWE cart + orders (local-first)
 * - Cart items contain design metadata (designId, productType, printArea, etc.)
 * - Orders are stored client-side (later: Prisma/Stripe/Printful)
 */

export type ProductType = "tshirt" | "hoodie";
export type PrintArea = "Front" | "Back";

export type CartItem = {
  id: string; // unique cart row id
  designId?: string;

  name: string; // display name
  productType?: ProductType;

  color: string;
  colorHex?: string;

  size: string;
  printArea: PrintArea;

  price: number; // unit price
  quantity: number;

  // small thumbnail for UI (NOT full artwork)
  previewDataUrl?: string;

  createdAt: string;
  updatedAt: string;
};

export type ShippingAddress = {
  name: string;
  address1: string;
  address2?: string;
  zip: string;
  city: string;
  country: string;
};

export type OrderItem = Omit<CartItem, "updatedAt">;

export type OrderStatus = "PENDING" | "PAID" | "PROCESSING" | "FULFILLED" | "CANCELLED";

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;

  items: OrderItem[];

  subtotal: number;
  shipping: number;
  total: number;

  shippingAddress: ShippingAddress;
};

const CART_KEY = "loopa_cart_v1";
const ORDERS_KEY = "loopa_orders_v1";

function nowISO() {
  return new Date().toISOString();
}

function uid(prefix = "LW") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readCartRaw(): any[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<any[]>(localStorage.getItem(CART_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

function readOrdersRaw(): any[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<any[]>(localStorage.getItem(ORDERS_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeCartItem(x: any): CartItem {
  const createdAt = typeof x?.createdAt === "string" ? x.createdAt : nowISO();
  const updatedAt = typeof x?.updatedAt === "string" ? x.updatedAt : createdAt;

  const price =
    typeof x?.price === "number" && Number.isFinite(x.price) ? x.price : Number(x?.price) || 0;

  const quantity =
    typeof x?.quantity === "number" && Number.isFinite(x.quantity)
      ? x.quantity
      : Number(x?.quantity) || 1;

  const printArea: PrintArea = x?.printArea === "Back" ? "Back" : "Front";

  const productType: ProductType | undefined =
    x?.productType === "hoodie" || x?.productType === "tshirt" ? x.productType : undefined;

  return {
    id: String(x?.id ?? uid("CI")),
    designId: typeof x?.designId === "string" ? x.designId : undefined,

    name: String(x?.name ?? "Item"),
    productType,

    color: String(x?.color ?? "White"),
    colorHex: typeof x?.colorHex === "string" ? x.colorHex : undefined,

    size: String(x?.size ?? "M"),
    printArea,

    price,
    quantity: Math.max(1, quantity),

    previewDataUrl: typeof x?.previewDataUrl === "string" ? x.previewDataUrl : undefined,

    createdAt,
    updatedAt,
  };
}

function normalizeOrder(x: any): Order {
  const createdAt = typeof x?.createdAt === "string" ? x.createdAt : nowISO();
  const status: OrderStatus =
    x?.status === "PAID" ||
    x?.status === "PROCESSING" ||
    x?.status === "FULFILLED" ||
    x?.status === "CANCELLED"
      ? x.status
      : "PENDING";

  const items: OrderItem[] = Array.isArray(x?.items) ? x.items.map(normalizeCartItem) : [];

  const subtotal =
    typeof x?.subtotal === "number" && Number.isFinite(x.subtotal)
      ? x.subtotal
      : items.reduce((s, it) => s + it.price * it.quantity, 0);

  const shipping =
    typeof x?.shipping === "number" && Number.isFinite(x.shipping) ? x.shipping : 6.95;

  const total =
    typeof x?.total === "number" && Number.isFinite(x.total) ? x.total : subtotal + shipping;

  const sa = x?.shippingAddress ?? {};
  const shippingAddress: ShippingAddress = {
    name: String(sa?.name ?? ""),
    address1: String(sa?.address1 ?? ""),
    address2: typeof sa?.address2 === "string" ? sa.address2 : "",
    zip: String(sa?.zip ?? ""),
    city: String(sa?.city ?? ""),
    country: String(sa?.country ?? ""),
  };

  return {
    id: String(x?.id ?? uid("O")),
    createdAt,
    status,
    items,
    subtotal,
    shipping,
    total,
    shippingAddress,
  };
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function saveOrders(items: Order[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(items));
}

// ----------------- CART API -----------------

export function getCartItems(): CartItem[] {
  return readCartRaw().map(normalizeCartItem);
}

export function getCartCount(): number {
  return getCartItems().reduce((s, it) => s + it.quantity, 0);
}

export function getCartSubtotal(): number {
  return getCartItems().reduce((s, it) => s + it.price * it.quantity, 0);
}

export function addToCart(input: Omit<CartItem, "id" | "createdAt" | "updatedAt">): CartItem[] {
  const items = getCartItems();

  // Merge strategy:
  // If same designId + size + color + printArea → increment qty
  const keyDesign = input.designId ?? "";
  const key = `${keyDesign}|${input.size}|${input.color}|${input.printArea}|${input.productType ?? ""}`;

  const idx = items.findIndex((it) => {
    const itKeyDesign = it.designId ?? "";
    const itKey = `${itKeyDesign}|${it.size}|${it.color}|${it.printArea}|${it.productType ?? ""}`;
    return itKey === key;
  });

  if (idx >= 0) {
    const updated: CartItem = {
      ...items[idx],
      quantity: Math.max(1, items[idx].quantity + (input.quantity || 1)),
      updatedAt: nowISO(),
    };
    const next = [...items];
    next[idx] = updated;
    saveCart(next);
    return next;
  }

  const created: CartItem = normalizeCartItem({
    ...input,
    id: uid("CI"),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });

  const next = [created, ...items];
  saveCart(next);
  return next;
}

export function setCartItemQuantity(id: string, quantity: number): CartItem[] {
  const items = getCartItems();
  const next = items
    .map((it) => (it.id === id ? { ...it, quantity: Math.max(1, quantity), updatedAt: nowISO() } : it))
    .filter(Boolean);
  saveCart(next);
  return next;
}

export function removeCartItem(id: string): CartItem[] {
  const items = getCartItems();
  const next = items.filter((it) => it.id !== id);
  saveCart(next);
  return next;
}

export function clearCart(): void {
  saveCart([]);
}

// ----------------- ORDERS API -----------------

export function listOrders(): Order[] {
  return readOrdersRaw().map(normalizeOrder).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrderById(id: string): Order | null {
  const all = listOrders();
  return all.find((o) => o.id === id) ?? null;
}

export function createOrder(shippingAddress: ShippingAddress): Order {
  const cart = getCartItems();
  if (cart.length === 0) {
    throw new Error("Cart is empty");
  }

  // basic shipping rule for now
  const subtotal = cart.reduce((s, it) => s + it.price * it.quantity, 0);
  const shipping = 6.95;
  const total = subtotal + shipping;

  const order: Order = {
    id: uid("O"),
    createdAt: nowISO(),
    status: "PENDING",
    items: cart.map((it) => ({
      ...it,
      updatedAt: undefined as unknown as never, // strip for OrderItem type (runtime ok)
    })) as unknown as OrderItem[],
    subtotal,
    shipping,
    total,
    shippingAddress,
  };

  const orders = listOrders();
  const next = [order, ...orders];
  saveOrders(next);

  clearCart();
  return order;
}
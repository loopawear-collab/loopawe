"use client";

/**
 * src/lib/cart.ts
 * Single Source of Truth — Cart + Orders (local-first)
 *
 * Goals:
 * 1) Consistent public API for all pages/components (cart, checkout, success, account, mini-cart)
 * 2) Backwards-compatible aliases so older imports never break again
 * 3) Emits cart-updated events so UI (mini-cart) can refresh instantly
 * 4) Future-proof structure (easy DB/Stripe migration later)
 *
 * ✅ Fix included:
 * - Legacy cart keys can NO LONGER "resurrect" items after refresh.
 *   If CART_KEY exists (even as []), we do NOT fallback to legacy.
 * - Whenever we save/clear, we also clear legacy keys.
 *
 * ✅ Hardening included:
 * - createOrder() normalizes shippingAddress + deep-copies items + uses getCartTotals()
 * - normalizeOrder() sanitizes shippingAddress fields
 *
 * ✅ Stripe-ready prep:
 * - Order now has status: "pending" | "paid" | "failed" | "cancelled"
 * - Helpers to update status in localStorage
 */

export type ProductType = "tshirt" | "hoodie";

export type CartItem = {
  id: string;

  // display
  name: string; // "T-shirt" | "Hoodie"
  productType?: ProductType;

  // pricing
  price: number;
  quantity: number;

  // variants
  color: string;
  colorHex?: string;
  size: string;
  printArea: string; // "Front" | "Back"

  // design linkage
  designId?: string;

  // preview (small)
  previewDataUrl?: string;
};

export type ShippingAddress = {
  name: string;
  address1: string;
  address2?: string;
  zip: string;
  city: string;
  country: string;
};

/**
 * Order Status
 *
 * Status flow:
 * - pending: Order created, awaiting payment
 * - paid_mock: Payment completed via mock provider (test payment)
 * - paid: Payment completed via real provider (Stripe)
 * - failed: Payment failed
 * - cancelled: Order cancelled
 */
export type OrderStatus = "pending" | "paid" | "paid_mock" | "failed" | "cancelled";

/**
 * Payment Provider
 *
 * Identifies which payment provider was used for the order.
 */
export type PaymentProvider = "mock" | "stripe";

/**
 * Payment Status
 *
 * Tracks the payment state independent of order status.
 * - unpaid: Payment not yet completed
 * - paid: Payment successfully completed
 * - failed: Payment failed
 */
export type PaymentStatus = "unpaid" | "paid" | "failed";

export type Order = {
  id: string;
  createdAt: string;

  /**
   * Order status (see OrderStatus type for flow documentation)
   */
  status: OrderStatus;

  items: CartItem[];

  subtotal: number;
  shipping: number;
  total: number;

  shippingAddress?: ShippingAddress;

  /**
   * Payment information
   */
  paidAt?: number; // Timestamp when payment was completed (Date.now())

  /**
   * Payment provider abstraction
   * TODO: When implementing Stripe, ensure these fields are set correctly:
   * - paymentProvider: Set to "stripe" when using Stripe
   * - paymentStatus: Set to "unpaid" initially, "paid" on success, "failed" on error
   * - paymentIntentId: Set to Stripe PaymentIntent ID
   */
  paymentProvider?: PaymentProvider;
  paymentStatus?: PaymentStatus;
  paymentIntentId?: string; // Stripe PaymentIntent ID (only set when using Stripe)
};

const CART_KEY = "loopa_cart_v2";
const ORDERS_KEY = "loopa_orders_v2";

// Back-compat keys (older versions)
const LEGACY_CART_KEYS = ["loopa_cart_v1", "loopa_cart"];
const LEGACY_ORDERS_KEYS = ["loopa_orders_v1", "loopa_orders"];

const CART_UPDATED_EVENT = "loopawe:cart-updated";

/** -------------------------
 * Small utils
 * ------------------------*/
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function uid(prefix = "CI") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function hasKey(key: string) {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(key) !== null;
}

function str(v: unknown) {
  return String(v ?? "");
}

function trimOrEmpty(v: unknown) {
  return str(v).trim();
}

function trimOrUndef(v: unknown) {
  const t = trimOrEmpty(v);
  return t ? t : undefined;
}

function normalizeShippingAddress(input?: ShippingAddress): ShippingAddress | undefined {
  if (!input) return undefined;

  const name = trimOrEmpty(input.name);
  const address1 = trimOrEmpty(input.address1);
  const zip = trimOrEmpty(input.zip);
  const city = trimOrEmpty(input.city);
  const country = trimOrEmpty(input.country);

  // If required fields are missing, treat as undefined (safer than storing broken objects)
  if (!name || !address1 || !zip || !city || !country) return undefined;

  return {
    name,
    address1,
    address2: trimOrUndef(input.address2),
    zip,
    city,
    country,
  };
}

function normalizeOrderStatus(v: unknown): OrderStatus {
  const s = String(v ?? "").toLowerCase();
  if (s === "paid") return "paid";
  if (s === "paid_mock" || s === "paidmock") return "paid_mock";
  if (s === "failed") return "failed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  return "pending";
}

/** -------------------------
 * Events
 * ------------------------*/
export function emitCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
}

export function subscribeCartUpdated(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener(CART_UPDATED_EVENT, handler);
  return () => window.removeEventListener(CART_UPDATED_EVENT, handler);
}

/** -------------------------
 * Load / Save (Cart)
 * ------------------------*/
function normalizeItem(anyIt: any): CartItem | null {
  if (!anyIt) return null;

  const id = str(anyIt.id);
  if (!id) return null;

  const name = str(anyIt.name || "T-shirt");
  const productType: ProductType | undefined =
    anyIt.productType === "hoodie" ? "hoodie" : anyIt.productType === "tshirt" ? "tshirt" : undefined;

  const price = Number(anyIt.price);
  const quantity = Number(anyIt.quantity);

  const color = str(anyIt.color || "White");
  const colorHex = typeof anyIt.colorHex === "string" ? anyIt.colorHex : undefined;
  const size = str(anyIt.size || "M");
  const printArea = str(anyIt.printArea || "Front");
  const designId = anyIt.designId ? str(anyIt.designId) : undefined;
  const previewDataUrl = typeof anyIt.previewDataUrl === "string" ? anyIt.previewDataUrl : undefined;

  return {
    id,
    name,
    productType,
    price: Number.isFinite(price) ? price : 0,
    quantity: Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1,
    color,
    colorHex,
    size,
    printArea,
    designId,
    previewDataUrl,
  };
}

function loadCartFromKey(key: string): CartItem[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<any[]>(localStorage.getItem(key));
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.map(normalizeItem).filter((x): x is CartItem => Boolean(x));
}

function clearLegacyCartKeys() {
  if (typeof window === "undefined") return;
  for (const k of LEGACY_CART_KEYS) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
}

/**
 * ✅ FIX:
 * - If CART_KEY exists (even if it's []), it's the source of truth.
 * - Only if CART_KEY does NOT exist, we attempt legacy migration ONCE.
 */
function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  if (hasKey(CART_KEY)) {
    return loadCartFromKey(CART_KEY);
  }

  // Try legacy keys and migrate ONCE
  for (const k of LEGACY_CART_KEYS) {
    const legacy = loadCartFromKey(k);
    if (legacy.length > 0) {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(legacy));
      } catch {}
      clearLegacyCartKeys();
      return legacy;
    }
  }

  // If nothing exists, create empty v2 so we never fallback again
  try {
    localStorage.setItem(CART_KEY, JSON.stringify([]));
  } catch {}
  return [];
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(CART_KEY, JSON.stringify(items));

  // ✅ Also clear legacy so they can’t resurrect items
  clearLegacyCartKeys();

  emitCartUpdated();
}

/** -------------------------
 * Load / Save (Orders)
 * ------------------------*/
function normalizeOrder(anyO: any): Order | null {
  if (!anyO) return null;
  const id = str(anyO.id);
  if (!id) return null;

  const createdAt = typeof anyO.createdAt === "string" ? anyO.createdAt : nowISO();

  const itemsRaw = Array.isArray(anyO.items) ? anyO.items : [];
  const items = itemsRaw.map(normalizeItem).filter((x: CartItem | null): x is CartItem => Boolean(x));

  const subtotal = Number(anyO.subtotal);
  const shipping = Number(anyO.shipping);
  const total = Number(anyO.total);

  const shippingAddress =
    anyO.shippingAddress && typeof anyO.shippingAddress === "object"
      ? normalizeShippingAddress({
          name: str(anyO.shippingAddress.name),
          address1: str(anyO.shippingAddress.address1),
          address2: anyO.shippingAddress.address2 ? str(anyO.shippingAddress.address2) : undefined,
          zip: str(anyO.shippingAddress.zip),
          city: str(anyO.shippingAddress.city),
          country: str(anyO.shippingAddress.country),
        })
      : undefined;

  const paidAt = typeof anyO.paidAt === "number" && Number.isFinite(anyO.paidAt) ? anyO.paidAt : undefined;

  // Payment provider fields
  const paymentProvider: PaymentProvider | undefined =
    anyO.paymentProvider === "stripe" ? "stripe" : anyO.paymentProvider === "mock" ? "mock" : undefined;
  const paymentStatus: PaymentStatus | undefined =
    anyO.paymentStatus === "paid" ? "paid" : anyO.paymentStatus === "failed" ? "failed" : anyO.paymentStatus === "unpaid" ? "unpaid" : undefined;
  const paymentIntentId = typeof anyO.paymentIntentId === "string" ? anyO.paymentIntentId : undefined;

  return {
    id,
    createdAt,
    status: normalizeOrderStatus(anyO.status),
    items,
    subtotal: Number.isFinite(subtotal) ? subtotal : 0,
    shipping: Number.isFinite(shipping) ? shipping : 0,
    total: Number.isFinite(total) ? total : 0,
    shippingAddress,
    paidAt,
    paymentProvider,
    paymentStatus,
    paymentIntentId,
  };
}

function loadOrdersFromKey(key: string): Order[] {
  if (typeof window === "undefined") return [];
  const parsed = safeParse<any[]>(localStorage.getItem(key));
  if (!parsed || !Array.isArray(parsed)) return [];
  return parsed.map(normalizeOrder).filter((x): x is Order => Boolean(x));
}

function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];

  const v2 = loadOrdersFromKey(ORDERS_KEY);
  if (v2.length > 0) return v2;

  for (const k of LEGACY_ORDERS_KEYS) {
    const legacy = loadOrdersFromKey(k);
    if (legacy.length > 0) {
      try {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(legacy));
      } catch {}
      return legacy;
    }
  }

  return [];
}

function saveOrders(orders: Order[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

/** -------------------------
 * Totals helpers
 * ------------------------*/
export function getCartSubtotal(items?: CartItem[]): number {
  const it = items ?? loadCart();
  const subtotal = it.reduce((sum, x) => sum + (x.price || 0) * (x.quantity || 1), 0);
  return Math.max(0, Number.isFinite(subtotal) ? subtotal : 0);
}

export function getCartShipping(subtotal?: number): number {
  const s = Number.isFinite(subtotal) ? (subtotal as number) : getCartSubtotal();
  return s > 0 ? 6.95 : 0;
}

export function getCartTotal(subtotal?: number, shipping?: number): number {
  const sub = Number.isFinite(subtotal) ? (subtotal as number) : getCartSubtotal();
  const ship = Number.isFinite(shipping) ? (shipping as number) : getCartShipping(sub);
  return Math.max(0, sub + ship);
}

export function getCartTotals(items?: CartItem[]) {
  const subtotal = getCartSubtotal(items);
  const shipping = getCartShipping(subtotal);
  const total = getCartTotal(subtotal, shipping);
  return { subtotal, shipping, total };
}

/** -------------------------
 * Public: Cart getters
 * ------------------------*/
export function getCartItems(): CartItem[] {
  return loadCart();
}

/** -------------------------
 * Public: Cart mutations
 * ------------------------*/
export function addToCart(input: Partial<CartItem> & { name: string; price: number; quantity?: number }): CartItem {
  const cart = loadCart();

  const productType: ProductType | undefined =
    input.productType === "hoodie" ? "hoodie" : input.productType === "tshirt" ? "tshirt" : undefined;

  const item: CartItem = {
    id: str(input.id ?? uid("CI")),
    name: str(input.name ?? "T-shirt"),
    productType,
    price: Number.isFinite(input.price) ? Number(input.price) : 0,
    quantity: Math.max(1, Math.floor(Number.isFinite(input.quantity) ? Number(input.quantity) : 1)),
    color: str(input.color ?? "White"),
    colorHex: typeof input.colorHex === "string" ? input.colorHex : undefined,
    size: str(input.size ?? "M"),
    printArea: str(input.printArea ?? "Front"),
    designId: input.designId ? str(input.designId) : undefined,
    previewDataUrl: typeof input.previewDataUrl === "string" ? input.previewDataUrl : undefined,
  };

  // Merge identical variants (keeps cart clean)
  const mergeKey = `${item.designId ?? ""}__${item.name}__${item.productType ?? ""}__${item.size}__${item.color}__${item.printArea}`;

  const idx = cart.findIndex((x) => {
    const xKey = `${x.designId ?? ""}__${x.name}__${x.productType ?? ""}__${x.size}__${x.color}__${x.printArea}`;
    return xKey === mergeKey;
  });

  let next: CartItem[];

  if (idx !== -1) {
    next = [...cart];
    next[idx] = { ...next[idx], quantity: Math.max(1, (next[idx].quantity ?? 1) + item.quantity) };
  } else {
    next = [item, ...cart];
  }

  saveCart(next);
  return item;
}

export function removeCartItem(id: string): CartItem[] {
  const next = loadCart().filter((x) => x.id !== id);
  saveCart(next);
  return next;
}

export function setCartItemQuantity(id: string, quantity: number): CartItem[] {
  const q = Math.max(1, Math.floor(Number.isFinite(quantity) ? quantity : 1));
  const cart = loadCart();
  const idx = cart.findIndex((x) => x.id === id);
  if (idx === -1) return cart;

  const next = [...cart];
  next[idx] = { ...next[idx], quantity: q };
  saveCart(next);
  return next;
}

export function clearCart(): void {
  saveCart([]);
}

/** Back-compat aliases */
export function removeFromCart(id: string) {
  return removeCartItem(id);
}
export function updateCartQuantity(id: string, quantity: number) {
  return setCartItemQuantity(id, quantity);
}
export function removeCartItemById(id: string) {
  return removeCartItem(id);
}
export function setCartItemQty(id: string, quantity: number) {
  return setCartItemQuantity(id, quantity);
}

/** -------------------------
 * Orders
 * ------------------------*/
export function listOrders(): Order[] {
  return loadOrders().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getOrderById(id: string): Order | null {
  return loadOrders().find((o) => o.id === id) ?? null;
}

/**
 * Update an order (internal helper, also exported for payment providers)
 */
export function updateOrder(orderId: string, patch: Partial<Order>): Order | null {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;

  const next = [...orders];
  next[idx] = { ...next[idx], ...patch };
  saveOrders(next);
  return next[idx];
}

/**
 * ✅ Public: set status (Stripe-ready)
 */
export function setOrderStatus(orderId: string, status: OrderStatus): Order | null {
  return updateOrder(orderId, { status });
}

export function markOrderPaid(orderId: string): Order | null {
  return setOrderStatus(orderId, "paid");
}

export function markOrderFailed(orderId: string): Order | null {
  return setOrderStatus(orderId, "failed");
}

export function cancelOrder(orderId: string): Order | null {
  return setOrderStatus(orderId, "cancelled");
}

/**
 * Mock payment: mark order as paid_mock (for testing without Stripe).
 *
 * @deprecated Use processPayment(orderId, "mock") from @/lib/payments instead.
 * This function is kept for backward compatibility only.
 *
 * Status transition: pending → paid_mock
 */
export function markOrderPaidMock(orderId: string): Order | null {
  return updateOrder(orderId, {
    status: "paid_mock",
    paidAt: Date.now(),
    paymentProvider: "mock",
    paymentStatus: "paid",
  });
}

/**
 * Create a new order from the current cart.
 *
 * Creates an order with status "pending" (awaiting payment).
 * Payment should be processed separately using processPayment() from @/lib/payments.
 *
 * Status: pending (initial state)
 */
export function createOrder(opts?: { shippingAddress?: ShippingAddress }): Order | null {
  const cartItems = loadCart();
  if (cartItems.length === 0) return null;

  // Freeze a snapshot (deep copy) so the order never changes if cart changes later
  const items: CartItem[] = cartItems.map((it) => ({ ...it }));

  // Always consistent totals
  const totals = getCartTotals(items);

  const order: Order = {
    id: uid("O"),
    createdAt: nowISO(),
    status: "pending", // Initial state: awaiting payment
    items,
    subtotal: totals.subtotal,
    shipping: totals.shipping,
    total: totals.total,
    shippingAddress: normalizeShippingAddress(opts?.shippingAddress),
    // Payment fields will be set by processPayment() when payment is processed
  };

  const orders = loadOrders();
  saveOrders([order, ...orders]);

  clearCart();
  return order;
}

export function computeOrderTotals(order: Order) {
  const subtotal =
    Number.isFinite(order.subtotal) && order.subtotal > 0 ? order.subtotal : getCartSubtotal(order.items ?? []);
  const shipping =
    Number.isFinite(order.shipping) && order.shipping >= 0 ? order.shipping : getCartShipping(subtotal);
  const total =
    Number.isFinite(order.total) && order.total > 0 ? order.total : getCartTotal(subtotal, shipping);

  return { subtotal, shipping, total };
}
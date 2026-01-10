"use client";

export type OrderItem = {
  id: string;
  createdAt: number;

  productType: "tshirt" | "hoodie";
  colorName: string;
  colorHex: string;
  size: "S" | "M" | "L" | "XL" | "XXXL";
  quantity: number;

  printArea: "front" | "back" | "both";
  unitPrice: number;

  designDataUrl: string | null;
  designScale: number;
  designX: number;
  designY: number;
};

export type Order = {
  id: string; // LW-...
  createdAt: number;

  userId: string;
  email: string;

  shipping: {
    fullName: string;
    street: string;
    zip: string;
    city: string;
    country: string;
  };

  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  taxes: number;
  total: number;

  status: "PLACED" | "PROCESSING" | "SHIPPED" | "DELIVERED";
};

const ORDERS_KEY = "loopa_orders_v1";
const LAST_ORDER_KEY = "loopa_last_order_v1";

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getAllOrders(): Order[] {
  return safeRead<Order[]>(ORDERS_KEY, []);
}

export function saveOrder(order: Order) {
  const all = getAllOrders();
  all.unshift(order);
  safeWrite(ORDERS_KEY, all);
  safeWrite(LAST_ORDER_KEY, order);
}

export function getOrderById(orderId: string): Order | null {
  const all = getAllOrders();
  return all.find((o) => o.id === orderId) ?? null;
}

export function getOrdersForUser(userId: string): Order[] {
  return getAllOrders().filter((o) => o.userId === userId);
}

export function getLastOrder(): Order | null {
  return safeRead<Order | null>(LAST_ORDER_KEY, null);
}
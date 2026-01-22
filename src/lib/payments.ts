"use client";

/**
 * Payment provider abstraction
 *
 * Supports:
 * - "mock": Test payment (no real charge)
 * - "stripe": Real Stripe payment (to be implemented)
 */

import type { Order, PaymentProvider, PaymentStatus } from "@/lib/cart";
import { getOrderById, updateOrder } from "@/lib/cart";

// Re-export types for convenience
export type { PaymentProvider, PaymentStatus };

export type PaymentResult = {
  success: boolean;
  order: Order | null;
  error?: string;
};

/**
 * Process payment for an order using the specified provider
 */
export async function processPayment(
  orderId: string,
  provider: PaymentProvider
): Promise<PaymentResult> {
  switch (provider) {
    case "mock":
      return processMockPayment(orderId);
    case "stripe":
      return processStripePayment(orderId);
    default:
      return {
        success: false,
        order: null,
        error: `Unknown payment provider: ${provider}`,
      };
  }
}

/**
 * Mock payment provider (for testing without Stripe)
 */
async function processMockPayment(orderId: string): Promise<PaymentResult> {
  try {
    const order = getOrderById(orderId);
    if (!order) {
      return {
        success: false,
        order: null,
        error: "Order not found",
      };
    }

    // For mock payment, we mark as paid_mock and set payment fields
    const updated = updateOrder(orderId, {
      status: "paid_mock",
      paidAt: Date.now(),
      paymentProvider: "mock",
      paymentStatus: "paid",
    });

    if (!updated) {
      return {
        success: false,
        order: null,
        error: "Failed to update order",
      };
    }

    return {
      success: true,
      order: updated,
    };
  } catch (error) {
    return {
      success: false,
      order: null,
      error: error instanceof Error ? error.message : "Payment processing failed",
    };
  }
}

/**
 * Stripe payment provider (placeholder - not implemented yet)
 */
async function processStripePayment(orderId: string): Promise<PaymentResult> {
  // TODO: Implement Stripe payment processing
  // This will:
  // 1. Create Stripe PaymentIntent
  // 2. Update order with paymentIntentId
  // 3. Return payment result
  return {
    success: false,
    order: null,
    error: "Stripe payment not implemented yet",
  };
}

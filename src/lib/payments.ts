"use client";

/**
 * Payment Provider Abstraction
 *
 * Centralizes payment processing logic and separates it from checkout UI.
 * Supports multiple payment providers with a unified interface.
 *
 * Current providers:
 * - "mock": Test payment (no real charge) - fully implemented
 * - "stripe": Real Stripe payment - TODO: implement
 *
 * Order status flow:
 * - pending → paid_mock (mock) or paid (stripe) → (future: fulfillment)
 */

import type { Order, OrderStatus, PaymentProvider, PaymentStatus } from "@/lib/cart";
import { getOrderById, updateOrder } from "@/lib/cart";
import { createPayoutsForOrder } from "@/lib/payouts";

// Re-export types for convenience
export type { PaymentProvider, PaymentStatus };

export type PaymentResult = {
  success: boolean;
  order: Order | null;
  error?: string;
};

/**
 * Process payment for an order using the specified provider.
 *
 * This is the main entry point for all payment processing.
 * It routes to the appropriate provider implementation.
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
 * Mock Payment Provider
 *
 * Simulates a successful payment without charging any real money.
 * Used for testing and development.
 *
 * Status transition: pending → paid_mock
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

    // Validate order is in correct state for payment
    if (order.status !== "pending") {
      return {
        success: false,
        order: null,
        error: `Order is not in pending state (current: ${order.status})`,
      };
    }

    // Transition: pending → paid_mock
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

    // Create creator payouts for this order (status: eligible)
    // This happens automatically when order becomes paid
    createPayoutsForOrder(orderId);

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
 * Stripe Payment Provider
 *
 * TODO: Implement Stripe payment processing
 *
 * Implementation steps:
 * 1. Create Stripe PaymentIntent via API route (POST /api/payments/create-intent)
 * 2. Update order with paymentIntentId and paymentProvider: "stripe"
 * 3. Return PaymentResult with clientSecret for Stripe Elements
 * 4. On payment confirmation, update order status: pending → paid
 * 5. Call createPayoutsForOrder(orderId) to create eligible payouts
 * 6. Handle webhook for payment confirmation (POST /api/payments/webhook)
 *
 * Status transition: pending → paid (via Stripe)
 *
 * Required dependencies (to be added):
 * - @stripe/stripe-js
 * - stripe (server-side)
 *
 * Required environment variables:
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 */
async function processStripePayment(orderId: string): Promise<PaymentResult> {
  // TODO: Implement Stripe payment processing
  // See function documentation above for implementation steps

  const order = getOrderById(orderId);
  if (!order) {
    return {
      success: false,
      order: null,
      error: "Order not found",
    };
  }

  // TODO: Create Stripe PaymentIntent
  // const paymentIntent = await createStripePaymentIntent({
  //   amount: order.total * 100, // Convert to cents
  //   currency: "eur",
  //   metadata: { orderId: order.id },
  // });

  // TODO: Update order with paymentIntentId
  // const updated = updateOrder(orderId, {
  //   paymentProvider: "stripe",
  //   paymentStatus: "unpaid",
  //   paymentIntentId: paymentIntent.id,
  // });

  return {
    success: false,
    order: null,
    error: "Stripe payment not implemented yet",
  };
}

/**
 * Helper: Check if an order can transition to a new status.
 *
 * This enforces type-safe status transitions:
 * - pending → paid_mock (mock) or paid (stripe)
 * - paid_mock → paid (future: when mock payment is confirmed)
 * - paid → (future: fulfillment states)
 */
export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  // Allow transitions from pending
  if (currentStatus === "pending") {
    return newStatus === "paid_mock" || newStatus === "paid";
  }

  // Allow transition from paid_mock to paid (future: when confirming mock payment)
  if (currentStatus === "paid_mock" && newStatus === "paid") {
    return true;
  }

  // Allow transitions to failed or cancelled from any state
  if (newStatus === "failed" || newStatus === "cancelled") {
    return true;
  }

  return false;
}

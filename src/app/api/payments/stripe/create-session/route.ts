import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { Order } from "@/lib/cart";

/**
 * Stripe Checkout Session Creation API Route
 *
 * Creates a Stripe Checkout Session for an existing order.
 * Receives the full order payload from the client (local-first, no server-side storage).
 *
 * TODO: Add webhook handler at /api/payments/stripe/webhook/route.ts
 *   - Handle checkout.session.completed event
 *   - Update order status to "paid" (client will need to update localStorage)
 *   - Set paymentProvider: "stripe", paymentStatus: "paid"
 *   - Call createPayoutsForOrder() to create eligible payouts
 */

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    // Validate Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { order } = body as { order?: Order };

    // Validate order payload
    if (!order) {
      return NextResponse.json({ error: "order is required" }, { status: 400 });
    }

    if (!order.id || typeof order.id !== "string") {
      return NextResponse.json({ error: "order.id is required" }, { status: 400 });
    }

    // Validate order status
    if (order.status !== "pending") {
      return NextResponse.json(
        { error: `Order is not in pending state (current: ${order.status})` },
        { status: 400 }
      );
    }

    // Validate customer email
    if (!order.customerEmail || !order.customerEmail.trim()) {
      return NextResponse.json({ error: "Order missing customer email" }, { status: 400 });
    }

    // Validate items
    if (!Array.isArray(order.items) || order.items.length === 0) {
      return NextResponse.json({ error: "Order must have at least one item" }, { status: 400 });
    }

    // Build base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Build line items: order items + shipping
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      ...order.items.map((item) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: item.name || "Item",
            description: `${item.color} • ${item.size} • ${item.printArea}`,
          },
          unit_amount: Math.round((item.price || 0) * 100), // Convert EUR to cents
        },
        quantity: item.quantity || 1,
      })),
    ];

    // Add shipping as separate line item if present
    if (order.shipping > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Verzending",
            description: "Shipping costs",
          },
          unit_amount: Math.round(order.shipping * 100), // Convert EUR to cents
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "eur",
      customer_email: order.customerEmail,
      line_items: lineItems,
      metadata: {
        orderId: order.id,
      },
      success_url: `${baseUrl}/success/${encodeURIComponent(order.id)}?stripe=1`,
      cancel_url: `${baseUrl}/checkout`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

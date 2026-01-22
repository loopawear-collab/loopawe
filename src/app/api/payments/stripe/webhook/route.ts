import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getOrderById, updateOrder } from "@/lib/cart";
import { createPayoutsForOrder } from "@/lib/payouts";

/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events, specifically checkout.session.completed.
 * Verifies webhook signature and updates order status to "paid".
 *
 * Setup:
 * - Set STRIPE_SECRET_KEY in your environment variables
 * - Set STRIPE_WEBHOOK_SECRET in your environment variables (get from Stripe Dashboard > Webhooks > Signing secret)
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

    // Validate webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET environment variable is not set" },
        { status: 500 }
      );
    }

    // Read raw body text (required for signature verification)
    const rawBody = await request.text();

    // Read signature header
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle only checkout.session.completed event
    if (event.type !== "checkout.session.completed") {
      console.log(`[Stripe Webhook] Ignoring event type: ${event.type}`);
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    // Validate orderId from metadata
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid orderId in session metadata" },
        { status: 400 }
      );
    }

    // Load order
    const order = getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: `Order not found: ${orderId}` }, { status: 404 });
    }

    // Idempotent: if order is already paid, return success
    if (order.status !== "pending") {
      console.log(`[Stripe Webhook] Order ${orderId} already processed (status: ${order.status})`);
      return NextResponse.json({ received: true });
    }

    // Update order to paid status
    updateOrder(orderId, {
      status: "paid",
      paidAt: Date.now(),
      paymentProvider: "stripe",
      paymentStatus: "paid",
    });

    // Create payouts for eligible creators
    createPayoutsForOrder(orderId);

    console.log(`[Stripe Webhook] Order ${orderId} marked as paid and payouts created`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

import { stripe, stripeEnabled } from '../config/stripe.js';
import { env } from '../config/env.js';
import { Order } from '../models/Order.js';
import { PaymentTransaction } from '../models/Operations.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/apiError.js';
import { createOrder } from '../services/orderService.js';
import { fromMinor } from '../utils/money.js';

/** Create a Stripe Checkout session for an order paid by card. */
export const createCheckoutSession = asyncHandler(async (req, res) => {
  if (!stripeEnabled) {
    return res.status(503).json({
      success: false,
      error: { message: 'Stripe is not configured. Use Cash on Delivery or the mock method in development.' },
    });
  }

  const payload = { ...req.body, paymentMethod: 'stripe' };
  const order = await createOrder({ payload, user: req.user });
  const origin = env.clientUrl;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: order.customer?.email || order.guestEmail,
    line_items: [{
      price_data: {
        currency: 'mad',
        unit_amount: order.total,
        product_data: { name: `Order ${order.orderNumber}` },
      },
      quantity: 1,
    }],
    metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber },
    success_url: `${origin}/checkout/success?order=${order.orderNumber}`,
    cancel_url: `${origin}/checkout?canceled=1`,
  });

  await PaymentTransaction.updateOne({ order: order._id }, {
    providerTransactionId: session.id,
    status: 'pending',
  });
  order.paymentIntentId = session.id;
  await order.save();

  res.json({ success: true, data: { url: session.url, orderNumber: order.orderNumber } });
});

export const stripeWebhook = asyncHandler(async (req, res) => {
  if (!stripeEnabled || !env.stripe.webhookSecret) {
    return res.status(400).json({ success: false, error: { message: 'Webhook not configured' } });
  }

  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripe.webhookSecret);
  } catch (error) {
    return res.status(400).json({ success: false, error: { message: `Webhook signature error: ${error.message}` } });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const order = await Order.findById(session.metadata?.orderId);
    if (order && order.paymentStatus !== 'Paid') {
      order.paymentStatus = 'Paid';
      order.status = 'Confirmed';
      order.statusLog.push({ status: 'Confirmed', note: 'Stripe payment confirmed', at: new Date() });
      await order.save();
      await PaymentTransaction.updateOne(
        { providerTransactionId: session.id },
        { status: 'succeeded', providerTransactionId: session.payment_intent || session.id },
      );
    }
  }

  if (event.type === 'charge.refunded') {
    const intent = event.data.object.payment_intent;
    await PaymentTransaction.updateOne({ providerTransactionId: intent }, { status: 'refunded' });
    await Order.updateOne({ paymentIntentId: intent }, { paymentStatus: 'Refunded', status: 'Refunded' });
  }

  res.json({ received: true });
});

export const mockPayment = asyncHandler(async (req, res) => {
  if (env.isProduction) throw badRequest('Mock payments are disabled in production');
  const order = await Order.findById(req.body.orderId);
  if (!order) throw notFound('Order not found');
  order.paymentStatus = 'Paid';
  order.status = 'Confirmed';
  await order.save();
  await PaymentTransaction.updateOne({ order: order._id }, { status: 'succeeded' });
  res.json({ success: true, data: { orderNumber: order.orderNumber, total: fromMinor(order.total) } });
});

export const paymentConfig = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    data: {
      stripeEnabled,
      publishableKey: env.stripe.publishableKey || null,
      codEnabled: true,
      mockEnabled: !env.isProduction,
    },
  });
});

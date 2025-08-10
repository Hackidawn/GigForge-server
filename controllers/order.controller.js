// server/controllers/order.controller.js
import Order from '../models/Order.js';
import Gig from '../models/Gig.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// -----------------------------------------------------------------------------
// GET /orders  -> all orders where the user is buyer or seller
// -----------------------------------------------------------------------------
export const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({
      $or: [{ sellerId: userId }, { buyerId: userId }],
    })
      .populate('gigId buyerId sellerId')
      .sort('-createdAt');

    res.json(orders);
  } catch (err) {
    console.error('getOrders error:', err);
    res.status(500).json('Failed to fetch orders');
  }
};

// -----------------------------------------------------------------------------
// GET /orders/:orderId -> single order (buyer or seller only)
// -----------------------------------------------------------------------------
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate('gigId buyerId sellerId');
    if (!order) return res.status(404).json('Order not found');

    if (
      order.buyerId.toString() !== req.user.id &&
      order.sellerId.toString() !== req.user.id
    ) {
      return res.status(403).json('Unauthorized');
    }

    res.json(order);
  } catch (err) {
    console.error('getOrderById error:', err);
    res.status(500).json('Failed to fetch order');
  }
};

// -----------------------------------------------------------------------------
// POST /orders/checkout/:gigId  -> start checkout OR create free order
// For free gigs (price <= 0), directly create an order and skip Stripe.
// -----------------------------------------------------------------------------
export const checkout = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.gigId);
    if (!gig) return res.status(404).json('Gig not found');

    const clientURL = process.env.CLIENT_URL?.startsWith('http')
      ? process.env.CLIENT_URL
      : `http://${process.env.CLIENT_URL}`;

    const numericPrice = Number(gig.price || 0);

    // 🆓 FREE ORDER SHORT-CIRCUIT
    if (!numericPrice || numericPrice <= 0) {
      const order = await Order.create({
        gigId: gig._id,
        buyerId: req.user.id,
        sellerId: gig.userId,
        price: 0,
        status: 'active',
      });

      return res.json({
        url: `${clientURL}/orders?success=true&free=true&order=${order._id}`,
      });
    }

    // 💳 PAID FLOW (Stripe)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd', // or 'inr' if configured
            product_data: {
              name: gig.title,
              description: gig.description,
            },
            unit_amount: Math.round(numericPrice * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${clientURL}/orders?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientURL}/gigs/${gig._id}`,
      metadata: {
        gigId: gig._id.toString(),
        buyerId: req.user.id,
        sellerId: gig.userId.toString(),
        amount: String(numericPrice),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('checkout error:', err);
    res.status(500).json('Failed to start checkout');
  }
};

// -----------------------------------------------------------------------------
// PATCH /orders/complete/:gigId (legacy by gig) -> mark most recent active order completed
// -----------------------------------------------------------------------------
export const completeOrder = async (req, res) => {
  try {
    const gigId = req.params.gigId;
    const sellerId = req.user.id;

    const order = await Order.findOne({
      gigId,
      sellerId,
      status: 'active',
    }).sort({ createdAt: -1 });

    if (!order) return res.status(404).json('Active order not found');

    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    res.json(order);
  } catch (err) {
    console.error('completeOrder error:', err);
    res.status(500).json('Failed to complete order');
  }
};

// -----------------------------------------------------------------------------
// PATCH /orders/cancel/:gigId (legacy by gig) -> cancel most recent active order
// - Free orders: just mark cancelled.
// - Paid orders: refund via Stripe.
// -----------------------------------------------------------------------------
export const cancelOrder = async (req, res) => {
  try {
    const gigId = req.params.gigId;
    const sellerId = req.user.id;

    const order = await Order.findOne({
      gigId,
      sellerId,
      status: 'active',
    }).sort({ createdAt: -1 });

    if (!order) return res.status(404).json('Active order not found');

    if (!order.checkoutSessionId && !order.paymentIntentId) {
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.refunded = false;
      await order.save();
      return res.json(order);
    }

    const session = await stripe.checkout.sessions.retrieve(order.checkoutSessionId);
    const paymentIntentId = session.payment_intent;
    await stripe.refunds.create({ payment_intent: paymentIntentId });

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.refunded = true;
    await order.save();

    res.json(order);
  } catch (err) {
    console.error('cancelOrder error:', err);
    res.status(500).json('Failed to cancel order');
  }
};

// -----------------------------------------------------------------------------
// PATCH /orders/complete-by-id/:orderId -> mark specific order completed
// -----------------------------------------------------------------------------
export const completeOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json('Order not found');

    if (order.sellerId.toString() !== req.user.id) {
      return res.status(403).json('Unauthorized');
    }

    if (order.status !== 'active') {
      return res.status(400).json('Order is not active');
    }

    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    res.json(order);
  } catch (err) {
    console.error('completeOrderById error:', err);
    res.status(500).json('Failed to complete order');
  }
};

// -----------------------------------------------------------------------------
// PATCH /orders/cancel-by-id/:orderId -> cancel specific order
// -----------------------------------------------------------------------------
export const cancelOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json('Order not found');

    if (order.sellerId.toString() !== req.user.id) {
      return res.status(403).json('Unauthorized');
    }

    if (order.status !== 'active') {
      return res.status(400).json('Only active orders can be cancelled');
    }

    if (!order.checkoutSessionId && !order.paymentIntentId) {
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.refunded = false;
      await order.save();
      return res.json(order);
    }

    const session = await stripe.checkout.sessions.retrieve(order.checkoutSessionId);
    const paymentIntentId = session.payment_intent;
    await stripe.refunds.create({ payment_intent: paymentIntentId });

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.refunded = true;
    await order.save();

    res.json(order);
  } catch (err) {
    console.error('cancelOrderById error:', err);
    res.status(500).json('Failed to cancel order');
  }
};

// -----------------------------------------------------------------------------
// POST /orders/webhook -> Stripe webhook handler
// -----------------------------------------------------------------------------
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const existingOrder = await Order.findOne({ checkoutSessionId: session.id });
      if (existingOrder) {
        return res.status(200).send('Duplicate ignored');
      }

      const price =
        (typeof session.amount_total === 'number' ? session.amount_total / 100 : null) ??
        Number(session.metadata?.amount ?? 0);

      const order = new Order({
        gigId: session.metadata.gigId,
        buyerId: session.metadata.buyerId,
        sellerId: session.metadata.sellerId,
        price,
        status: 'active',
        paymentIntentId: session.payment_intent,
        checkoutSessionId: session.id,
      });

      await order.save();
      console.log('Order created via webhook:', order._id);
    } catch (err) {
      console.error('Webhook DB error:', err.message);
      return res.status(500).send('Webhook DB error');
    }
  }

  res.status(200).send('Webhook received');
};

// -----------------------------------------------------------------------------
// GET /orders/confirm-session?session_id=...  -> fallback if webhook missed
// -----------------------------------------------------------------------------
export const confirmSession = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json('Missing session_id');

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(400).json('Payment not completed');
    }

    const existing = await Order.findOne({ checkoutSessionId: session.id });
    if (existing) return res.json({ ok: true, created: false, order: existing });

    const meta = session.metadata || {};
    if (!meta.gigId || !meta.buyerId || !meta.sellerId) {
      return res.status(400).json('Missing metadata on session');
    }

    const price =
      (typeof session.amount_total === 'number' ? session.amount_total / 100 : null) ??
      Number(meta.amount ?? 0);

    const order = await Order.create({
      gigId: meta.gigId,
      buyerId: meta.buyerId,
      sellerId: meta.sellerId,
      price,
      status: 'active',
      paymentIntentId: session.payment_intent,
      checkoutSessionId: session.id,
    });

    console.log('Order created via confirmSession:', order._id);
    return res.json({ ok: true, created: true, order });
  } catch (err) {
    console.error('confirmSession error:', err);
    res.status(500).json('Failed to confirm session');
  }
};

// -----------------------------------------------------------------------------
// POST /orders/start-work/:orderId  -> seller marks work as started
// -----------------------------------------------------------------------------
export const startWork = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json('Order not found');

    if (order.sellerId.toString() !== userId) {
      return res.status(403).json('Unauthorized');
    }

    if (order.status !== 'active' || order.started) {
      return res.status(400).json('Order already started or not active');
    }

    order.started = true;
    order.startedAt = new Date();
    await order.save();

    res.json({ message: 'Work started', order });
  } catch (err) {
    console.error('startWork error:', err);
    res.status(500).json('Failed to start work');
  }
};

// -----------------------------------------------------------------------------
// PATCH /orders/update-progress/:orderId  -> seller updates progress (0-100)
// Also emits a socket event so the buyer UI can live-update.
// -----------------------------------------------------------------------------
export const updateProgress = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { progress } = req.body;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json('Order not found');

    if (order.sellerId.toString() !== userId) {
      return res.status(403).json('Unauthorized');
    }

    if (!order.started) {
      return res.status(400).json('Cannot update progress before starting work');
    }

    const value = Number(progress);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      return res.status(400).json('Progress must be a number between 0 and 100');
    }

    order.progress = value;
    await order.save();

    // 🔔 Broadcast progress change (optional — requires io in app)
    const io = req.app?.get?.('io');
    if (io) {
      io.emit('orders:progressUpdated', {
        orderId: order._id.toString(),
        buyerId: order.buyerId.toString(),
        sellerId: order.sellerId.toString(),
        progress: order.progress,
      });
    }

    res.json({ message: 'Progress updated', progress: order.progress });
  } catch (err) {
    console.error('updateProgress error:', err);
    res.status(500).json('Failed to update progress');
  }
};

import { Order } from '../models/Order.js';
import { PaymentTransaction } from '../models/Operations.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { notFound, forbidden, badRequest } from '../utils/apiError.js';
import { createOrder, updateOrderStatus, calculateCart } from '../services/orderService.js';

export const checkout = asyncHandler(async (req, res) => {
  const order = await createOrder({ payload: req.body, user: req.user });
  res.status(201).json({ success: true, data: order, message: 'Order placed successfully' });
});

export const previewOrder = asyncHandler(async (req, res) => {
  const { summary } = await calculateCart({
    items: req.body.items,
    currency: req.body.currency || 'MAD',
    couponCode: req.body.couponCode,
    shippingZoneId: req.body.shippingZone,
  });
  res.json({ success: true, data: summary });
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const [docs, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order not found');
  const allowed = req.admin
    || (req.user && order.user && order.user.equals(req.user._id))
    || (!order.user && req.query.email && order.guestEmail === req.query.email);
  if (!allowed) throw forbidden('You do not have access to this order');
  const payments = await PaymentTransaction.find({ order: order._id }).lean();
  res.json({ success: true, data: { ...order.toObject(), payments } });
});

export const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.number.toUpperCase() });
  if (!order) throw notFound('Order not found');
  res.json({ success: true, data: {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({ title: i.title, quantity: i.quantity, coverImage: i.coverImage })),
    statusLog: order.statusLog,
  } });
});

/* ----------------------------- Admin orders --------------------------- */

export const adminListOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  for (const key of ['status', 'paymentStatus', 'paymentMethod']) {
    if (req.query[key]) filter[key] = req.query[key];
  }
  if (req.query.q) {
    filter.$or = [
      { orderNumber: { $regex: req.query.q, $options: 'i' } },
      { 'customer.email': { $regex: req.query.q, $options: 'i' } },
      { 'customer.phone': { $regex: req.query.q, $options: 'i' } },
    ];
  }
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }
  const [docs, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email').lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const adminUpdateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order not found');
  const { status, paymentStatus, note } = req.body;
  const updated = await updateOrderStatus(order, status || order.status, {
    note,
    paymentStatus,
    changedBy: req.admin.name,
  });
  res.json({ success: true, data: updated });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw notFound('Order not found');
  if (['Delivered', 'Cancelled', 'Refunded'].includes(order.status)) {
    throw badRequest('This order can no longer be cancelled');
  }
  const updated = await updateOrderStatus(order, 'Cancelled', {
    note: req.body.reason || 'Cancelled by administrator',
    changedBy: req.admin.name,
  });
  res.json({ success: true, data: updated });
});

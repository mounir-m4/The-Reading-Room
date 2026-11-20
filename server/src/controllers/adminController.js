import { Order } from '../models/Order.js';
import { Book } from '../models/Book.js';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';
import { Role } from '../models/Role.js';
import { Review } from '../models/Review.js';
import { Author } from '../models/Author.js';
import { Category } from '../models/Category.js';
import { Coupon } from '../models/Coupon.js';
import { Notification, AuditLog, InventoryMovement, PaymentTransaction, ShippingZone } from '../models/Operations.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { notFound, badRequest } from '../utils/apiError.js';
import { PERMISSIONS } from '../models/Role.js';

function dateFilter(period, from, to) {
  if (from || to) {
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    return range;
  }
  const days = { today: 1, '7d': 7, '30d': 30, '90d': 90, year: 365 }[period] || 30;
  const start = new Date();
  if (period === 'today') start.setHours(0, 0, 0, 0);
  else start.setDate(start.getDate() - days);
  return { $gte: start };
}

export const dashboard = asyncHandler(async (req, res) => {
  const range = dateFilter(req.query.period, req.query.from, req.query.to);
  const paid = { paymentStatus: { $in: ['Paid', 'Partially Refunded'] }, createdAt: range };

  const [
    revenue, ordersCount, customers, booksCount, pending, completed, lowStock, outOfStock,
    statusBreakdown, paymentBreakdown, topBooks, topAuthors, topCategories, customerGrowth,
  ] = await Promise.all([
    Order.aggregate([{ $match: paid }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.countDocuments({ createdAt: range }),
    User.countDocuments({ createdAt: range }),
    Book.countDocuments(),
    Order.countDocuments({ status: 'Pending' }),
    Order.countDocuments({ status: 'Delivered' }),
    Book.countDocuments({ $expr: { $and: [{ $lte: ['$stock', '$lowStockThreshold'] }, { $gt: ['$stock', 0] }] } }),
    Book.countDocuments({ stock: 0 }),
    Order.aggregate([{ $match: { createdAt: range } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { createdAt: range } }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$total' } } }]),
    Order.aggregate([
      { $match: { createdAt: range, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.book', title: { $first: '$items.title' }, qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' }, cover: { $first: '$items.coverImage' } } },
      { $sort: { qty: -1 } }, { $limit: 8 },
    ]),
    Order.aggregate([
      { $match: { createdAt: range, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.authorName', revenue: { $sum: '$items.lineTotal' }, qty: { $sum: '$items.quantity' } } },
      { $sort: { revenue: -1 } }, { $limit: 6 },
    ]),
    Order.aggregate([
      { $match: { createdAt: range, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $lookup: { from: 'books', localField: 'items.book', foreignField: '_id', as: 'b' } },
      { $unwind: { path: '$b', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$b.categories', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'categories', localField: 'b.categories', foreignField: '_id', as: 'c' } },
      { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$c.name.en', revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { revenue: -1 } }, { $limit: 6 },
    ]),
    User.aggregate([
      { $match: { createdAt: range } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const revenueOverTime = await Order.aggregate([
    { $match: paid },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    success: true,
    data: {
      stats: {
        revenue: revenue[0]?.total || 0,
        orders: ordersCount,
        customers,
        books: booksCount,
        pendingOrders: pending,
        completedOrders: completed,
        lowStock,
        outOfStock,
      },
      revenueOverTime: revenueOverTime.map((r) => ({ date: r._id, revenue: r.revenue, orders: r.orders })),
      ordersByStatus: statusBreakdown.map((s) => ({ name: s._id, value: s.count })),
      payments: paymentBreakdown.map((p) => ({ name: p._id, count: p.count, revenue: p.revenue })),
      topBooks,
      topAuthors,
      topCategories,
      customerGrowth,
    },
  });
});

export const listCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.q) {
    filter.$or = [
      { name: { $regex: req.query.q, $options: 'i' } },
      { email: { $regex: req.query.q, $options: 'i' } },
    ];
  }
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  const [docs, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const enriched = await Promise.all(docs.map(async (user) => {
    const [orders, spend] = await Promise.all([
      Order.countDocuments({ user: user._id }),
      Order.aggregate([{ $match: { user: user._id, paymentStatus: 'Paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    ]);
    return { ...user, orderCount: orders, lifetimeSpending: spend[0]?.total || 0 };
  }));
  res.json({ success: true, data: enriched, meta: paginationMeta(page, limit, total) });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound('Customer not found');
  const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(20);
  const reviews = await Review.find({ user: user._id }).populate('book', 'title slug');
  res.json({ success: true, data: { user, orders, reviews } });
});

export const toggleCustomer = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw notFound('Customer not found');
  user.isActive = req.body.isActive ?? !user.isActive;
  await user.save();
  res.json({ success: true, data: user });
});

export const listAdmins = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await Admin.find().populate('role', 'name slug permissions').select('-password') });
});

export const createAdmin = asyncHandler(async (req, res) => {
  if (await Admin.exists({ email: req.body.email })) throw badRequest('Email already in use');
  const admin = await Admin.create(req.body);
  await admin.populate('role');
  res.status(201).json({ success: true, data: { ...admin.toObject(), password: undefined } });
});

export const updateAdmin = asyncHandler(async (req, res) => {
  if (req.body.password === '') delete req.body.password;
  const admin = await Admin.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .select('-password').populate('role');
  if (!admin) throw notFound('Admin not found');
  res.json({ success: true, data: admin });
});

export const deleteAdmin = asyncHandler(async (req, res) => {
  await Admin.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Admin deleted' });
});

export const listRoles = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await Role.find() });
});

export const updateRole = asyncHandler(async (req, res) => {
  const role = await Role.findByIdAndUpdate(req.params.id, { permissions: req.body.permissions }, { new: true });
  if (!role) throw notFound('Role not found');
  res.json({ success: true, data: role });
});

export const listAudit = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.q) {
    const regex = { $regex: String(req.query.q), $options: 'i' };
    filter.$or = ['actorName', 'action', 'module', 'targetId', 'ip'].map((field) => ({ [field]: regex }));
  }
  if (req.query.module) filter.module = req.query.module;
  if (req.query.action) filter.action = req.query.action;
  const [docs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const listNotifications = asyncHandler(async (req, res) => {
  const docs = await Notification.find({ $or: [{ recipient: null }, { recipient: req.admin._id }] })
    .sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: docs });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id }, { isRead: true });
  res.json({ success: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});

export const report = asyncHandler(async (req, res) => {
  const range = dateFilter(req.query.period, req.query.from, req.query.to);
  const type = req.query.type || 'sales';
  let data = [];
  let totals = {};

  if (type === 'inventory') {
    data = await Book.find().select('title stock lowStockThreshold price').sort({ stock: 1 }).lean();
    totals = { books: data.length, outOfStock: data.filter((b) => b.stock === 0).length };
  } else if (type === 'customers') {
    data = await User.find({ createdAt: range }).select('name email createdAt').sort({ createdAt: -1 }).lean();
    totals = { newCustomers: data.length };
  } else if (type === 'coupons') {
    data = await Coupon.find().lean();
    totals = { totalUsed: data.reduce((s, c) => s + c.usedCount, 0) };
  } else {
    data = await Order.find({ createdAt: range }).sort({ createdAt: -1 })
      .select('orderNumber createdAt customer total subtotal discount shipping tax status paymentStatus paymentMethod').lean();
    totals = {
      revenue: data.reduce((s, o) => s + (o.paymentStatus === 'Paid' ? o.total : 0), 0),
      orders: data.length,
      averageOrder: data.length ? Math.round(data.reduce((s, o) => s + o.total, 0) / data.length) : 0,
    };
  }
  res.json({ success: true, data, meta: totals });
});

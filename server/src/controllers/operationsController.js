import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { Coupon } from '../models/Coupon.js';
import { ShippingZone } from '../models/Operations.js';
import { InventoryMovement, PaymentTransaction } from '../models/Operations.js';
import { Book } from '../models/Book.js';
import { Order } from '../models/Order.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { notFound, badRequest } from '../utils/apiError.js';
import { applyMovement, setStock, lowStock } from '../services/inventoryService.js';
import { audit } from '../utils/audit.js';
import { fromMinor } from '../utils/money.js';

/* ------------------------------- Coupons ------------------------------ */

export const listCoupons = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = req.admin ? {} : { isActive: true, expiresAt: { $gt: new Date() } };
  const conditions = [];
  if (req.query.q) {
    const regex = { $regex: String(req.query.q), $options: 'i' };
    conditions.push({ $or: [{ code: regex }, { 'description.en': regex }, { 'description.fr': regex }, { 'description.ar': regex }] });
  }
  if (req.admin && req.query.status) {
    const now = new Date();
    if (req.query.status === 'active') {
      filter.isActive = true;
      conditions.push({ startsAt: { $lte: now } });
      conditions.push({ $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }] });
    }
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.status === 'expired') filter.expiresAt = { $lte: now };
    if (req.query.status === 'scheduled') filter.startsAt = { $gt: now };
  }
  if (conditions.length) filter.$and = conditions;
  const [docs, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOne({ code: String(req.body.code).toUpperCase(), isActive: true });
  if (!coupon) throw notFound('Invalid coupon');
  const now = new Date();
  if (coupon.startsAt > now || (coupon.expiresAt && coupon.expiresAt < now)) throw badRequest('Coupon expired');
  res.json({ success: true, data: coupon });
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body);
  await audit(req, 'create', 'coupons', coupon._id);
  res.status(201).json({ success: true, data: coupon });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!coupon) throw notFound('Coupon not found');
  await audit(req, 'update', 'coupons', coupon._id);
  res.json({ success: true, data: coupon });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  await audit(req, 'delete', 'coupons', req.params.id);
  res.json({ success: true, message: 'Coupon deleted' });
});

/* ------------------------------ Inventory ----------------------------- */

export const inventoryList = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.q) filter['title.en'] = { $regex: req.query.q, $options: 'i' };
  if (req.query.low === 'true') filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
  const [docs, total] = await Promise.all([
    Book.find(filter).select('title slug stock lowStockThreshold coverImage soldCount').sort({ stock: 1 }).skip(skip).limit(limit).lean(),
    Book.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const inventoryMovements = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = req.query.book ? { book: req.query.book } : {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.search) {
    const regex = { $regex: String(req.query.search), $options: 'i' };
    const books = await Book.find({
      $or: [{ 'title.en': regex }, { 'title.fr': regex }, { 'title.ar': regex }, { slug: regex }],
    }).select('_id').lean();
    filter.$and = [{
      $or: [
        { reason: regex },
        { reference: regex },
        { book: { $in: books.map((b) => b._id) } },
      ],
    }];
  }
  const [docs, total] = await Promise.all([
    InventoryMovement.find(filter).populate('book', 'title slug').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    InventoryMovement.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const adjustStock = asyncHandler(async (req, res) => {
  const { book, quantity, type = 'adjustment', reason } = req.body;
  const updated = type === 'set'
    ? await setStock(book, Number(quantity), req.admin._id, reason)
    : await applyMovement({ bookId: book, quantity: Number(quantity), type, reason, performedBy: req.admin._id });
  await audit(req, 'adjust', 'inventory', book, { quantity, type, reason });
  res.json({ success: true, data: updated });
});

export const lowStockAlert = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await lowStock() });
});

/* ------------------------------- Shipping ----------------------------- */

export const listShippingZones = asyncHandler(async (req, res) => {
  const filter = req.admin ? {} : { isActive: true };
  res.json({ success: true, data: await ShippingZone.find(filter).sort({ order: 1 }) });
});

export const createShippingZone = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await ShippingZone.create(req.body) });
});

export const updateShippingZone = asyncHandler(async (req, res) => {
  const doc = await ShippingZone.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!doc) throw notFound('Shipping zone not found');
  res.json({ success: true, data: doc });
});

export const deleteShippingZone = asyncHandler(async (req, res) => {
  await ShippingZone.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Shipping zone deleted' });
});

/* ------------------------------- Payments ----------------------------- */

export const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = req.query.status ? { status: req.query.status } : {};
  const [docs, total] = await Promise.all([
    PaymentTransaction.find(filter).populate('order', 'orderNumber total').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PaymentTransaction.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const refundPayment = asyncHandler(async (req, res) => {
  const transaction = await PaymentTransaction.findById(req.params.id);
  if (!transaction) throw notFound('Transaction not found');
  transaction.status = 'refunded';
  await transaction.save();
  await Order.updateOne({ _id: transaction.order }, { paymentStatus: 'Refunded', status: 'Refunded' });
  await audit(req, 'refund', 'payments', transaction._id, { amount: transaction.amount });
  res.json({ success: true, data: transaction });
});

/* ------------------------------- Exports ------------------------------ */

export function exportXlsx(req, res) {
  const rows = req.body.rows || [];
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Report');
  const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
  res.send(buffer);
}

export function exportCsv(req, res) {
  const rows = req.body.rows || [];
  if (!rows.length) return res.status(400).send('No data');
  const header = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const csv = [header.map(escape).join(','), ...rows.map((r) => header.map((h) => escape(r[h])).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
  res.send('\uFEFF' + csv);
}

export function exportPdf(req, res) {
  const rows = req.body.rows || [];
  const title = req.body.title || 'Report';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(20).fillColor('#783D45').text(title);
  doc.moveDown().fontSize(9).fillColor('#242424');
  const cols = rows.length ? Object.keys(rows[0]) : [];
  for (const row of rows.slice(0, 500)) {
    doc.text(cols.map((c) => `${c}: ${row[c] ?? ''}`).join('   |   '));
    doc.moveDown(0.4);
  }
  doc.end();
}

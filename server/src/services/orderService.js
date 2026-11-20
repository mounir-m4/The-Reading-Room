import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { Author } from '../models/Author.js';
import { Order } from '../models/Order.js';
import { Coupon } from '../models/Coupon.js';
import { PaymentTransaction } from '../models/Operations.js';
import { ShippingZone } from '../models/Operations.js';
import { StoreSetting } from '../models/Operations.js';
import { Notification } from '../models/Operations.js';
import { Cart } from '../models/Cart.js';
import { applyMovement } from './inventoryService.js';
import { convertFromBase } from './fxService.js';
import { sendTemplate } from './mailService.js';
import { badRequest, conflict, notFound } from '../utils/apiError.js';
import { fromMinor } from '../utils/money.js';

async function setting(key, fallback) {
  const doc = await StoreSetting.findOne({ key }).lean();
  return doc?.value ?? fallback;
}

export async function calculateCart({ items, currency = 'MAD', couponCode = '', shippingZoneId = null }) {
  const books = await Book.find({ _id: { $in: items.map((i) => i.book) }, isPublished: true })
    .populate('author')
    .lean();
  if (books.length !== items.length) throw badRequest('One or more books are unavailable');

  const byId = new Map(books.map((b) => [b._id.toString(), b]));
  let subtotal = 0;
  let discount = 0;

  for (const item of items) {
    const book = byId.get(item.book.toString());
    if (!book) throw badRequest('Book unavailable');
    if (book.stock < item.quantity) throw conflict(`Not enough stock for "${book.title?.en}"`);
    subtotal += book.price * item.quantity;
  }

  let couponDoc = null;
  if (couponCode) {
    couponDoc = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!couponDoc) throw badRequest('Invalid coupon');
    const now = new Date();
    if (couponDoc.startsAt > now || (couponDoc.expiresAt && couponDoc.expiresAt < now)) {
      throw badRequest('Coupon has expired or is not active yet');
    }
    if (couponDoc.usageLimit && couponDoc.usedCount >= couponDoc.usageLimit) {
      throw badRequest('Coupon usage limit reached');
    }
    if (couponDoc.minPurchase && subtotal < couponDoc.minPurchase) {
      throw badRequest(`Minimum purchase of ${fromMinor(couponDoc.minPurchase)} MAD required`);
    }
    if (couponDoc.users?.length) {
      // Restricted coupons are checked by the caller passing userId.
    }
    discount = couponDoc.type === 'percent'
      ? Math.round(subtotal * (couponDoc.value / 100))
      : couponDoc.value;
    if (couponDoc.maxDiscount) discount = Math.min(discount, couponDoc.maxDiscount);
    discount = Math.min(discount, subtotal);
  }

  const taxable = subtotal - discount;
  let shipping = 0;
  let shippingLabel = 'Standard delivery';
  if (shippingZoneId) {
    const zone = await ShippingZone.findById(shippingZoneId).lean();
    if (!zone || !zone.isActive) throw badRequest('Invalid shipping method');
    shippingLabel = zone.name?.en || 'Delivery';
    shipping = zone.freeShippingThreshold && taxable >= zone.freeShippingThreshold ? 0 : zone.price;
  } else {
    shipping = await setting('shipping.defaultPrice', 0);
  }

  const taxRate = await setting('tax.rate', 0);
  const tax = Math.round(taxable * (Number(taxRate) / 100));
  const total = Math.max(0, taxable + shipping + tax);

  const { rate } = await convertFromBase(0, currency);
  const display = (amount) => Math.round(amount * rate);
  const exchangeRate = rate || 1;

  return {
    books,
    couponDoc,
    summary: {
      subtotal,
      discount,
      shipping,
      shippingLabel,
      tax,
      total,
      currency,
      exchangeRate,
      displaySubtotal: display(subtotal),
      displayDiscount: display(discount),
      displayShipping: display(shipping),
      displayTax: display(tax),
      displayTotal: display(total),
    },
  };
}

function makeOrderNumber() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `BK-${date}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Server-authoritative order creation. Client prices are never accepted.
 */
export async function createOrder({ payload, user = null }) {
  const items = payload.items?.map((i) => ({ book: i.book, quantity: Number(i.quantity) }));
  if (!items?.length) throw badRequest('Cart is empty');
  if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1)) {
    throw badRequest('Invalid quantities');
  }

  const currency = payload.currency || user?.currency || 'MAD';
  const { books, couponDoc, summary } = await calculateCart({
    items,
    currency,
    couponCode: payload.couponCode,
    shippingZoneId: payload.shippingZone,
  });

  if (couponDoc?.users?.length && (!user || !couponDoc.users.some((id) => id.equals(user._id)))) {
    throw badRequest('Coupon is restricted to other customers');
  }

  const byId = new Map(books.map((b) => [b._id.toString(), b]));
  const rate = summary.exchangeRate;
  const display = (amount) => Math.round(amount * rate);

  const snapshots = items.map((item) => {
    const book = byId.get(item.book.toString());
    const unit = book.price;
    return {
      book: book._id,
      title: book.title,
      authorName: book.author?.name || '',
      slug: book.slug,
      coverImage: book.coverImage,
      isbn: book.isbn,
      quantity: item.quantity,
      unitPrice: unit,
      unitDisplayPrice: display(unit),
      lineTotal: unit * item.quantity,
      lineDisplayTotal: display(unit * item.quantity),
    };
  });

  // Atomic stock reservation with compensation if a later item fails.
  const reserved = [];
  try {
    for (const snapshot of snapshots) {
      await applyMovement({
        bookId: snapshot.book,
        quantity: -snapshot.quantity,
        type: 'sale',
        reason: 'Order reservation',
        reference: 'pending-order',
      });
      reserved.push(snapshot);
    }
  } catch (error) {
    for (const done of reserved) {
      await applyMovement({
        bookId: done.book,
        quantity: done.quantity,
        type: 'return',
        reason: 'Rollback after failed reservation',
      });
    }
    throw error;
  }

  const order = await Order.create({
    orderNumber: makeOrderNumber(),
    user: user?._id || undefined,
    guestEmail: user ? undefined : payload.customer?.email,
    customer: payload.customer,
    items: snapshots,
    shippingAddress: payload.shippingAddress,
    shippingMethod: payload.shippingZone || undefined,
    shippingLabel: summary.shippingLabel,
    status: payload.paymentMethod === 'cod' ? 'Confirmed' : 'Pending',
    paymentStatus: payload.paymentMethod === 'cod' ? 'Pending' : 'Pending',
    paymentMethod: payload.paymentMethod || 'cod',
    currency,
    exchangeRate: rate,
    subtotal: summary.subtotal,
    shipping: summary.shipping,
    tax: summary.tax,
    discount: summary.discount,
    total: summary.total,
    displaySubtotal: summary.displaySubtotal,
    displayShipping: summary.displayShipping,
    displayTax: summary.displayTax,
    displayDiscount: summary.displayDiscount,
    displayTotal: summary.displayTotal,
    coupon: couponDoc ? { code: couponDoc.code, amount: summary.discount } : undefined,
    notes: payload.notes,
    statusLog: [{ status: 'Pending', note: 'Order placed', at: new Date() }],
  });

  await PaymentTransaction.create({
    order: order._id,
    provider: payload.paymentMethod || 'cod',
    amount: summary.total,
    currency: 'MAD',
    status: 'pending',
  });

  if (couponDoc) {
    couponDoc.usedCount += 1;
    await couponDoc.save();
  }

  for (const book of books) {
    await Book.updateOne({ _id: book._id }, { $inc: { soldCount: 1 } });
  }

  await Notification.create({
    type: 'new_order',
    title: 'New order',
    message: `${order.orderNumber} — ${fromMinor(order.total)} MAD`,
    link: `/admin/orders/${order._id}`,
    severity: 'info',
  });

  if (user) {
    await sendTemplate(user.email, 'orderConfirmation', {
      name: user.name,
      orderNumber: order.orderNumber,
      total: `${fromMinor(order.displayTotal)} ${currency}`,
      store: await setting('store.name', 'The Reading Room'),
    }, user.language);
  } else if (payload.customer?.email) {
    await sendTemplate(payload.customer.email, 'orderConfirmation', {
      name: payload.customer.firstName || 'Reader',
      orderNumber: order.orderNumber,
      total: `${fromMinor(order.displayTotal)} ${currency}`,
      store: await setting('store.name', 'The Reading Room'),
    }, payload.language || 'en');
  }

  if (payload.cartId) {
    await Cart.deleteOne({ _id: payload.cartId });
  }

  return order;
}

export async function updateOrderStatus(order, status, { note = '', changedBy = 'admin', paymentStatus } = {}) {
  const previous = order.status;
  order.pushStatus(status, note, changedBy);
  if (paymentStatus) order.paymentStatus = paymentStatus;

  if (['Cancelled', 'Refunded'].includes(status) && !['Cancelled', 'Refunded'].includes(previous)) {
    for (const item of order.items) {
      await applyMovement({
        bookId: item.book,
        quantity: item.quantity,
        type: 'return',
        reason: `Order ${status.toLowerCase()} — ${order.orderNumber}`,
        reference: order.orderNumber,
      });
      await Book.updateOne({ _id: item.book }, { $inc: { soldCount: -item.quantity } });
    }
  }

  if (status === 'Delivered' && order.paymentMethod === 'cod') {
    order.paymentStatus = 'Paid';
    await PaymentTransaction.updateMany(
      { order: order._id, status: 'pending' },
      { status: 'succeeded' },
    );
  }

  await order.save();
  await Notification.create({
    type: 'order_status',
    title: `Order ${order.orderNumber}`,
    message: `Status changed from ${previous} to ${status}`,
    link: `/admin/orders/${order._id}`,
  });
  return order;
}

export async function getOrderAccess(order, req) {
  if (req.admin) return true;
  if (req.user && order.user && order.user.equals(req.user._id)) return true;
  if (!order.user && req.body?.email && order.guestEmail === req.body.email) return true;
  return false;
}

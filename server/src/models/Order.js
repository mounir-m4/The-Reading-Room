import mongoose from 'mongoose';
import { localized } from './plugins.js';

const snapshotItemSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    title: { type: localized(), default: () => ({}) },
    authorName: String,
    slug: String,
    coverImage: String,
    isbn: String,
    quantity: Number,
    // Immutable per-unit values captured at purchase time.
    unitPrice: Number,
    unitDisplayPrice: Number,
    lineTotal: Number,
    lineDisplayTotal: Number,
  },
  { _id: false },
);

const statusLogSchema = new mongoose.Schema(
  { status: String, note: String, changedBy: String, at: { type: Date, default: Date.now } },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    guestEmail: String,
    customer: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
    },
    items: [snapshotItemSchema],
    shippingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      region: String,
      postalCode: String,
      country: String,
    },
    shippingMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'ShippingZone' },
    shippingLabel: String,
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
      default: 'Pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'],
      default: 'Pending',
      index: true,
    },
    paymentMethod: { type: String, enum: ['stripe', 'cod', 'mock'], default: 'cod' },
    paymentIntentId: String,
    currency: { type: String, default: 'MAD' },
    exchangeRate: { type: Number, default: 1 },
    subtotal: Number,
    shipping: Number,
    tax: Number,
    discount: Number,
    total: Number,
    displaySubtotal: Number,
    displayShipping: Number,
    displayTax: Number,
    displayDiscount: Number,
    displayTotal: Number,
    coupon: { code: String, amount: Number },
    notes: String,
    statusLog: [statusLogSchema],
    refundedAmount: { type: Number, default: 0 },
    invoiceNumber: String,
  },
  { timestamps: true },
);

orderSchema.methods.pushStatus = function pushStatus(status, note = '', changedBy = 'system') {
  this.status = status;
  this.statusLog.push({ status, note, changedBy });
};

orderSchema.index({ createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.set('toJSON', { virtuals: true, versionKey: false });
export const Order = mongoose.model('Order', orderSchema);

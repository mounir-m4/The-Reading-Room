import mongoose from 'mongoose';
import { localized } from './plugins.js';

const shippingZoneSchema = new mongoose.Schema(
  {
    name: { type: localized(), required: true },
    countries: [String],
    cities: [String],
    price: { type: Number, required: true, default: 0 }, // minor MAD
    freeShippingThreshold: { type: Number, default: 0 },
    estimatedDaysMin: { type: Number, default: 2 },
    estimatedDaysMax: { type: Number, default: 5 },
    codAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const movementSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    type: { type: String, enum: ['purchase', 'sale', 'return', 'adjustment', 'damage'], required: true },
    quantity: { type: Number, required: true },
    previousStock: Number,
    newStock: Number,
    reason: String,
    reference: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    provider: { type: String, enum: ['stripe', 'cod', 'mock'], required: true },
    providerTransactionId: String,
    amount: Number,
    currency: String,
    status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], default: 'pending' },
    failureReason: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const notificationSchema = new mongoose.Schema(
  {
    type: String,
    title: String,
    message: String,
    link: String,
    severity: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    isRead: { type: Boolean, default: false, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

const auditSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    actorName: String,
    action: String,
    module: String,
    targetId: String,
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: String,
  },
  { timestamps: true },
);

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

const exchangeRateSchema = new mongoose.Schema(
  {
    base: { type: String, default: 'MAD' },
    rates: { type: Map, of: Number, required: true },
    provider: String,
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

movementSchema.index({ createdAt: -1 });
paymentSchema.index({ createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
auditSchema.index({ createdAt: -1 });
exchangeRateSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 86400 });

export const ShippingZone = mongoose.model('ShippingZone', shippingZoneSchema);
export const InventoryMovement = mongoose.model('InventoryMovement', movementSchema);
export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const AuditLog = mongoose.model('AuditLog', auditSchema);
export const StoreSetting = mongoose.model('StoreSetting', settingsSchema);
export const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

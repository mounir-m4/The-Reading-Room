import mongoose from 'mongoose';
import { localized } from './plugins.js';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: localized(), default: () => ({}) },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minPurchase: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },
    startsAt: { type: Date, default: Date.now },
    expiresAt: Date,
    usageLimit: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Coupon = mongoose.model('Coupon', couponSchema);

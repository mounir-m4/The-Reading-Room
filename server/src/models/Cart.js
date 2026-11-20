import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    sessionId: { type: String, index: true, sparse: true },
    items: [
      {
        book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
        quantity: { type: Number, required: true, min: 1, default: 1 },
      },
    ],
    coupon: String,
    currency: { type: String, default: 'MAD' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 3600 * 1000) },
  },
  { timestamps: true },
);

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Cart = mongoose.model('Cart', cartSchema);

import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins.js';

const reviewSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: String,
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    isReported: { type: Boolean, default: false },
    adminResponse: String,
    helpful: { type: Number, default: 0 },
  },
  { timestamps: true },
);

reviewSchema.index({ book: 1, user: 1 }, { unique: true });
toJSONPlugin(reviewSchema);
export const Review = mongoose.model('Review', reviewSchema);

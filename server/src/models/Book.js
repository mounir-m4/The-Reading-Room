import mongoose from 'mongoose';
import { localized, toJSONPlugin } from './plugins.js';
import { slugify } from '../utils/slugify.js';

const bookSchema = new mongoose.Schema(
  {
    title: { type: localized(), required: true },
    subtitle: { type: localized(), default: () => ({}) },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    isbn: { type: String, trim: true, index: true, sparse: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author', required: true, index: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true }],
    publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'Publisher' },
    publicationDate: Date,
    pages: Number,
    language: { type: String, enum: ['en', 'fr', 'ar', 'other'], default: 'en', index: true },
    description: { type: localized(), default: () => ({}) },
    coverImage: { type: String, default: '' },
    images: [String],
    // All prices are integer minor units of the base currency (MAD).
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    featured: { type: Boolean, default: false, index: true },
    bestSeller: { type: Boolean, default: false, index: true },
    newArrival: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0, index: true },
    tags: [String],
    seo: {
      title: { type: localized(), default: () => ({}) },
      description: { type: localized(), default: () => ({}) },
    },
  },
  { timestamps: true },
);

bookSchema.pre('validate', function makeSlug(next) {
  if (!this.slug && this.title?.en) this.slug = slugify(this.title.en);
  next();
});

bookSchema.pre('save', function syncDiscount(next) {
  if (this.compareAtPrice > this.price && this.compareAtPrice > 0) {
    this.discountPercent = Math.round((1 - this.price / this.compareAtPrice) * 100);
  } else {
    this.discountPercent = 0;
  }
  next();
});

// `price` is the customer-facing sale price. `compareAtPrice` only drives the
// savings badge, so the effective chargeable price must never discount it again.
bookSchema.virtual('effectivePrice').get(function effectivePrice() {
  return this.price;
});

bookSchema.index({ 'title.en': 'text', 'title.fr': 'text', 'title.ar': 'text', isbn: 'text' }, {
  weights: { 'title.en': 5, 'title.fr': 5, 'title.ar': 5, isbn: 3 },
  name: 'book_text_search',
});
bookSchema.index({ price: 1, ratingAverage: -1 });
bookSchema.index({ createdAt: -1 });
toJSONPlugin(bookSchema);

export const Book = mongoose.model('Book', bookSchema);

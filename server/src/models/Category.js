import mongoose from 'mongoose';
import { localized, toJSONPlugin } from './plugins.js';
import { slugify } from '../utils/slugify.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: localized(), required: true },
    description: { type: localized(), default: () => ({}) },
    slug: { type: String, required: true, unique: true, lowercase: true },
    image: String,
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    position: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    seo: {
      title: { type: localized(), default: () => ({}) },
      description: { type: localized(), default: () => ({}) },
    },
  },
  { timestamps: true },
);

categorySchema.pre('validate', function makeSlug(next) {
  if (!this.slug && this.name?.en) this.slug = slugify(this.name.en);
  next();
});
categorySchema.index({ parent: 1, position: 1 });
toJSONPlugin(categorySchema);

export const Category = mongoose.model('Category', categorySchema);

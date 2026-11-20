import mongoose from 'mongoose';
import { localized, toJSONPlugin } from './plugins.js';
import { slugify } from '../utils/slugify.js';

const authorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    photo: String,
    biography: { type: localized(), default: () => ({}) },
    birthDate: Date,
    nationality: String,
    isActive: { type: Boolean, default: true },
    seo: {
      title: { type: localized(), default: () => ({}) },
      description: { type: localized(), default: () => ({}) },
    },
  },
  { timestamps: true },
);

authorSchema.pre('validate', function makeSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});
authorSchema.index({ name: 'text' });
toJSONPlugin(authorSchema);

export const Author = mongoose.model('Author', authorSchema);

import mongoose from 'mongoose';
import { toJSONPlugin } from './plugins.js';
import { slugify } from '../utils/slugify.js';

const publisherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: String,
    contactEmail: String,
    phone: String,
    website: String,
    address: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

publisherSchema.pre('validate', function makeSlug(next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});
toJSONPlugin(publisherSchema);

export const Publisher = mongoose.model('Publisher', publisherSchema);

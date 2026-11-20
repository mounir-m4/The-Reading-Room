import mongoose from 'mongoose';
import { localized, toJSONPlugin } from './plugins.js';

const bannerSchema = new mongoose.Schema(
  {
    title: { type: localized(), required: true },
    subtitle: { type: localized(), default: () => ({}) },
    image: String,
    link: String,
    ctaLabel: { type: localized(), default: () => ({}) },
    position: { type: String, enum: ['hero', 'home-top', 'home-mid', 'home-bottom', 'sidebar'], default: 'home-mid' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const testimonialSchema = new mongoose.Schema(
  {
    name: String,
    role: String,
    avatar: String,
    quote: { type: localized(), required: true },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const cmsPageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: localized(), required: true },
    body: { type: localized(), required: true },
    metaDescription: { type: localized(), default: () => ({}) },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const homepageSectionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ['featured', 'bestSellers', 'newArrivals', 'categories', 'authors', 'trending', 'recommended', 'offers', 'banners', 'testimonials', 'newsletter', 'recentlyViewed'],
    },
    title: { type: localized(), default: () => ({}) },
    subtitle: { type: localized(), default: () => ({}) },
    isVisible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const newsletterSchema = new mongoose.Schema(
  { email: { type: String, required: true, unique: true, lowercase: true }, language: { type: String, default: 'en' }, isActive: { type: Boolean, default: true } },
  { timestamps: true },
);

for (const schema of [bannerSchema, testimonialSchema, cmsPageSchema, homepageSectionSchema, newsletterSchema]) {
  toJSONPlugin(schema);
}

export const Banner = mongoose.model('Banner', bannerSchema);
export const Testimonial = mongoose.model('Testimonial', testimonialSchema);
export const CMSPage = mongoose.model('CMSPage', cmsPageSchema);
export const HomepageSection = mongoose.model('HomepageSection', homepageSectionSchema);
export const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSchema);

import { z } from 'zod';

// Routes import both schemas and the middleware from this module.
export { validate } from '../middleware/validate.js';

const localized = z.object({
  en: z.string().default(''),
  fr: z.string().default(''),
  ar: z.string().default(''),
}).partial();

export const email = z.string().email().max(255);
export const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email,
  password,
  phone: z.string().max(30).optional(),
  language: z.enum(['en', 'fr', 'ar']).optional(),
  currency: z.enum(['MAD', 'EUR', 'USD', 'GBP']).optional(),
});

export const loginSchema = z.object({ email, password });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token: z.string().min(10), password });
export const verifySchema = z.object({ token: z.string().min(4) });

export const bookSchema = z.object({
  title: localized.refine((v) => v.en?.trim() || v.fr?.trim() || v.ar?.trim(), 'At least one title is required'),
  slug: z.string().max(200).optional().or(z.literal('')),
  subtitle: localized.optional(),
  isbn: z.string().max(20).optional().or(z.literal('')),
  author: objectId,
  categories: z.array(objectId).default([]),
  publisher: objectId.optional().or(z.literal('')).or(z.null()),
  publicationDate: z.string().optional().or(z.null()),
  pages: z.coerce.number().int().positive().optional().or(z.literal('')),
  language: z.enum(['en', 'fr', 'ar', 'other']).default('en'),
  description: localized.optional(),
  coverImage: z.string().optional(),
  images: z.array(z.string()).default([]),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().default(0),
  stock: z.coerce.number().int().nonnegative().default(0),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(5),
  featured: z.boolean().default(false),
  bestSeller: z.boolean().default(false),
  newArrival: z.boolean().default(false),
  trending: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  seo: z.object({ title: localized.optional(), description: localized.optional() }).optional(),
});

export const categorySchema = z.object({
  name: localized,
  description: localized.optional(),
  image: z.string().optional(),
  parent: objectId.optional().or(z.literal('')).or(z.null()),
  position: z.coerce.number().default(0),
  isActive: z.boolean().default(true),
  seo: z.object({ title: localized.optional(), description: localized.optional() }).optional(),
  slug: z.string().optional(),
});

export const authorSchema = z.object({
  name: z.string().min(2),
  photo: z.string().optional(),
  biography: localized.optional(),
  birthDate: z.string().optional().or(z.null()),
  nationality: z.string().optional(),
  isActive: z.boolean().default(true),
  seo: z.object({ title: localized.optional(), description: localized.optional() }).optional(),
});

export const publisherSchema = z.object({
  name: z.string().min(2),
  logo: z.string().optional(),
  contactEmail: email.optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  comment: z.string().min(5).max(2000),
});

export const addressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(2),
  phone: z.string().min(5),
  addressLine1: z.string().min(3),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Morocco'),
  isDefault: z.boolean().optional(),
});

export const couponSchema = z.object({
  code: z.string().min(2).max(30).transform((v) => v.toUpperCase()),
  description: localized.optional(),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().positive(),
  minPurchase: z.coerce.number().nonnegative().default(0),
  maxDiscount: z.coerce.number().nonnegative().default(0),
  startsAt: z.string().optional().or(z.null()),
  expiresAt: z.string().optional().or(z.null()),
  usageLimit: z.coerce.number().int().nonnegative().default(0),
  perUserLimit: z.coerce.number().int().nonnegative().default(1),
  users: z.array(objectId).default([]),
  books: z.array(objectId).default([]),
  categories: z.array(objectId).default([]),
  isActive: z.boolean().default(true),
});

export const checkoutSchema = z.object({
  items: z.array(z.object({ book: objectId, quantity: z.coerce.number().int().positive().max(50) })).min(1),
  customer: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email,
    phone: z.string().min(5),
  }),
  shippingAddress: addressSchema,
  shippingZone: objectId.optional().or(z.literal('')).or(z.null()),
  paymentMethod: z.enum(['stripe', 'cod', 'mock']).default('cod'),
  currency: z.enum(['MAD', 'EUR', 'USD', 'GBP']).default('MAD'),
  couponCode: z.string().optional(),
  notes: z.string().max(1000).optional(),
  cartId: objectId.optional(),
  language: z.enum(['en', 'fr', 'ar']).optional(),
});

export const cartItemSchema = z.object({
  book: objectId,
  quantity: z.coerce.number().int().positive().max(50),
});

export const cmsPageSchema = z.object({
  key: z.string().min(2),
  title: localized,
  body: localized,
  metaDescription: localized.optional(),
  isActive: z.boolean().default(true),
});

export const shippingZoneSchema = z.object({
  name: localized,
  countries: z.array(z.string()).default([]),
  cities: z.array(z.string()).default([]),
  price: z.coerce.number().nonnegative().default(0),
  freeShippingThreshold: z.coerce.number().nonnegative().default(0),
  estimatedDaysMin: z.coerce.number().int().positive().default(2),
  estimatedDaysMax: z.coerce.number().int().positive().default(5),
  codAvailable: z.boolean().default(true),
  isActive: z.boolean().default(true),
  order: z.coerce.number().default(0),
});

export const adminSchema = z.object({
  name: z.string().min(2),
  email,
  password: password.optional(),
  role: objectId,
  isActive: z.boolean().default(true),
  language: z.enum(['en', 'fr', 'ar']).default('en'),
});

import { Banner, Testimonial, CMSPage, HomepageSection, NewsletterSubscriber } from '../models/Content.js';
import { Book } from '../models/Book.js';
import { Category } from '../models/Category.js';
import { Author } from '../models/Author.js';
import { StoreSetting } from '../models/Operations.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound, conflict } from '../utils/apiError.js';
import { decorateBooks } from './catalogController.js';
import { sendTemplate } from '../services/mailService.js';

const DEFAULT_SECTIONS = [
  'featured', 'bestSellers', 'newArrivals', 'categories', 'authors', 'trending',
  'recommended', 'offers', 'banners', 'testimonials', 'newsletter', 'recentlyViewed',
];

export const getHomepage = asyncHandler(async (req, res) => {
  const lang = req.query.lang || 'en';
  const currency = req.query.currency || 'MAD';
  let sections = await HomepageSection.find().sort({ order: 1 }).lean();
  if (!sections.length) {
    await HomepageSection.insertMany(DEFAULT_SECTIONS.map((key, i) => ({ key, order: i })));
    sections = await HomepageSection.find().sort({ order: 1 }).lean();
  }

  const [banners, testimonials, featured, bestSellers, newArrivals, trending, offers, recommended, categories, authors] = await Promise.all([
    Banner.find({ isActive: true }).sort({ order: 1 }).lean(),
    Testimonial.find({ isActive: true }).sort({ order: 1 }).lean(),
    Book.find({ featured: true, isPublished: true }).limit(8).populate('author', 'name').lean(),
    Book.find({ bestSeller: true, isPublished: true }).limit(8).populate('author', 'name').lean(),
    Book.find({ newArrival: true, isPublished: true }).sort({ createdAt: -1 }).limit(8).populate('author', 'name').lean(),
    Book.find({ trending: true, isPublished: true }).limit(8).populate('author', 'name').lean(),
    Book.find({ discountPercent: { $gt: 0 }, isPublished: true }).limit(8).populate('author', 'name').lean(),
    Book.find({ isPublished: true }).sort({ ratingAverage: -1, soldCount: -1 }).limit(8).populate('author', 'name').lean(),
    Category.find({ isActive: true }).sort({ position: 1 }).limit(12).lean(),
    Author.find({ isActive: true }).sort({ name: 1 }).limit(8).lean(),
  ]);

  const localize = (doc, keys) => {
    const out = { ...doc };
    for (const key of keys) {
      if (doc[key] && typeof doc[key] === 'object' && (lang in doc[key] || 'en' in doc[key])) {
        out[key] = doc[key][lang] || doc[key].en || Object.values(doc[key])[0] || '';
      }
    }
    return out;
  };

  res.json({
    success: true,
    data: {
      sections: sections.map((s) => localize(s, ['title', 'subtitle'])),
      banners: banners.map((b) => localize(b, ['title', 'subtitle', 'ctaLabel'])),
      testimonials: testimonials.map((t) => localize(t, ['quote'])),
      featured: await decorateBooks(featured, currency),
      bestSellers: await decorateBooks(bestSellers, currency),
      newArrivals: await decorateBooks(newArrivals, currency),
      trending: await decorateBooks(trending, currency),
      recommended: await decorateBooks(recommended, currency),
      offers: await decorateBooks(offers, currency),
      categories,
      authors,
      recentlyViewed: [],
    },
  });
});

export const getSections = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await HomepageSection.find().sort({ order: 1 }) });
});

export const updateSections = asyncHandler(async (req, res) => {
  const sections = req.body.sections;
  if (!Array.isArray(sections)) throw notFound('Sections array required');
  for (const section of sections) {
    await HomepageSection.findOneAndUpdate(
      { key: section.key },
      { $set: section, $setOnInsert: { key: section.key } },
      { upsert: true, new: true },
    );
  }
  res.json({ success: true, message: 'Homepage sections updated' });
});

export const listPages = asyncHandler(async (req, res) => {
  const filter = req.admin ? {} : { isActive: true };
  res.json({ success: true, data: await CMSPage.find(filter) });
});

export const getPage = asyncHandler(async (req, res) => {
  const page = await CMSPage.findOne({ key: req.params.key, ...(req.admin ? {} : { isActive: true }) });
  if (!page) throw notFound('Page not found');
  res.json({ success: true, data: page });
});

export const upsertPage = asyncHandler(async (req, res) => {
  const page = await CMSPage.findOneAndUpdate({ key: req.body.key }, req.body, { upsert: true, new: true, runValidators: true });
  res.json({ success: true, data: page });
});

export const deletePage = asyncHandler(async (req, res) => {
  await CMSPage.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Page deleted' });
});

/* Banners & testimonials — simple generic CRUD */
const generic = (Model) => ({
  list: asyncHandler(async (_req, res) => res.json({ success: true, data: await Model.find().sort({ order: 1 }) })),
  create: asyncHandler(async (req, res) => {
    const data = { ...req.body };
    if (req.uploadedFiles?.length) data.image = req.uploadedFiles[0].url;
    res.status(201).json({ success: true, data: await Model.create(data) });
  }),
  update: asyncHandler(async (req, res) => {
    const data = { ...req.body };
    if (req.uploadedFiles?.length) data.image = req.uploadedFiles[0].url;
    const doc = await Model.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!doc) throw notFound('Item not found');
    res.json({ success: true, data: doc });
  }),
  remove: asyncHandler(async (req, res) => {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  }),
});

export const bannerHandlers = generic(Banner);
export const testimonialHandlers = generic(Testimonial);

export const subscribe = asyncHandler(async (req, res) => {
  const { email, language = 'en' } = req.body;
  try {
    await NewsletterSubscriber.create({ email, language });
  } catch (error) {
    if (error.code !== 11000) throw error;
    throw conflict('You are already subscribed');
  }
  await sendTemplate(email, 'newsletter', { store: 'The Reading Room' }, language);
  res.status(201).json({ success: true, message: 'Subscribed successfully' });
});

export const listSubscribers = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await NewsletterSubscriber.find().sort({ createdAt: -1 }) });
});

/* ------------------------------ Settings ------------------------------ */

const DEFAULT_SETTINGS = {
  'store.name': 'The Reading Room',
  'store.description': 'A world of stories, knowledge and inspiration.',
  'store.email': 'hello@thereadingroom.test',
  'store.phone': '+212 600 000 000',
  'store.address': '123 Library Street, Casablanca, Morocco',
  'store.logo': '',
  'store.favicon': '',
  'store.defaultLanguage': 'en',
  'store.supportedLanguages': ['en', 'fr', 'ar'],
  'store.defaultCurrency': 'MAD',
  'store.supportedCurrencies': ['MAD', 'EUR', 'USD', 'GBP'],
  'tax.rate': 0,
  'shipping.defaultPrice': 3000,
  'payment.stripeEnabled': false,
  'payment.codEnabled': true,
  'maintenance.enabled': false,
  'social.instagram': '',
  'social.facebook': '',
  'seo.defaultTitle': 'The Reading Room — Discover Your Next Great Read',
  'seo.defaultDescription': 'Explore a world of stories, knowledge and inspiration.',
};

export const getSettings = asyncHandler(async (req, res) => {
  const docs = await StoreSetting.find().lean();
  const values = Object.fromEntries(docs.map((d) => [d.key, d.value]));
  res.json({ success: true, data: { ...DEFAULT_SETTINGS, ...values } });
});

export const updateSettings = asyncHandler(async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await StoreSetting.findOneAndUpdate({ key }, { value }, { upsert: true });
  }
  res.json({ success: true, message: 'Settings saved' });
});

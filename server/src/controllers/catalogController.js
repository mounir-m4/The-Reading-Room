import mongoose from 'mongoose';
import { Book } from '../models/Book.js';
import { Category } from '../models/Category.js';
import { Author } from '../models/Author.js';
import { Publisher } from '../models/Publisher.js';
import { Review } from '../models/Review.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/apiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import { getRates } from '../services/fxService.js';

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  priceAsc: { price: 1 },
  priceDesc: { price: -1 },
  bestSellers: { soldCount: -1 },
  popular: { views: -1 },
  rating: { ratingAverage: -1 },
  title: { 'title.en': 1 },
};

// Mongoose casts `$or: [{ _id: slug }]` even when the slug branch matches,
// so only include the ObjectId branch for values that can be cast.
const slugOrId = (value) => (mongoose.isValidObjectId(value)
  ? { $or: [{ slug: value }, { _id: value }] }
  : { slug: value });

export async function decorateBooks(docs, currency = 'MAD') {
  let rate = 1;
  if (currency !== 'MAD') {
    const rates = await getRates();
    rate = rates[currency] || 1;
  }
  return docs.map((book) => {
    const obj = typeof book.toObject === 'function' ? book.toObject() : { ...book };
    const effective = obj.price;
    obj.displayPrice = Math.round(effective * rate);
    obj.displayCompareAtPrice = obj.compareAtPrice ? Math.round(obj.compareAtPrice * rate) : null;
    obj.displayCurrency = currency;
    obj.exchangeRate = rate;
    return obj;
  });
}

export const listBooks = asyncHandler(async (req, res) => {
  const {
    q, category, categories, author, authors, publisher, language, minPrice, maxPrice,
    rating, inStock, discounted, sort = 'newest', currency = 'MAD', ids, fields,
  } = req.query;
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { isPublished: true };

  if (ids) filter._id = { $in: String(ids).split(',') };
  if (category) filter.categories = String(category).split(',');
  if (categories) filter.categories = String(categories).split(',');
  if (author) filter.author = String(author).split(',');
  if (authors) filter.author = String(authors).split(',');
  if (publisher) filter.publisher = publisher;
  if (language) filter.language = String(language).split(',');
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (rating) filter.ratingAverage = { $gte: Number(rating) };
  if (inStock === 'true') filter.stock = { $gt: 0 };
  if (discounted === 'true') filter.discountPercent = { $gt: 0 };

  let query;
  if (q) {
    query = Book.find({ ...filter, $text: { $search: String(q) } }, { score: { $meta: 'textScore' } })
      .sort(sort === 'relevance' ? { score: { $meta: 'textScore' } } : SORTS[sort] || SORTS.newest);
  } else {
    query = Book.find(filter).sort(SORTS[sort] || SORTS.newest);
  }

  query.populate('author', 'name slug photo').populate('categories', 'name slug');
  if (fields) query.select(String(fields).split(',').join(' '));
  const [docs, total] = await Promise.all([
    query.skip(skip).limit(limit).lean(),
    Book.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: await decorateBooks(docs, currency),
    meta: paginationMeta(page, limit, q ? Math.min(total, docs.length + skip) : total),
  });
});

export const getBook = asyncHandler(async (req, res) => {
  const book = await Book.findOne(slugOrId(req.params.slug))
    .populate('author')
    .populate('categories')
    .populate('publisher');
  if (!book || (!book.isPublished && !req.admin)) throw notFound('Book not found');

  await Book.updateOne({ _id: book._id }, { $inc: { views: 1 } });
  const reviews = await Review.find({ book: book._id, status: 'approved' })
    .sort({ createdAt: -1 }).limit(10).lean();
  const related = await Book.find({
    _id: { $ne: book._id },
    $or: [{ categories: { $in: book.categories.map((c) => c._id) } }, { author: book.author._id }],
    isPublished: true,
  }).limit(8).populate('author', 'name slug').lean();

  const data = (await decorateBooks([book], req.query.currency || 'MAD'))[0];
  res.json({ success: true, data: { ...data, reviews, related: await decorateBooks(related, req.query.currency || 'MAD') } });
});

export const searchBooks = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ success: true, data: [] });

  const [books, authors, categories] = await Promise.all([
    Book.find({ isPublished: true, $text: { $search: q } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } }).limit(8).select('title slug coverImage price discountPercent author').populate('author', 'name').lean(),
    Author.find({ $text: { $search: q } }).limit(4).select('name slug photo').lean(),
    Category.find({ isActive: true, $text: { $search: q } }).limit(4).select('name slug').lean(),
  ]);
  res.json({ success: true, data: { books: await decorateBooks(books, req.query.currency || 'MAD'), authors, categories } });
});

export const adminListBooks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.q) {
    filter.$or = [
      { 'title.en': { $regex: req.query.q, $options: 'i' } },
      { 'title.fr': { $regex: req.query.q, $options: 'i' } },
      { 'title.ar': { $regex: req.query.q, $options: 'i' } },
      { isbn: { $regex: req.query.q, $options: 'i' } },
    ];
  }
  for (const key of ['author', 'publisher', 'language', 'isPublished', 'featured']) {
    if (req.query[key] !== undefined) filter[key] = req.query[key];
  }
  if (req.query.category) filter.categories = req.query.category;
  if (req.query.lowStock === 'true') filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };

  const sort = { [req.query.sortBy || 'createdAt']: req.query.sortDir === 'asc' ? 1 : -1 };
  const [docs, total] = await Promise.all([
    Book.find(filter).populate('author', 'name').populate('categories', 'name').sort(sort).skip(skip).limit(limit).lean(),
    Book.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const getBookById = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id).populate('author').populate('categories').populate('publisher');
  if (!book) throw notFound('Book not found');
  res.json({ success: true, data: book });
});

export const createBook = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.publisher === '' || data.publisher === 'null') delete data.publisher;
  if (data.isbn === '') delete data.isbn;
  if (data.images?.length) data.images = data.images.map((v) => (typeof v === 'string' ? v : v.url));
  if (req.uploadedFiles?.length) {
    data.coverImage ||= req.uploadedFiles[0].url;
    data.images = [...(data.images || []), ...req.uploadedFiles.map((f) => f.url)];
  }
  const book = await Book.create(data);
  res.status(201).json({ success: true, data: book });
});

export const updateBook = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (data.publisher === '' || data.publisher === 'null') data.publisher = undefined;
  if (data.isbn === '') data.isbn = undefined;
  if (req.uploadedFiles?.length) {
    data.images = [...(data.images || []), ...req.uploadedFiles.map((f) => f.url)];
  }
  const book = await Book.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!book) throw notFound('Book not found');
  res.json({ success: true, data: book });
});

export const deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) throw notFound('Book not found');
  res.json({ success: true, message: 'Book deleted' });
});

export const bulkBookAction = asyncHandler(async (req, res) => {
  const { ids, action, value } = req.body;
  if (!Array.isArray(ids) || !ids.length) throw notFound('No books selected');
  const updates = {
    publish: { isPublished: true },
    unpublish: { isPublished: false },
    feature: { featured: true },
    unfeature: { featured: false },
    delete: null,
    setStock: { stock: Number(value) || 0 },
  };
  if (!updates[action]) throw notFound('Unknown action');
  if (action === 'delete') await Book.deleteMany({ _id: { $in: ids } });
  else await Book.updateMany({ _id: { $in: ids } }, updates[action]);
  res.json({ success: true, message: `${ids.length} books updated` });
});

/* ---------------------------- Categories ---------------------------- */

export const listCategories = asyncHandler(async (req, res) => {
  const filter = req.admin ? {} : { isActive: true };
  const docs = await Category.find(filter).sort({ position: 1 }).lean();
  res.json({ success: true, data: docs });
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne(slugOrId(req.params.slug));
  if (!category) throw notFound('Category not found');
  const books = await Book.find({ categories: category._id, isPublished: true }).populate('author', 'name').lean();
  res.json({ success: true, data: { category, books: await decorateBooks(books, req.query.currency || 'MAD') } });
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.uploadedFiles?.length) data.image = req.uploadedFiles[0].url;
  res.status(201).json({ success: true, data: await Category.create(data) });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.uploadedFiles?.length) data.image = req.uploadedFiles[0].url;
  const doc = await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!doc) throw notFound('Category not found');
  res.json({ success: true, data: doc });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  await Book.updateMany({ categories: req.params.id }, { $pull: { categories: req.params.id } });
  res.json({ success: true, message: 'Category deleted' });
});

/* ------------------------------ Authors ------------------------------ */

export const listAuthors = asyncHandler(async (req, res) => {
  const docs = await Author.find(req.admin ? {} : { isActive: true }).sort({ name: 1 }).lean();
  res.json({ success: true, data: docs });
});

export const getAuthor = asyncHandler(async (req, res) => {
  const author = await Author.findOne(slugOrId(req.params.slug));
  if (!author) throw notFound('Author not found');
  const books = await Book.find({ author: author._id, isPublished: true }).lean();
  res.json({ success: true, data: { author, books: await decorateBooks(books, req.query.currency || 'MAD') } });
});

export const createAuthor = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.uploadedFiles?.length) data.photo = req.uploadedFiles[0].url;
  res.status(201).json({ success: true, data: await Author.create(data) });
});

export const updateAuthor = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if (req.uploadedFiles?.length) data.photo = req.uploadedFiles[0].url;
  const doc = await Author.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!doc) throw notFound('Author not found');
  res.json({ success: true, data: doc });
});

export const deleteAuthor = asyncHandler(async (req, res) => {
  await Author.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Author deleted' });
});

/* ----------------------------- Publishers ---------------------------- */

export const listPublishers = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await Publisher.find({}).sort({ name: 1 }).lean() });
});

export const createPublisher = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await Publisher.create(req.body) });
});

export const updatePublisher = asyncHandler(async (req, res) => {
  const doc = await Publisher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!doc) throw notFound('Publisher not found');
  res.json({ success: true, data: doc });
});

export const deletePublisher = asyncHandler(async (req, res) => {
  await Publisher.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Publisher deleted' });
});

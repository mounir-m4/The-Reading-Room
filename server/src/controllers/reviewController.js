import { Review } from '../models/Review.js';
import { Book } from '../models/Book.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../utils/apiError.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';

async function recalcRating(bookId) {
  const stats = await Review.aggregate([
    { $match: { book: bookId, status: 'approved' } },
    { $group: { _id: '$book', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Book.updateOne(
    { _id: bookId },
    { ratingAverage: stats[0]?.avg ? Math.round(stats[0].avg * 10) / 10 : 0, ratingCount: stats[0]?.count || 0 },
  );
}

export const createReview = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.body.book || req.params.bookId);
  if (!book) throw notFound('Book not found');
  const existing = await Review.findOne({ book: book._id, user: req.user._id });
  if (existing) throw badRequest('You already reviewed this book');

  const review = await Review.create({
    book: book._id,
    user: req.user._id,
    userName: req.user.name,
    ...req.body,
    status: 'pending',
  });
  res.status(201).json({ success: true, data: review, message: 'Review submitted for approval' });
});

export const listBookReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { book: req.params.bookId, status: 'approved' };
  const [docs, total] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const listMyReviews = asyncHandler(async (req, res) => {
  const docs = await Review.find({ user: req.user._id }).populate('book', 'title slug coverImage').sort({ createdAt: -1 });
  res.json({ success: true, data: docs });
});

export const adminListReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.book) filter.book = req.query.book;
  if (req.query.reported === 'true') filter.isReported = true;
  if (req.query.q) {
    const regex = { $regex: String(req.query.q), $options: 'i' };
    const books = await Book.find({
      $or: [{ 'title.en': regex }, { 'title.fr': regex }, { 'title.ar': regex }],
    }).select('_id').lean();
    filter.$or = [
      { title: regex },
      { comment: regex },
      { userName: regex },
      { book: { $in: books.map((b) => b._id) } },
    ];
  }
  const [docs, total] = await Promise.all([
    Review.find(filter).populate('book', 'title slug').populate('user', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, data: docs, meta: paginationMeta(page, limit, total) });
});

export const moderateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw notFound('Review not found');
  if (req.body.status) review.status = req.body.status;
  if (req.body.adminResponse !== undefined) review.adminResponse = req.body.adminResponse;
  if (req.body.isReported !== undefined) review.isReported = req.body.isReported;
  await review.save();
  await recalcRating(review.book);
  res.json({ success: true, data: review });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw notFound('Review not found');
  await recalcRating(review.book);
  res.json({ success: true, message: 'Review deleted' });
});

export const markHelpful = asyncHandler(async (req, res) => {
  await Review.updateOne({ _id: req.params.id }, { $inc: { helpful: 1 } });
  res.json({ success: true, message: 'Thanks for your feedback' });
});

import { Book } from '../models/Book.js';
import { InventoryMovement } from '../models/Operations.js';
import { conflict, notFound } from '../utils/apiError.js';

/**
 * Atomically changes stock only when enough units exist. Returns the updated book.
 * Every change is recorded as an immutable movement.
 */
export async function applyMovement({ bookId, quantity, type, reason = '', reference = '', performedBy = null, allowNegative = false }) {
  if (!Number.isInteger(quantity) || quantity === 0) throw conflict('Quantity must be a non-zero integer');

  const book = await Book.findById(bookId);
  if (!book) throw notFound('Book not found');

  const condition = allowNegative || quantity > 0
    ? { _id: bookId }
    : { _id: bookId, stock: { $gte: Math.abs(quantity) } };

  const updated = await Book.findOneAndUpdate(
    condition,
    { $inc: { stock: quantity } },
    { new: true, runValidators: true },
  );
  if (!updated) throw conflict(`Insufficient stock for "${book.title?.en || bookId}"`);

  await InventoryMovement.create({
    book: bookId,
    type,
    quantity,
    previousStock: book.stock,
    newStock: updated.stock,
    reason,
    reference,
    performedBy,
  });

  return updated;
}

export async function setStock(bookId, newStock, performedBy, reason = 'Manual stock set') {
  const book = await Book.findById(bookId);
  if (!book) throw notFound('Book not found');
  const delta = newStock - book.stock;
  if (delta === 0) return book;
  return applyMovement({ bookId, quantity: delta, type: 'adjustment', reason, performedBy });
}

export async function lowStock(limit = 20) {
  return Book.find({ $expr: { $lte: ['$stock', '$lowStockThreshold'] }, isPublished: true })
    .select('title slug stock lowStockThreshold coverImage')
    .limit(limit)
    .lean();
}

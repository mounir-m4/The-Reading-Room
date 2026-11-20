import { Cart } from '../models/Cart.js';
import { Book } from '../models/Book.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/apiError.js';
import { getRates } from '../services/fxService.js';
import { calculateCart } from '../services/orderService.js';

function cartKey(req) {
  return req.user ? { user: req.user._id } : { sessionId: req.headers['x-session-id'] || 'anonymous' };
}

async function getOrCreate(key) {
  return (await Cart.findOne(key)) || (await Cart.create({ ...key, items: [] }));
}

async function decorate(cart, currency) {
  const items = await Book.find({ _id: { $in: cart.items.map((i) => i.book) } })
    .populate('author', 'name slug')
    .lean();
  const map = new Map(items.map((b) => [b._id.toString(), b]));
  let rates = { [currency]: 1 };
  if (currency !== 'MAD') rates = await getRates();
  const rate = rates[currency] || 1;

  const lines = cart.items
    .filter((line) => map.has(line.book.toString()))
    .map((line) => {
      const book = map.get(line.book.toString());
      const effective = book.price;
      return {
        book: { ...book, displayPrice: Math.round(effective * rate), displayCurrency: currency },
        quantity: line.quantity,
        lineTotal: effective * line.quantity,
        displayLineTotal: Math.round(effective * line.quantity * rate),
        available: book.stock >= line.quantity,
        maxQuantity: book.stock,
      };
    });

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  return {
    id: cart._id,
    items: lines,
    currency,
    exchangeRate: rate,
    subtotal,
    displaySubtotal: Math.round(subtotal * rate),
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    coupon: cart.coupon,
  };
}

export const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreate(cartKey(req));
  res.json({ success: true, data: await decorate(cart, req.query.currency || cart.currency || 'MAD') });
});

export const addToCart = asyncHandler(async (req, res) => {
  const { book, quantity = 1 } = req.body;
  const product = await Book.findById(book);
  if (!product || !product.isPublished) throw notFound('Book not found');
  if (product.stock < quantity) throw badRequest('Requested quantity is not available');

  const cart = await getOrCreate(cartKey(req));
  const line = cart.items.find((i) => i.book.toString() === book);
  if (line) line.quantity = Math.min(product.stock, line.quantity + quantity);
  else cart.items.push({ book, quantity });
  await cart.save();
  res.json({ success: true, data: await decorate(cart, cart.currency || 'MAD') });
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity < 0) throw badRequest('Invalid quantity');
  const cart = await getOrCreate(cartKey(req));
  const line = cart.items.find((i) => i.book.toString() === req.params.bookId);
  if (!line) throw notFound('Cart item not found');
  if (quantity === 0) cart.items.pull(line._id);
  else line.quantity = quantity;
  await cart.save();
  res.json({ success: true, data: await decorate(cart, cart.currency || 'MAD') });
});

export const removeCartItem = asyncHandler(async (req, res) => {
  const cart = await getOrCreate(cartKey(req));
  cart.items = cart.items.filter((i) => i.book.toString() !== req.params.bookId);
  await cart.save();
  res.json({ success: true, data: await decorate(cart, cart.currency || 'MAD') });
});

export const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreate(cartKey(req));
  cart.items = [];
  cart.coupon = undefined;
  await cart.save();
  res.json({ success: true, data: await decorate(cart, cart.currency || 'MAD') });
});

export const applyCoupon = asyncHandler(async (req, res) => {
  const cart = await getOrCreate(cartKey(req));
  if (!cart.items.length) throw badRequest('Cart is empty');
  const result = await calculateCart({ items: cart.items, currency: cart.currency || 'MAD', couponCode: req.body.code });
  cart.coupon = req.body.code.toUpperCase();
  await cart.save();
  res.json({ success: true, data: { code: cart.coupon, summary: result.summary } });
});

export const mergeGuestCart = asyncHandler(async (req, res) => {
  const sessionId = req.headers['x-session-id'] || req.body.sessionId;
  if (!sessionId) return res.json({ success: true, message: 'Nothing to merge' });
  const guest = await Cart.findOne({ sessionId });
  if (!guest?.items.length) return res.json({ success: true, message: 'Nothing to merge' });

  const cart = await getOrCreate({ user: req.user._id });
  for (const item of guest.items) {
    const existing = cart.items.find((i) => i.book.toString() === item.book.toString());
    if (existing) existing.quantity += item.quantity;
    else cart.items.push(item);
  }
  await cart.save();
  await Cart.deleteOne({ _id: guest._id });
  await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: { $each: [] } } });
  res.json({ success: true, data: await decorate(cart, cart.currency || 'MAD') });
});

/* ------------------------------ Wishlist ----------------------------- */

export const getWishlist = asyncHandler(async (req, res) => {
  if (req.user) {
    const user = await User.findById(req.user._id).populate({ path: 'wishlist', populate: { path: 'author', select: 'name' } });
    const books = (user.wishlist || []).filter(Boolean);
    return res.json({ success: true, data: await decorate({ items: books.map((b) => ({ book: b._id })) }, 'MAD') });
  }
  const sessionId = req.headers['x-session-id'] || 'anonymous';
  const cart = await Cart.findOne({ sessionId });
  res.json({ success: true, data: await decorate({ items: (cart?.wishlist || []).map((id) => ({ book: id })) }, 'MAD') });
});

export const toggleWishlist = asyncHandler(async (req, res) => {
  const bookId = req.params.bookId || req.body.book;
  if (!(await Book.exists({ _id: bookId }))) throw notFound('Book not found');

  if (req.user) {
    const user = await User.findById(req.user._id);
    const index = user.wishlist.findIndex((id) => id.toString() === bookId);
    if (index >= 0) user.wishlist.splice(index, 1);
    else user.wishlist.push(bookId);
    await user.save();
    return res.json({ success: true, data: { items: user.wishlist.map(String), active: index < 0 } });
  }
  res.json({ success: true, data: { items: [], active: true, guest: true } });
});

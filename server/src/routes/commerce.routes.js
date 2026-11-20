import { Router } from 'express';
import * as cart from '../controllers/cartController.js';
import * as orders from '../controllers/orderController.js';
import * as reviews from '../controllers/reviewController.js';
import { protect, optionalAuth, adminOnly, authorize } from '../middleware/auth.js';
import { validate, checkoutSchema, cartItemSchema, reviewSchema } from '../validators/index.js';

const router = Router();

// Cart & wishlist
router.get('/cart', optionalAuth, cart.getCart);
router.post('/cart', optionalAuth, validate(cartItemSchema), cart.addToCart);
router.put('/cart/:bookId', optionalAuth, cart.updateCartItem);
router.delete('/cart/:bookId', optionalAuth, cart.removeCartItem);
router.delete('/cart', optionalAuth, cart.clearCart);
router.post('/cart/coupon', optionalAuth, cart.applyCoupon);
router.post('/cart/merge', protect, cart.mergeGuestCart);
router.get('/wishlist', optionalAuth, cart.getWishlist);
router.post('/wishlist/:bookId', optionalAuth, cart.toggleWishlist);
router.delete('/wishlist/:bookId', optionalAuth, cart.toggleWishlist);

// Checkout & orders
router.post('/orders/preview', optionalAuth, orders.previewOrder);
router.post('/orders', optionalAuth, orders.checkout);
router.get('/orders/mine', protect, orders.listMyOrders);
router.get('/orders/track/:number', orders.trackOrder);
router.get('/orders/:id', optionalAuth, orders.getOrder);
router.get('/admin/orders', protect, adminOnly, authorize('orders.view'), orders.adminListOrders);
router.put('/admin/orders/:id', protect, adminOnly, authorize('orders.manage'), orders.adminUpdateOrder);
router.post('/admin/orders/:id/cancel', protect, adminOnly, authorize('orders.manage'), orders.cancelOrder);

// Reviews
router.get('/reviews/book/:bookId', reviews.listBookReviews);
router.post('/reviews/:bookId', protect, validate(reviewSchema), reviews.createReview);
router.get('/reviews/mine', protect, reviews.listMyReviews);
router.post('/reviews/:id/helpful', reviews.markHelpful);
router.get('/admin/reviews', protect, adminOnly, authorize('reviews.manage'), reviews.adminListReviews);
router.put('/admin/reviews/:id', protect, adminOnly, authorize('reviews.manage'), reviews.moderateReview);
router.delete('/admin/reviews/:id', protect, adminOnly, authorize('reviews.manage'), reviews.deleteReview);

export default router;

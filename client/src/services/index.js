import api, { unwrap } from './api.js';

const get = (url, params) => api.get(url, { params }).then(unwrap);
const post = (url, data, config) => api.post(url, data, config).then(unwrap);
const put = (url, data, config) => api.put(url, data, config).then(unwrap);
const del = (url, config) => api.delete(url, config).then(unwrap);

export const authApi = {
  register: (data) => post('/auth/register', data),
  login: (data) => post('/auth/login', data),
  adminLogin: (data) => post('/auth/admin/login', data),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
  forgot: (email) => post('/auth/forgot-password', { email }),
  reset: (data) => post('/auth/reset-password', data),
  verify: (token) => post('/auth/verify-email', { token }),
  updateProfile: (data) => put('/auth/profile', data),
  changePassword: (data) => post('/auth/change-password', data),
};

export const catalogApi = {
  books: (params) => get('/books', params),
  book: (slug, params) => get(`/books/${slug}`, params),
  search: (q, params) => get('/books/search', { q, ...params }),
  categories: () => get('/categories'),
  category: (slug, params) => get(`/categories/${slug}`, params),
  authors: () => get('/authors'),
  author: (slug, params) => get(`/authors/${slug}`, params),
  publishers: () => get('/publishers'),
};

export const cartApi = {
  get: (currency) => get('/cart', { currency }),
  add: (book, quantity = 1) => post('/cart', { book, quantity }),
  update: (bookId, quantity) => put(`/cart/${bookId}`, { quantity }),
  remove: (bookId) => del(`/cart/${bookId}`),
  clear: () => del('/cart'),
  coupon: (code) => post('/cart/coupon', { code }),
  merge: (sessionId) => post('/cart/merge', { sessionId }),
  wishlist: () => get('/wishlist'),
  toggleWishlist: (bookId) => post(`/wishlist/${bookId}`),
};

export const orderApi = {
  preview: (data) => post('/orders/preview', data),
  create: (data) => post('/orders', data),
  mine: (params) => get('/orders/mine', params),
  get: (id, email) => get(`/orders/${id}`, email ? { email } : undefined),
  track: (number) => get(`/orders/track/${number}`),
};

export const reviewApi = {
  create: (bookId, data) => post(`/reviews/${bookId}`, data),
  list: (bookId) => get(`/reviews/book/${bookId}`),
  mine: () => get('/reviews/mine'),
};

export const cmsApi = {
  homepage: (params) => get('/cms/homepage', params),
  pages: () => get('/cms/pages'),
  page: (key) => get(`/cms/pages/${key}`),
  banners: () => get('/cms/banners'),
  testimonials: () => get('/cms/testimonials'),
  subscribe: (email, language) => post('/newsletter', { email, language }),
  shippingZones: () => get('/shipping/zones'),
  settings: () => get('/settings'),
  paymentConfig: () => get('/payments/config'),
};

export const paymentsApi = {
  stripeSession: (data) => post('/payments/checkout', data),
  mock: (orderId) => post('/payments/mock', { orderId }),
};

export const adminApi = {
  uploadImage: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/admin/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(unwrap);
  },

  dashboard: (params) => get('/admin/dashboard', params),
  report: (params) => get('/admin/reports', params),
  exportCsv: (rows) => post('/admin/export/csv', { rows }),
  exportXlsx: (rows) => post('/admin/export/xlsx', { rows }, { responseType: 'blob' }),
  exportPdf: (rows, title) => post('/admin/export/pdf', { rows, title }, { responseType: 'blob' }),

  books: (params) => get('/admin/books', params),
  book: (id) => get(`/admin/books/${id}`),
  createBook: (data) => post('/admin/books', data),
  updateBook: (id, data) => put(`/admin/books/${id}`, data),
  deleteBook: (id) => del(`/admin/books/${id}`),
  bulkBooks: (data) => post('/admin/books/bulk', data),

  createCategory: (data) => post('/admin/categories', data),
  updateCategory: (id, data) => put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => del(`/admin/categories/${id}`),
  createAuthor: (data) => post('/admin/authors', data),
  updateAuthor: (id, data) => put(`/admin/authors/${id}`, data),
  deleteAuthor: (id) => del(`/admin/authors/${id}`),
  createPublisher: (data) => post('/admin/publishers', data),
  updatePublisher: (id, data) => put(`/admin/publishers/${id}`, data),
  deletePublisher: (id) => del(`/admin/publishers/${id}`),

  orders: (params) => get('/admin/orders', params),
  updateOrder: (id, data) => put(`/admin/orders/${id}`, data),
  cancelOrder: (id, reason) => post(`/admin/orders/${id}/cancel`, { reason }),

  customers: (params) => get('/admin/customers', params),
  customer: (id) => get(`/admin/customers/${id}`),
  toggleCustomer: (id, isActive) => put(`/admin/customers/${id}`, { isActive }),

  inventory: (params) => get('/admin/inventory', params),
  movements: (params) => get('/admin/inventory/movements', params),
  lowStock: () => get('/admin/inventory/low-stock'),
  adjustStock: (data) => post('/admin/inventory/adjustments', data),

  reviews: (params) => get('/admin/reviews', params),
  moderateReview: (id, data) => put(`/admin/reviews/${id}`, data),
  deleteReview: (id) => del(`/admin/reviews/${id}`),

  coupons: (params) => get('/admin/coupons', params),
  createCoupon: (data) => post('/admin/coupons', data),
  updateCoupon: (id, data) => put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => del(`/admin/coupons/${id}`),

  sections: () => get('/admin/cms/sections'),
  updateSections: (sections) => put('/admin/cms/homepage', { sections }),
  pages: () => get('/admin/cms/pages'),
  savePage: (data) => post('/admin/cms/pages', data),
  deletePage: (id) => del(`/admin/cms/pages/${id}`),
  banners: () => get('/admin/cms/banners'),
  saveBanner: (data, id) => (id ? put(`/admin/cms/banners/${id}`, data) : post('/admin/cms/banners', data)),
  deleteBanner: (id) => del(`/admin/cms/banners/${id}`),
  testimonials: () => get('/admin/cms/testimonials'),
  saveTestimonial: (data, id) => (id ? put(`/admin/cms/testimonials/${id}`, data) : post('/admin/cms/testimonials', data)),
  deleteTestimonial: (id) => del(`/admin/cms/testimonials/${id}`),
  subscribers: () => get('/admin/newsletter'),

  zones: () => get('/admin/shipping/zones'),
  saveZone: (data, id) => (id ? put(`/admin/shipping/zones/${id}`, data) : post('/admin/shipping/zones', data)),
  deleteZone: (id) => del(`/admin/shipping/zones/${id}`),

  payments: (params) => get('/admin/payments', params),
  refund: (id) => post(`/admin/payments/${id}/refund`),

  admins: () => get('/admin/admins'),
  saveAdmin: (data, id) => (id ? put(`/admin/admins/${id}`, data) : post('/admin/admins', data)),
  deleteAdmin: (id) => del(`/admin/admins/${id}`),
  roles: () => get('/admin/roles'),
  updateRole: (id, permissions) => put(`/admin/roles/${id}`, { permissions }),
  audit: (params) => get('/admin/audit', params),

  notifications: () => get('/admin/notifications'),
  markRead: (id) => put(`/admin/notifications/${id}`),
  markAllRead: () => post('/admin/notifications/read-all'),

  settings: () => get('/settings'),
  saveSettings: (data) => put('/admin/settings', data),
};

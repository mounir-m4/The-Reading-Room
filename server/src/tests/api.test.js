import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import * as database from '../config/database.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Role, PERMISSIONS } from '../models/Role.js';
import { Admin } from '../models/Admin.js';
import { Author } from '../models/Author.js';
import { Category } from '../models/Category.js';
import { Book } from '../models/Book.js';
import { Coupon } from '../models/Coupon.js';

const app = createApp();
const originalVercel = process.env.VERCEL;
let adminToken;
let userToken;
let bookId;

beforeAll(async () => {
  await connectDatabase();
  const role = await Role.create({ name: 'Super Admin', slug: 'super-admin', permissions: PERMISSIONS });
  await Admin.create({ name: 'Test Admin', email: 'admin@test.dev', password: 'Admin@12345', role: role._id });

  const adminRes = await request(app).post('/api/auth/admin/login').send({ email: 'admin@test.dev', password: 'Admin@12345' });
  adminToken = adminRes.body.data.accessToken;

  const reg = await request(app).post('/api/auth/register').send({
    name: 'Test Reader', email: 'reader@test.dev', password: 'Reader@12345', language: 'en',
  });
  userToken = reg.body.data.accessToken;

  const author = await Author.create({ name: 'Test Author' });
  const category = await Category.create({ name: { en: 'Fiction' } });
  const book = await Book.create({
    title: { en: 'A Test Book' }, author: author._id, categories: [category._id],
    price: 10000, compareAtPrice: 12000, stock: 5, isPublished: true,
  });
  bookId = book._id.toString();

  await Coupon.create({ code: 'SAVE10', type: 'percent', value: 10, minPurchase: 0, maxDiscount: 0, isActive: true });
});

afterAll(async () => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  await disconnectDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

const getVercelHandler = async () => (await import('../../../api/index.js')).default;

describe('Vercel API hosting', () => {
  it('serves the health endpoint without connecting to MongoDB', async () => {
    process.env.VERCEL = '1';
    const vercelHandler = await getVercelHandler();
    const connectSpy = vi.spyOn(database, 'connectDatabase');
    const response = await request(vercelHandler).get('/api/index?__vercel_api_path=health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(connectSpy).not.toHaveBeenCalled();
  });

  it('connects to MongoDB before serving the catalogue', async () => {
    process.env.VERCEL = '1';
    const vercelHandler = await getVercelHandler();
    const connectSpy = vi.spyOn(database, 'connectDatabase');
    const response = await request(vercelHandler).get('/api/index?__vercel_api_path=books&currency=USD');

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(connectSpy).toHaveBeenCalledOnce();
  });
});

describe('Authentication', () => {
  it('registers, logs in and returns an access token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'reader@test.dev', password: 'Reader@12345' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects bad credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'reader@test.dev', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('protects admin endpoints', async () => {
    const res = await request(app).get('/api/admin/dashboard');
    expect(res.status).toBe(401);
    const forbidden = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);
  });
});

describe('Catalog', () => {
  it('lists published books with display prices', async () => {
    const res = await request(app).get('/api/books?currency=USD');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('displayPrice');
  });

  it('returns a book by slug', async () => {
    const res = await request(app).get(`/api/books/${bookId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title.en).toBe('A Test Book');
  });
});

describe('E-commerce', () => {
  it('adds to cart and computes totals server-side', async () => {
    await request(app)
      .post('/api/cart')
      .set('x-session-id', 'test-session')
      .send({ book: bookId, quantity: 2 });
    const res = await request(app).get('/api/cart').set('x-session-id', 'test-session');
    expect(res.status).toBe(200);
    expect(res.body.data.itemCount).toBe(2);
    expect(res.body.data.subtotal).toBe(20000);
  });

  it('places an order, applies a coupon and decrements stock atomically', async () => {
    const before = await Book.findById(bookId);
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [{ book: bookId, quantity: 1 }],
        customer: { firstName: 'Test', lastName: 'Reader', email: 'reader@test.dev', phone: '+212600000000' },
        shippingAddress: { fullName: 'Test Reader', phone: '+212600000000', addressLine1: '1 Test St', city: 'Casablanca', country: 'Morocco' },
        paymentMethod: 'cod', currency: 'MAD', couponCode: 'SAVE10',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(10000);
    expect(res.body.data.discount).toBe(1000);
    expect(res.body.data.items[0].unitPrice).toBe(10000);
    const after = await Book.findById(bookId);
    expect(after.stock).toBe(before.stock - 1);
  });

  it('rejects orders exceeding available stock', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [{ book: bookId, quantity: 999 }],
        customer: { firstName: 'Test', lastName: 'Reader', email: 'reader@test.dev', phone: '+212600000000' },
        shippingAddress: { fullName: 'Test Reader', phone: '+212600000000', addressLine1: '1 Test St', city: 'Casablanca', country: 'Morocco' },
        paymentMethod: 'cod',
      });
    expect([400, 409]).toContain(res.status);
  });
});

describe('Admin', () => {
  it('serves real dashboard analytics', async () => {
    const res = await request(app).get('/api/admin/dashboard?period=30d').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.stats).toHaveProperty('revenue');
    expect(res.body.data.stats.books).toBeGreaterThan(0);
  });

  it('creates a book through the admin API', async () => {
    const author = await Author.findOne();
    const res = await request(app)
      .post('/api/admin/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: { en: 'Admin Created Book' }, author: author._id.toString(), price: 5000, stock: 3 });
    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('admin-created-book');
  });
});

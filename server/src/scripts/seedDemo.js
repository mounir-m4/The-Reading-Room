import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { slugify } from '../utils/slugify.js';
import { Role, PERMISSIONS } from '../models/Role.js';
import { Admin } from '../models/Admin.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Author } from '../models/Author.js';
import { Publisher } from '../models/Publisher.js';
import { Book } from '../models/Book.js';
import { Order } from '../models/Order.js';
import { Review } from '../models/Review.js';
import { Cart } from '../models/Cart.js';
import { Coupon } from '../models/Coupon.js';
import {
  AuditLog,
  InventoryMovement,
  Notification,
  PaymentTransaction,
  ShippingZone,
  StoreSetting,
  ExchangeRate,
} from '../models/Operations.js';
import { Banner, CMSPage, HomepageSection, NewsletterSubscriber, Testimonial } from '../models/Content.js';
import { createDemoBookCover } from '../utils/demoBookCover.js';

const ROLES = [
  { name: 'Super Admin', slug: 'super-admin', permissions: PERMISSIONS },
  { name: 'Administrator', slug: 'administrator', permissions: PERMISSIONS.filter((p) => !p.startsWith('users.')) },
  { name: 'Content Manager', slug: 'content-manager', permissions: ['books.view', 'books.edit', 'categories.manage', 'authors.manage', 'cms.manage'] },
  { name: 'Order Manager', slug: 'order-manager', permissions: ['orders.view', 'orders.manage', 'orders.refund', 'customers.view'] },
  { name: 'Inventory Manager', slug: 'inventory-manager', permissions: ['books.view', 'inventory.view', 'inventory.manage'] },
  { name: 'Marketing Manager', slug: 'marketing-manager', permissions: ['coupons.manage', 'cms.manage', 'analytics.view', 'reports.export'] },
];

const EXTRA_CATEGORIES = [
  { en: 'Fantasy', fr: 'Fantastique', ar: 'الخيال' },
  { en: 'Mystery', fr: 'Polar', ar: 'الغموض' },
  { en: 'Romance', fr: 'Romance', ar: 'الرومانسية' },
  { en: 'Cooking', fr: 'Cuisine', ar: 'الطبخ' },
  { en: 'Travel', fr: 'Voyage', ar: 'السفر' },
  { en: 'Technology', fr: 'Technologie', ar: 'التكنولوجيا' },
  { en: 'Poetry', fr: 'Poésie', ar: 'الشعر' },
  { en: 'Biography', fr: 'Biographie', ar: 'السيرة الذاتية' },
];

const EXTRA_AUTHORS = [
  'Nancy Haddad', 'Amine Belkacem', 'Clara Moreau', 'Yasmin Rahmani',
  'Tomás Vega', 'Leila Ibnou', 'Hugo Marchand', 'Priya Shah',
  'Malik Diop', 'Sophie Laurent', 'Karim Nasser', 'Elena Rossi',
];

const EXTRA_PUBLISHERS = [
  { name: 'Atlas House', email: 'hello@atlashouse.test' },
  { name: 'Éditions Lumière', email: 'contact@lumiere.test' },
  { name: "Dar Al-Ma'rifa", email: 'info@daralmarifa.test' },
  { name: 'Northwind Press', email: 'press@northwind.test' },
  { name: 'Maple & Ink', email: 'hello@mapleink.test' },
  { name: 'Sahara Books', email: 'contact@saharabooks.test' },
  { name: 'Bluebird Editions', email: 'info@bluebird.test' },
  { name: 'Cedar House', email: 'press@cedarhouse.test' },
];

const EXTRA_BOOKS = [
  { title: { en: 'The Garden of Forgotten Letters', fr: 'Le Jardin des lettres oubliées', ar: 'حديقة الرسائل المنسية' }, author: 'Nancy Haddad', category: 'Fantasy', publisher: 'Atlas House', price: 14900, compare: 18500, stock: 27, year: 2019, tags: ['fantasy', 'bestseller'] },
  { title: { en: 'Atlas of Small Adventures', fr: 'Atlas des petites aventures', ar: 'أطلس المغامرات الصغيرة' }, author: 'Amine Belkacem', category: 'Travel', publisher: 'Sahara Books', price: 13500, compare: 0, stock: 4, year: 2021, tags: ['travel', 'new'] },
  { title: { en: 'The Last Lighthouse Keeper', fr: 'Le Dernier Gardien du phare', ar: 'حارس المنارة الأخير' }, author: 'Clara Moreau', category: 'Fiction', publisher: 'Éditions Lumière', price: 16500, compare: 19500, stock: 19, year: 2017, tags: ['fiction', 'literary'] },
  { title: { en: 'Algorithms of the Heart', fr: 'Les Algorithmes du cœur', ar: 'خوارزميات القلب' }, author: 'Yasmin Rahmani', category: 'Technology', publisher: 'Northwind Press', price: 19800, compare: 23000, stock: 11, year: 2023, tags: ['technology', 'new'] },
  { title: { en: 'A Table for Twelve', fr: 'Une table pour douze', ar: 'طاولة لاثني عشر' }, author: 'Tomás Vega', category: 'Cooking', publisher: 'Maple & Ink', price: 22000, compare: 25500, stock: 33, year: 2020, tags: ['cooking', 'gift'] },
  { title: { en: 'The Blue Hour', fr: 'L’Heure bleue', ar: 'الساعة الزرقاء' }, author: 'Sophie Laurent', category: 'Romance', publisher: 'Bluebird Editions', price: 11900, compare: 14900, stock: 22, year: 2018, tags: ['romance', 'bestseller'] },
  { title: { en: 'Shadows in Marrakech', fr: 'Ombres à Marrakech', ar: 'ظلال في مراكش' }, author: 'Karim Nasser', category: 'Mystery', publisher: "Dar Al-Ma'rifa", price: 14200, compare: 0, stock: 7, year: 2022, tags: ['mystery', 'new'] },
  { title: { en: 'The Quantum Library', fr: 'La Bibliothèque quantique', ar: 'المكتبة الكمية' }, author: 'Hugo Marchand', category: 'Science Fiction', publisher: 'Northwind Press', price: 17900, compare: 21000, stock: 15, year: 2024, tags: ['scifi', 'new'] },
  { title: { en: 'Poems for the Long Way Home', fr: 'Poèmes pour le long retour', ar: 'قصائد للطريق الطويل إلى البيت' }, author: 'Leila Ibnou', category: 'Poetry', publisher: 'Cedar House', price: 9500, compare: 12000, stock: 41, year: 2016, tags: ['poetry'] },
  { title: { en: "The Cartographer's Daughter", fr: 'La Fille du cartographe', ar: 'ابنة الجغرافي' }, author: 'Elena Rossi', category: 'History', publisher: 'Atlas House', price: 18900, compare: 0, stock: 2, year: 2015, tags: ['history'] },
  { title: { en: 'Quiet Leadership', fr: 'Le Leadership discret', ar: 'القيادة الهادئة' }, author: 'Priya Shah', category: 'Business', publisher: 'Maple & Ink', price: 17600, compare: 20500, stock: 18, year: 2021, tags: ['business', 'productivity'] },
  { title: { en: 'The Stars Above Us', fr: 'Les Étoiles au-dessus de nous', ar: 'النجوم فوقنا' }, author: 'Malik Diop', category: 'Science Fiction', publisher: 'Sahara Books', price: 15900, compare: 0, stock: 9, year: 2023, tags: ['scifi', 'new'] },
  { title: { en: 'Bread and Orange Blossom', fr: 'Pain et fleur d’oranger', ar: 'الخبز وزهر البرتقال' }, author: 'Nancy Haddad', category: 'Cooking', publisher: "Dar Al-Ma'rifa", price: 12800, compare: 15500, stock: 26, year: 2019, tags: ['cooking'] },
  { title: { en: 'The Silent Witness', fr: 'Le Témoin silencieux', ar: 'الشاهد الصامت' }, author: 'Clara Moreau', category: 'Mystery', publisher: 'Bluebird Editions', price: 13800, compare: 0, stock: 0, year: 2020, tags: ['mystery', 'thriller'] },
  { title: { en: 'Letters to My Future Self', fr: 'Lettres à mon futur moi', ar: 'رسائل إلى نفسي المستقبلية' }, author: 'Yasmin Rahmani', category: 'Self Help', publisher: 'Cedar House', price: 11200, compare: 14000, stock: 35, year: 2022, tags: ['selfhelp', 'gift'] },
  { title: { en: 'The Wooden Boat', fr: 'Le Bateau en bois', ar: 'القارب الخشبي' }, author: 'Amine Belkacem', category: 'Children', publisher: 'Éditions Lumière', price: 7900, compare: 9900, stock: 48, year: 2014, tags: ['children', 'classic'] },
  { title: { en: 'A Brief History of Coffee', fr: 'Une brève histoire du café', ar: 'تاريخ مختصر للقهوة' }, author: 'Tomás Vega', category: 'History', publisher: 'Atlas House', price: 15400, compare: 0, stock: 6, year: 2018, tags: ['history', 'food'] },
  { title: { en: 'The Glass Kingdom', fr: 'Le Royaume de verre', ar: 'المملكة الزجاجية' }, author: 'Elena Rossi', category: 'Fantasy', publisher: 'Northwind Press', price: 21000, compare: 24500, stock: 13, year: 2024, tags: ['fantasy', 'new'] },
];

const PHOTOS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
];

const DEMO_ADMINS = [
  { key: 'manager', name: 'Amina Idrissi', email: 'manager.demo@bookstore.test', role: 'administrator' },
  { key: 'content', name: 'Youssef Amrani', email: 'content.demo@bookstore.test', role: 'content-manager' },
  { key: 'inventory', name: 'Salma Bennani', email: 'inventory.demo@bookstore.test', role: 'inventory-manager' },
  { key: 'marketing', name: 'Nadia El Fassi', email: 'marketing.demo@bookstore.test', role: 'marketing-manager' },
];

const DEMO_CUSTOMERS = [
  { name: 'Lina Bouzid', email: 'lina.demo@bookstore.test', lang: 'fr', currency: 'EUR', city: 'Casablanca', verified: true, active: true },
  { name: 'Omar Tazi', email: 'omar.demo@bookstore.test', lang: 'ar', currency: 'MAD', city: 'Rabat', verified: true, active: true },
  { name: 'Chloé Martin', email: 'chloe.demo@bookstore.test', lang: 'fr', currency: 'EUR', city: 'Paris', verified: true, active: true },
  { name: 'James Wilson', email: 'james.demo@bookstore.test', lang: 'en', currency: 'GBP', city: 'London', verified: true, active: true },
  { name: 'Fatima Zahra', email: 'fatima.demo@bookstore.test', lang: 'ar', currency: 'MAD', city: 'Marrakech', verified: true, active: true },
  { name: 'Diego Morales', email: 'diego.demo@bookstore.test', lang: 'en', currency: 'USD', city: 'Madrid', verified: true, active: true },
  { name: 'Ines Bouchiba', email: 'ines.demo@bookstore.test', lang: 'fr', currency: 'MAD', city: 'Tangier', verified: true, active: true },
  { name: 'Ahmed Nasser', email: 'ahmed.demo@bookstore.test', lang: 'ar', currency: 'MAD', city: 'Fes', verified: false, active: true },
  { name: 'Emma Thompson', email: 'emma.demo@bookstore.test', lang: 'en', currency: 'USD', city: 'New York', verified: true, active: true },
  { name: 'Rachid Alaoui', email: 'rachid.demo@bookstore.test', lang: 'fr', currency: 'MAD', city: 'Agadir', verified: true, active: false },
  { name: 'Sofia Andreou', email: 'sofia.demo@bookstore.test', lang: 'en', currency: 'EUR', city: 'Athens', verified: true, active: true },
  { name: 'Yassine Idrissi', email: 'yassine.demo@bookstore.test', lang: 'ar', currency: 'MAD', city: 'Kenitra', verified: true, active: true },
];

const DEMO_COUPONS = [
  { code: 'WELCOME15', type: 'percent', value: 15, minPurchase: 10000, maxDiscount: 5000, expiresIn: 60, usageLimit: 500, active: true },
  { code: 'FREESHIP', type: 'fixed', value: 3000, minPurchase: 20000, maxDiscount: 3000, expiresIn: 30, usageLimit: 300, active: true },
  { code: 'RAMADAN25', type: 'percent', value: 25, minPurchase: 15000, maxDiscount: 8000, expiresIn: -10, usageLimit: 200, active: true },
  { code: 'SPRING10', type: 'percent', value: 10, minPurchase: 0, maxDiscount: 4000, startsIn: 7, expiresIn: 90, usageLimit: 100, active: true },
  { code: 'VIP20', type: 'percent', value: 20, minPurchase: 25000, maxDiscount: 10000, expiresIn: 45, usageLimit: 100, active: true, restricted: true },
  { code: 'BOOKS500', type: 'fixed', value: 5000, minPurchase: 30000, maxDiscount: 5000, expiresIn: 120, usageLimit: 50, active: false },
];

const DEMO_ZONES = [
  { en: 'Rabat', fr: 'Rabat', ar: 'الرباط', countries: ['Morocco'], cities: ['Rabat', 'Kenitra'], price: 2200, threshold: 25000, days: [1, 2], order: 4 },
  { en: 'Marrakech', fr: 'Marrakech', ar: 'مراكش', countries: ['Morocco'], cities: ['Marrakech', 'Agadir'], price: 3500, threshold: 45000, days: [2, 4], order: 5 },
  { en: 'Europe', fr: 'Europe', ar: 'أوروبا', countries: ['France', 'Spain', 'UK', 'Germany'], cities: [], price: 12000, threshold: 180000, days: [5, 10], order: 6, cod: false },
  { en: 'Gulf', fr: 'Golfe', ar: 'الخليج', countries: ['UAE', 'Saudi Arabia', 'Qatar'], cities: [], price: 13500, threshold: 200000, days: [6, 12], order: 7, cod: false },
];

const DEMO_PAGES = [
  { key: 'gift-cards', title: { en: 'Gift Cards', fr: 'Cartes cadeaux', ar: 'بطاقات الهدايا' }, body: { en: 'Give the gift of a great story. Gift cards are available in 100, 250 and 500 MAD.', fr: 'Offrez le cadeau d’une belle histoire. Cartes cadeaux de 100, 250 et 500 MAD.', ar: 'اهدِ قصة رائعة. بطاقات الهدايا متاحة بـ 100 و250 و500 درهم.' } },
  { key: 'reading-club', title: { en: 'Reading Club', fr: 'Club de lecture', ar: 'نادي القراءة' }, body: { en: 'Join our monthly reading club and discuss our picks with other book lovers.', fr: 'Rejoignez notre club de lecture mensuel et discutez de nos sélections.', ar: 'انضم إلى نادي القراءة الشهري وناقش اختياراتنا مع محبي الكتب.' } },
  { key: 'newsletter', title: { en: 'Newsletter', fr: 'Newsletter', ar: 'النشرة البريدية' }, body: { en: 'Subscribe to receive new arrivals, offers and reading recommendations.', fr: 'اشترك لتلقي الإصدارات الجديدة والعروض والتوصيات.', ar: 'اشترك لتلقي الإصدارات الجديدة والعروض والتوصيات.' } },
];

const DEMO_BANNERS = [
  { en: 'A new season of stories', fr: 'Une nouvelle saison d’histoires', ar: 'موسم جديد من القصص' },
  { en: 'Free delivery in Casablanca', fr: 'Livraison gratuite à Casablanca', ar: 'توصيل مجاني في الدار البيضاء' },
  { en: 'Gift a book, share a world', fr: 'Offrez un livre, partagez un monde', ar: 'اهدِ كتاباً، شارك عالماً' },
];

const DEMO_TESTIMONIALS = [
  { name: 'Hajar M.', role: 'Teacher', quote: { en: 'The children’s section is beautifully curated.', fr: 'La section jeunesse est magnifiquement choisie.', ar: 'قسم الأطفال مختار بعناية رائعة.' } },
  { name: 'Mehdi R.', role: 'Engineer', quote: { en: 'My order arrived a day earlier than expected.', fr: 'Ma commande est arrivée un jour avant la date prévue.', ar: 'وصلني طلبي قبل الموعد بيوم.' } },
  { name: 'Camille D.', role: 'Designer', quote: { en: 'Beautiful packaging and an excellent selection.', fr: 'Emballage magnifique et excellente sélection.', ar: 'تغليف جميل ومجموعة ممتازة.' } },
  { name: 'Othman K.', role: 'Student', quote: { en: 'Great prices and fast support when I had a question.', fr: 'Prix imbattables et support rapide.', ar: 'أسعار رائعة ودعم سريع.' } },
  { name: 'Leila S.', role: 'Reader', quote: { en: 'I discovered three new favourite authors here.', fr: 'J’ai découvert trois nouveaux auteurs préférés ici.', ar: 'اكتشفت ثلاثة مؤلفين جدد أحبهم هنا.' } },
];

const DEMO_SUBSCRIBERS = [
  'amal.demo@bookstore.test', 'karim.demo@bookstore.test', 'sara.demo@bookstore.test',
  'younes.demo@bookstore.test', 'nora.demo@bookstore.test', 'bilal.demo@bookstore.test',
  'ghita.demo@bookstore.test', 'omar.sub@bookstore.test', 'laila.sub@bookstore.test',
  'faisal.sub@bookstore.test', 'zineb.sub@bookstore.test', 'hamza.sub@bookstore.test',
];

const DEMO_NOTIFICATIONS = [
  { title: 'Demo - Low stock: The Glass Kingdom', message: 'Only 13 copies remain. Consider restocking.', severity: 'warning', link: '/admin/inventory' },
  { title: 'Demo - Out of stock: The Silent Witness', message: 'This title has been out of stock for 2 days.', severity: 'error', link: '/admin/inventory' },
  { title: 'Demo - New order DEMO-2026-0001', message: 'A new order is waiting to be confirmed.', severity: 'info', link: '/admin/orders' },
  { title: 'Demo - Refund requested', message: 'Order DEMO-2026-0012 has been refunded.', severity: 'warning', link: '/admin/orders' },
  { title: 'Demo - Coupon WELCOME15 is performing well', message: '42 orders used this coupon in the last 30 days.', severity: 'success', link: '/admin/coupons' },
  { title: 'Demo - 4 review(s) need moderation', message: 'Pending reviews are waiting in the moderation queue.', severity: 'info', link: '/admin/reviews' },
  { title: 'Demo - Stripe payout completed', message: 'Your weekly payout has been processed.', severity: 'success', link: '/admin/payments' },
  { title: 'Demo - New newsletter subscribers', message: '12 readers joined the mailing list this week.', severity: 'success', link: '/admin/cms' },
  { title: 'Demo - Audit log export ready', message: 'The monthly audit export is available.', severity: 'info', link: '/admin/audit' },
  { title: 'Demo - Delivery partner update', message: 'Average delivery time improved to 2.4 days.', severity: 'success', link: '/admin/shipping' },
  { title: 'Demo - Failed payment needs attention', message: 'One card payment was declined.', severity: 'error', link: '/admin/payments' },
  { title: 'Demo - Weekly sales report', message: 'Revenue is up 18% compared with last week.', severity: 'success', link: '/admin/reports' },
];

const REVIEW_TITLES = [
  'Exactly what I was looking for', 'A beautiful edition', 'Could not put it down',
  'Thoughtful and well written', 'Great gift idea', 'Worth every dirham',
  'A slow start, but excellent', 'My new favourite', 'Highly recommended',
];

const REVIEW_COMMENTS = [
  'The story stayed with me long after I finished it. The translation reads naturally and the print quality is lovely.',
  'Arrived in perfect condition and the delivery was quick. I would happily order from this bookstore again.',
  'A thoughtful, beautifully written book. I highlighted so many passages that I lost count.',
  'The packaging was careful and the book itself feels premium. Great value for the price.',
  'I enjoyed the characters and the atmosphere. The ending left me wanting a sequel.',
  'Good quality and exactly as described. It made a wonderful gift for a friend.',
  'The first chapters were slow, but the second half was excellent. I would recommend it.',
  'One of those rare books that makes you think about your own life while you read.',
  'Clear writing, engaging ideas and a very satisfying conclusion. Five stars from me.',
];

const CITIES = ['Casablanca', 'Rabat', 'Marrakech', 'Tangier', 'Fes', 'Agadir', 'Kenitra'];
const STREETS = ['12 Rue des Libraires', '45 Avenue Mohammed V', '8 Rue Al Andalus', '77 Boulevard Zerktouni'];
const GUESTS = [
  { firstName: 'Guest', lastName: 'Reader', email: 'guest.demo@bookstore.test', phone: '+212 611 223 344' },
  { firstName: 'Camille', lastName: 'Dupont', email: 'camille.guest@bookstore.test', phone: '+33 6 12 34 56 78' },
];

const RATES = { MAD: 1, EUR: 0.091, USD: 0.098, GBP: 0.077 };

function mulberry32(seed) {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261120);
const pick = (list) => list[Math.floor(rand() * list.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

function daysAgo(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, int(0, 59), 0, 0);
  return date;
}

function daysAhead(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 0, 0);
  return date;
}

function sample(list, count) {
  const copy = [...list];
  const result = [];
  while (copy.length && result.length < count) {
    result.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return result;
}

async function setTimestamps(Model, id, createdAt, updatedAt = createdAt) {
  await Model.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(String(id)) },
    { $set: { createdAt, updatedAt } },
  );
}

async function cleanup() {
  const demoCustomerIds = await User.find({ email: { $in: DEMO_CUSTOMERS.map((c) => c.email) } }).distinct('_id');
  const knownUserIds = await User.find({
    email: { $in: [...DEMO_CUSTOMERS.map((c) => c.email), 'reader@bookstore.test'] },
  }).distinct('_id');

  await Order.deleteMany({ orderNumber: /^DEMO-/ });
  await PaymentTransaction.deleteMany({ providerTransactionId: /^DEMO-/ });
  await InventoryMovement.deleteMany({ reference: /^DEMO-/ });
  await Review.deleteMany({ user: { $in: demoCustomerIds } });
  await Coupon.deleteMany({ code: { $in: DEMO_COUPONS.map((c) => c.code) } });
  await AuditLog.deleteMany({ 'details.demo': true });
  await Notification.deleteMany({ title: /^Demo - / });
  await Cart.deleteMany({ user: { $in: knownUserIds } });
  await Banner.deleteMany({ 'title.en': { $in: DEMO_BANNERS.map((b) => b.en) } });
  await CMSPage.deleteMany({ key: { $in: DEMO_PAGES.map((p) => p.key) } });
  await Testimonial.deleteMany({ name: { $in: DEMO_TESTIMONIALS.map((t) => t.name) } });
  await NewsletterSubscriber.deleteMany({ email: { $in: DEMO_SUBSCRIBERS } });
}

async function seedRoles() {
  for (const role of ROLES) {
    await Role.findOneAndUpdate({ slug: role.slug }, role, { upsert: true, new: true });
  }
  const roles = await Role.find();
  return Object.fromEntries(roles.map((role) => [role.slug, role]));
}

async function seedCatalog() {
  for (const [i, name] of EXTRA_CATEGORIES.entries()) {
    await Category.findOneAndUpdate(
      { slug: slugify(name.en) },
      {
        name,
        description: {
          en: `Hand-picked ${name.en.toLowerCase()} titles for every reader.`,
          fr: `Une sélection de livres ${name.fr.toLowerCase()} pour tous les lecteurs.`,
          ar: `مجموعة مختارة من كتب ${name.ar} لكل القرّاء.`,
        },
        position: 10 + i,
        isActive: true,
      },
      { upsert: true, new: true },
    );
  }

  for (const [i, name] of EXTRA_AUTHORS.entries()) {
    await Author.findOneAndUpdate(
      { slug: slugify(name) },
      {
        name,
        photo: PHOTOS[i % PHOTOS.length],
        biography: {
          en: `${name} writes stories that explore memory, place and the people we become.`,
          fr: `${name} écrit des histoires qui explorent la mémoire, les lieux et notre devenir.`,
          ar: `يكتب ${name} قصصاً تستكشف الذاكرة والأماكن وتحولات الإنسان.`,
        },
        nationality: pick(['Morocco', 'France', 'United Kingdom', 'Spain', 'Italy', 'India']),
        birthDate: new Date(`${1955 + (i % 30)}-0${1 + (i % 9)}-1${i % 9}`),
        isActive: true,
      },
      { upsert: true, new: true },
    );
  }

  for (const publisher of EXTRA_PUBLISHERS) {
    await Publisher.findOneAndUpdate(
      { slug: slugify(publisher.name) },
      {
        name: publisher.name,
        contactEmail: publisher.email,
        website: `https://${slugify(publisher.name)}.test`,
        phone: '+212 600 000 000',
        address: '12 Library Lane, Casablanca',
        isActive: true,
      },
      { upsert: true, new: true },
    );
  }

  const categories = await Category.find().lean();
  const authors = await Author.find().lean();
  const publishers = await Publisher.find().lean();
  const categoryMap = Object.fromEntries(categories.map((c) => [c.name?.en, c._id]));
  const authorMap = Object.fromEntries(authors.map((a) => [a.name, a._id]));
  const publisherMap = Object.fromEntries(publishers.map((p) => [p.name, p._id]));

  for (const [i, item] of EXTRA_BOOKS.entries()) {
    const slug = slugify(item.title.en);
    const coverImage = createDemoBookCover(item.title.en, item.author);
    const discountPercent = item.compare > item.price
      ? Math.round((1 - item.price / item.compare) * 100)
      : 0;
    const created = daysAgo(int(20, 240));
    const doc = await Book.findOneAndUpdate(
      { slug },
      {
        title: item.title,
        subtitle: {
          en: 'A specially selected edition for our readers',
          fr: 'Une édition spécialement choisie pour nos lecteurs',
          ar: 'طبعة مختارة خصيصاً لقرّائنا',
        },
        slug,
        isbn: `978-${String(2100000000000 + i * 7919)}`,
        author: authorMap[item.author],
        categories: [categoryMap[item.category]].filter(Boolean),
        publisher: publisherMap[item.publisher],
        publicationDate: new Date(`${item.year}-0${1 + (i % 9)}-15`),
        pages: 180 + i * 11,
        language: 'en',
        description: {
          en: `${item.title.en} by ${item.author} is a memorable read from ${item.publisher}, now available in our curated collection.`,
          fr: `${item.title.fr} de ${item.author} est une lecture mémorable publiée par ${item.publisher}, disponible dans notre sélection.`,
          ar: `${item.title.ar} للكاتب ${item.author} قراءة مميزة صدرت عن ${item.publisher}، وهي متاحة الآن في مجموعتنا المختارة.`,
        },
        coverImage,
        images: [coverImage],
        price: item.price,
        compareAtPrice: item.compare,
        discountPercent,
        stock: item.stock,
        lowStockThreshold: i % 4 === 0 ? 8 : 5,
        featured: i < 6,
        bestSeller: i % 3 === 0,
        newArrival: item.year >= 2022,
        trending: i % 2 === 0,
        isPublished: true,
        ratingAverage: Number((4 + (i % 9) / 10).toFixed(1)),
        ratingCount: 18 + i * 5,
        views: 120 + i * 37,
        soldCount: 55 + i * 19,
        tags: item.tags,
        seo: {
          title: { en: `${item.title.en} — The Reading Room` },
          description: { en: `Buy ${item.title.en} by ${item.author} online in Morocco.` },
        },
      },
      { upsert: true, new: true },
    );
    await setTimestamps(Book, doc._id, created);
  }

  return Book.find({ isPublished: true }).populate('author', 'name').lean();
}

async function seedShippingZones() {
  for (const zone of DEMO_ZONES) {
    await ShippingZone.findOneAndUpdate(
      { 'name.en': zone.en },
      {
        name: { en: zone.en, fr: zone.fr, ar: zone.ar },
        countries: zone.countries,
        cities: zone.cities,
        price: zone.price,
        freeShippingThreshold: zone.threshold,
        estimatedDaysMin: zone.days[0],
        estimatedDaysMax: zone.days[1],
        codAvailable: zone.cod !== false,
        isActive: true,
        order: zone.order,
      },
      { upsert: true, new: true },
    );
  }
  return ShippingZone.find({ isActive: true }).sort({ order: 1 }).lean();
}

async function seedCoupons() {
  const docs = [];
  for (const [i, coupon] of DEMO_COUPONS.entries()) {
    const doc = await Coupon.findOneAndUpdate(
      { code: coupon.code },
      {
        code: coupon.code,
        description: {
          en: coupon.code === 'FREESHIP' ? 'Free standard delivery' : `${coupon.value}% / ${coupon.value} MAD special offer`,
          fr: coupon.code === 'FREESHIP' ? 'Livraison standard offerte' : `Offre spéciale ${coupon.value}`,
          ar: coupon.code === 'FREESHIP' ? 'توصيل عادي مجاني' : `عرض خاص ${coupon.value}`,
        },
        type: coupon.type,
        value: coupon.value,
        minPurchase: coupon.minPurchase,
        maxDiscount: coupon.maxDiscount,
        startsAt: coupon.startsIn ? daysAhead(coupon.startsIn) : daysAgo(20 - i),
        expiresAt: daysAhead(coupon.expiresIn),
        usageLimit: coupon.usageLimit,
        usedCount: 0,
        perUserLimit: 3,
        isActive: coupon.active,
      },
      { upsert: true, new: true },
    );
    await setTimestamps(Coupon, doc._id, daysAgo(30 - i));
    docs.push(doc);
  }
  return docs;
}

async function seedPeople(roleMap, books) {
  const passwordHash = await bcrypt.hash('Demo@12345', 12);
  const adminMap = {};
  const admins = [];
  for (const [i, item] of DEMO_ADMINS.entries()) {
    const doc = await Admin.findOneAndUpdate(
      { email: item.email },
      {
        name: item.name,
        email: item.email,
        password: passwordHash,
        role: roleMap[item.role]._id,
        isActive: true,
        language: 'en',
        lastLoginAt: daysAgo(int(0, 8)),
      },
      { upsert: true, new: true },
    );
    await setTimestamps(Admin, doc._id, daysAgo(150 - i * 10));
    adminMap[item.key] = doc;
    admins.push(doc);
  }

  const bookIds = books.map((b) => b._id);
  const customerMap = {};
  const customers = [];
  for (const [i, item] of DEMO_CUSTOMERS.entries()) {
    const doc = await User.findOneAndUpdate(
      { email: item.email },
      {
        name: item.name,
        email: item.email,
        password: passwordHash,
        role: 'customer',
        isVerified: item.verified,
        isActive: item.active,
        language: item.lang,
        currency: item.currency,
        phone: `+212 6${String(10 + i).padStart(2, '0')} 12 34 ${String(50 + i).padStart(2, '0')}`,
        addresses: [{
          label: i % 2 ? 'Office' : 'Home',
          fullName: item.name,
          phone: `+212 6${String(10 + i).padStart(2, '0')} 12 34 ${String(50 + i).padStart(2, '0')}`,
          addressLine1: STREETS[i % STREETS.length],
          addressLine2: i % 3 ? `Apartment ${4 + i}` : '',
          city: item.city,
          region: item.city,
          postalCode: `${20000 + i * 137}`,
          country: item.currency === 'MAD' ? 'Morocco' : 'International',
          isDefault: true,
        }],
        wishlist: sample(bookIds, 2 + (i % 3)),
        recentlyViewed: sample(bookIds, 3 + (i % 2)),
        lastLoginAt: daysAgo(int(0, 12)),
      },
      { upsert: true, new: true },
    );
    await setTimestamps(User, doc._id, daysAgo(110 - i * 7));
    customerMap[item.email] = doc;
    customers.push(doc);
  }

  const reader = await User.findOne({ email: 'reader@bookstore.test' });
  if (reader) {
    reader.addresses = [{
      label: 'Home',
      fullName: reader.name,
      phone: '+212 612 345 678',
      addressLine1: '24 Rue des Écrivains',
      addressLine2: '',
      city: 'Casablanca',
      region: 'Casablanca',
      postalCode: '20000',
      country: 'Morocco',
      isDefault: true,
    }];
    reader.wishlist = sample(bookIds, 4);
    reader.recentlyViewed = sample(bookIds, 5);
    reader.lastLoginAt = daysAgo(1);
    await reader.save();
    await Cart.create({
      user: reader._id,
      items: books.slice(2, 4).map((book) => ({ book: book._id, quantity: 1 })),
      coupon: 'WELCOME15',
      currency: 'MAD',
      expiresAt: daysAhead(12),
    });
  }

  const cartUser = customerMap[DEMO_CUSTOMERS[0].email];
  await Cart.create({
    user: cartUser._id,
    items: books.slice(0, 2).map((book) => ({ book: book._id, quantity: 1 })),
    coupon: 'WELCOME15',
    currency: 'MAD',
    expiresAt: daysAhead(12),
  });

  return { adminMap, admins, customerMap, customers, reader };
}

async function seedOrders({ customers, reader, books, zones, coupons }) {
  const scenarios = [
    { status: 'Pending', paymentStatus: 'Pending', method: 'cod' },
    { status: 'Confirmed', paymentStatus: 'Pending', method: 'cod' },
    { status: 'Processing', paymentStatus: 'Paid', method: 'mock' },
    { status: 'Shipped', paymentStatus: 'Paid', method: 'stripe' },
    { status: 'Delivered', paymentStatus: 'Paid', method: 'stripe' },
    { status: 'Delivered', paymentStatus: 'Paid', method: 'cod' },
    { status: 'Delivered', paymentStatus: 'Paid', method: 'mock' },
    { status: 'Cancelled', paymentStatus: 'Failed', method: 'stripe' },
    { status: 'Refunded', paymentStatus: 'Refunded', method: 'stripe' },
    { status: 'Delivered', paymentStatus: 'Partially Refunded', method: 'mock' },
  ];

  const couponUsage = Object.fromEntries(coupons.map((c) => [c.code, 0]));
  const orders = [];
  const payments = [];
  const flow = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

  for (let i = 0; i < 48; i += 1) {
    const scenario = scenarios[i % scenarios.length];
    const guest = i % 9 === 0;
    const useReader = !guest && i % 5 === 0;
    const user = guest ? null : useReader ? reader : pick(customers);
    const chosenBooks = sample(books, 1 + (i % 3));
    const snapshots = chosenBooks.map((book) => {
      const quantity = 1 + (i + chosenBooks.indexOf(book)) % 3;
      return {
        book: book._id,
        title: book.title,
        authorName: book.author?.name || '',
        slug: book.slug,
        coverImage: book.coverImage,
        isbn: book.isbn,
        quantity,
        unitPrice: book.price,
        unitDisplayPrice: book.price,
        lineTotal: book.price * quantity,
        lineDisplayTotal: book.price * quantity,
      };
    });

    const subtotal = snapshots.reduce((sum, item) => sum + item.lineTotal, 0);
    const coupon = i % 4 === 0 ? coupons.find((c) => c.code === 'WELCOME15')
      : i % 7 === 0 ? coupons.find((c) => c.code === 'FREESHIP') : null;
    let discount = 0;
    if (coupon) {
      discount = coupon.type === 'percent' ? Math.round(subtotal * coupon.value / 100) : coupon.value;
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
      discount = Math.min(discount, subtotal);
      couponUsage[coupon.code] += 1;
    }

    const zone = zones[i % zones.length];
    const taxable = subtotal - discount;
    const shipping = zone.freeShippingThreshold && taxable >= zone.freeShippingThreshold ? 0 : zone.price;
    const tax = 0;
    const total = taxable + shipping + tax;
    const currency = guest ? 'MAD' : user?.currency || 'MAD';
    const rate = RATES[currency] || 1;
    const display = (amount) => Math.round(amount * rate);
    const createdAt = daysAgo(i < 10 ? int(0, 8) : int(9, 88), 8 + (i % 10));

    const person = guest ? GUESTS[i % GUESTS.length] : {
      firstName: String(user.name).split(' ')[0],
      lastName: String(user.name).split(' ').slice(1).join(' ') || 'Reader',
      email: user.email,
      phone: user.phone || '+212 612 345 678',
    };
    const address = user?.addresses?.[0];
    const shippingAddress = address ? {
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
    } : {
      fullName: `${person.firstName} ${person.lastName}`,
      phone: person.phone,
      addressLine1: STREETS[i % STREETS.length],
      addressLine2: '',
      city: CITIES[i % CITIES.length],
      region: CITIES[i % CITIES.length],
      postalCode: `${20000 + i * 37}`,
      country: 'Morocco',
    };

    let logStatuses;
    if (scenario.status === 'Cancelled') logStatuses = ['Pending', 'Cancelled'];
    else if (scenario.status === 'Refunded') logStatuses = ['Pending', 'Paid', 'Refunded'];
    else logStatuses = flow.slice(0, Math.max(1, flow.indexOf(scenario.status) + 1));

    const statusLog = logStatuses.map((status, index) => ({
      status,
      note: status === 'Pending' ? 'Order placed' : status === 'Cancelled' ? 'Cancelled by customer request' : `Order moved to ${status}`,
      changedBy: index === 0 ? 'Demo customer' : 'Demo system',
      at: new Date(createdAt.getTime() + index * 3600000 * (6 + i % 12)),
    }));

    const orderNumber = `DEMO-2026-${String(i + 1).padStart(4, '0')}`;
    const order = await Order.create({
      orderNumber,
      user: user?._id || undefined,
      guestEmail: guest ? person.email : undefined,
      customer: person,
      items: snapshots,
      shippingAddress,
      shippingMethod: zone._id,
      shippingLabel: zone.name.en,
      status: scenario.status,
      paymentStatus: scenario.paymentStatus,
      paymentMethod: scenario.method,
      paymentIntentId: scenario.method === 'stripe' ? `pi_demo_${i + 1}` : undefined,
      currency,
      exchangeRate: rate,
      subtotal,
      shipping,
      tax,
      discount,
      total,
      displaySubtotal: display(subtotal),
      displayShipping: display(shipping),
      displayTax: display(tax),
      displayDiscount: display(discount),
      displayTotal: display(total),
      coupon: coupon ? { code: coupon.code, amount: discount } : undefined,
      notes: i % 6 === 0 ? 'Please call before delivery.' : '',
      statusLog,
      refundedAmount: scenario.paymentStatus === 'Partially Refunded' ? Math.round(total * 0.3) : scenario.paymentStatus === 'Refunded' ? total : 0,
      invoiceNumber: `INV-${orderNumber}`,
    });
    await setTimestamps(Order, order._id, createdAt);

    const txStatus = {
      Pending: 'pending',
      Paid: 'succeeded',
      Failed: 'failed',
      Refunded: 'refunded',
      'Partially Refunded': 'succeeded',
    }[scenario.paymentStatus];
    const payment = await PaymentTransaction.create({
      order: order._id,
      provider: scenario.method,
      providerTransactionId: `DEMO-TX-${String(i + 1).padStart(4, '0')}`,
      amount: total,
      currency: 'MAD',
      status: txStatus,
      failureReason: txStatus === 'failed' ? 'Card declined by issuer' : undefined,
      metadata: { orderNumber, source: 'demo-data', displayCurrency: currency },
    });
    await setTimestamps(PaymentTransaction, payment._id, createdAt);

    orders.push(order);
    payments.push(payment);
  }

  for (const coupon of coupons) {
    coupon.usedCount = couponUsage[coupon.code] || 0;
    await coupon.save();
  }

  return { orders, payments };
}

async function seedInventory(admins, books) {
  const movements = [];
  const types = ['purchase', 'sale', 'return', 'adjustment', 'damage'];

  for (const [i, book] of books.entries()) {
    for (let j = 0; j < 3; j += 1) {
      const type = types[(i + j) % types.length];
      const magnitude = 1 + ((i * 3 + j * 7) % 9);
      const quantity = ['sale', 'damage'].includes(type) ? -magnitude : magnitude;
      const previousStock = Math.max(0, book.stock - quantity);
      const doc = await InventoryMovement.create({
        book: book._id,
        type,
        quantity,
        previousStock,
        newStock: Math.max(0, previousStock + quantity),
        reason: {
          purchase: 'Supplier restock',
          sale: 'Customer order reservation',
          return: 'Customer return restocked',
          adjustment: 'Cycle count correction',
          damage: 'Damaged copy removed',
        }[type],
        reference: `DEMO-INV-${i + 1}-${j + 1}`,
        performedBy: admins[(i + j) % admins.length]._id,
      });
      await setTimestamps(InventoryMovement, doc._id, daysAgo(int(0, 75)));
      movements.push(doc);
    }
  }
  return movements;
}

async function seedReviews(customers, books) {
  const reviews = [];
  const used = new Set();

  for (let i = 0; i < 34; i += 1) {
    let user = pick(customers);
    let book = pick(books);
    let key = `${user._id}:${book._id}`;
    let guard = 0;
    while (used.has(key) && guard < 20) {
      user = pick(customers);
      book = pick(books);
      key = `${user._id}:${book._id}`;
      guard += 1;
    }
    if (used.has(key)) continue;
    used.add(key);

    const status = i % 7 === 0 ? 'rejected' : i % 4 === 0 ? 'pending' : 'approved';
    const doc = await Review.create({
      book: book._id,
      user: user._id,
      userName: user.name,
      rating: status === 'rejected' ? pick([1, 2]) : pick([4, 5, 5, 5]),
      title: REVIEW_TITLES[i % REVIEW_TITLES.length],
      comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
      status,
      isReported: i % 11 === 0,
      adminResponse: status === 'approved' && i % 3 === 0 ? 'Thank you for sharing your thoughts!' : undefined,
      helpful: int(0, 24),
    });
    await setTimestamps(Review, doc._id, daysAgo(int(1, 80)));
    reviews.push(doc);
  }
  return reviews;
}

async function seedContent() {
  for (const page of DEMO_PAGES) {
    const doc = await CMSPage.findOneAndUpdate({ key: page.key }, page, { upsert: true, new: true });
    await setTimestamps(CMSPage, doc._id, daysAgo(45));
  }

  for (const [i, title] of DEMO_BANNERS.entries()) {
    const doc = await Banner.findOneAndUpdate(
      { 'title.en': title.en },
      {
        title,
        subtitle: {
          en: 'Discover this month’s most loved books.',
          fr: 'Découvrez les livres les plus aimés du mois.',
          ar: 'اكتشف أكثر الكتب محبة هذا الشهر.',
        },
        image: COVERS[i % COVERS.length],
        ctaLabel: { en: 'Shop now', fr: 'Acheter maintenant', ar: 'تسوق الآن' },
        link: '/shop',
        position: i === 0 ? 'home-top' : 'home-mid',
        order: 10 + i,
        isActive: true,
      },
      { upsert: true, new: true },
    );
    await setTimestamps(Banner, doc._id, daysAgo(40 - i * 5));
  }

  for (const [i, item] of DEMO_TESTIMONIALS.entries()) {
    const doc = await Testimonial.findOneAndUpdate(
      { name: item.name },
      { ...item, rating: 5, avatar: PHOTOS[i % PHOTOS.length], order: 10 + i, isActive: true },
      { upsert: true, new: true },
    );
    await setTimestamps(Testimonial, doc._id, daysAgo(35 - i * 3));
  }

  for (const email of DEMO_SUBSCRIBERS) {
    const doc = await NewsletterSubscriber.findOneAndUpdate(
      { email },
      { email, language: pick(['en', 'fr', 'ar']), isActive: true },
      { upsert: true, new: true },
    );
    await setTimestamps(NewsletterSubscriber, doc._id, daysAgo(int(1, 60)));
  }

  for (const section of await HomepageSection.find()) {
    section.title = {
      en: section.key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
      fr: section.key === 'featured' ? 'À la une' : '',
      ar: section.key === 'featured' ? 'مميزة' : '',
    };
    section.isVisible = true;
    await section.save();
  }

  const settings = {
    'store.name': 'The Reading Room',
    'store.description': 'Curated books, beautiful editions and thoughtful recommendations.',
    'store.email': 'hello@thereadingroom.test',
    'store.phone': '+212 600 000 000',
    'store.address': '123 Library Street, Casablanca, Morocco',
    'store.logo': '/favicon.svg',
    'store.favicon': '/favicon.svg',
    'store.defaultLanguage': 'en',
    'store.supportedLanguages': ['en', 'fr', 'ar'],
    'store.defaultCurrency': 'MAD',
    'store.supportedCurrencies': ['MAD', 'EUR', 'USD', 'GBP'],
    'tax.rate': 0,
    'shipping.defaultPrice': 3000,
    'payment.codEnabled': true,
    'payment.stripeEnabled': false,
    'maintenance.enabled': false,
    'social.instagram': 'https://instagram.com/thereadingroom',
    'social.facebook': 'https://facebook.com/thereadingroom',
    'seo.defaultTitle': 'The Reading Room — Discover Your Next Great Read',
    'seo.defaultDescription': 'Shop curated fiction, history, children’s books and more at The Reading Room.',
    'demo.generatedAt': new Date().toISOString(),
  };
  for (const [key, value] of Object.entries(settings)) {
    await StoreSetting.findOneAndUpdate({ key }, { value }, { upsert: true });
  }

  await ExchangeRate.create({
    base: 'MAD',
    rates: RATES,
    provider: 'demo-data',
    fetchedAt: new Date(),
  });
}

async function seedLogs(admins, orders) {
  for (let i = 0; i < 26; i += 1) {
    const actor = admins[i % admins.length];
    const modules = ['books', 'orders', 'inventory', 'reviews', 'coupons', 'cms', 'customers', 'payments', 'settings'];
    const actions = ['create', 'update', 'delete', 'adjust', 'refund', 'approve', 'reject', 'export'];
    const module = modules[i % modules.length];
    const action = actions[i % actions.length];
    const target = i % 3 === 0 && orders[i] ? orders[i].orderNumber : `DEMO-${module}-${i + 1}`;
    const doc = await AuditLog.create({
      actor: actor._id,
      actorName: actor.name,
      action,
      module,
      targetId: target,
      details: {
        demo: true,
        summary: `${action} on ${module}`,
        amount: i % 4 === 0 ? 19900 : undefined,
      },
      ip: `192.168.1.${10 + (i % 40)}`,
    });
    await setTimestamps(AuditLog, doc._id, daysAgo(int(0, 60)));
  }

  for (const [i, item] of DEMO_NOTIFICATIONS.entries()) {
    const doc = await Notification.create({
      type: item.severity,
      title: item.title,
      message: item.message,
      link: item.link,
      severity: item.severity,
      isRead: i % 3 === 0,
      recipient: null,
    });
    await setTimestamps(Notification, doc._id, daysAgo(int(0, 20)));
  }
}

async function run() {
  await connectDatabase();
  logger.info('Generating full demo dataset...');
  await cleanup();
  const roleMap = await seedRoles();
  const books = await seedCatalog();
  const zones = await seedShippingZones();
  const coupons = await seedCoupons();
  const { adminMap, admins, customerMap, customers, reader } = await seedPeople(roleMap, books);
  const { orders, payments } = await seedOrders({ customers, reader, books, zones, coupons });
  const movements = await seedInventory([adminMap.inventory, adminMap.manager], books);
  const reviews = await seedReviews(customers, books);
  await seedContent();
  await seedLogs(admins, orders);

  logger.info('Demo dataset ready:', {
    admins: await Admin.countDocuments(),
    customers: await User.countDocuments(),
    books: await Book.countDocuments(),
    orders: orders.length,
    payments: payments.length,
    movements: movements.length,
    reviews: reviews.length,
    coupons: await Coupon.countDocuments(),
    notifications: await Notification.countDocuments(),
  });
  logger.info('Demo logins: manager.demo@bookstore.test / content.demo@bookstore.test / inventory.demo@bookstore.test / marketing.demo@bookstore.test — password Demo@12345');
  await disconnectDatabase();
}

run().catch(async (error) => {
  logger.error('Demo data generation failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});

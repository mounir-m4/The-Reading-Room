import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Role, PERMISSIONS } from '../models/Role.js';
import { Admin } from '../models/Admin.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Author } from '../models/Author.js';
import { Publisher } from '../models/Publisher.js';
import { Book } from '../models/Book.js';
import { ShippingZone } from '../models/Operations.js';
import { StoreSetting } from '../models/Operations.js';
import { Coupon } from '../models/Coupon.js';
import { CMSPage, HomepageSection, Banner, Testimonial } from '../models/Content.js';
import { slugify } from '../utils/slugify.js';
import {
  createCategoryImage,
  createPublisherLogo,
} from '../utils/taxonomyArtwork.js';
import { authorPhotoUrl } from '../utils/realCatalogImages.js';

const BOOK_COVERS = {
  'the-alchemist': 'https://covers.openlibrary.org/b/id/14846382-L.jpg?default=false',
  'atomic-habits': 'https://covers.openlibrary.org/b/id/12539702-L.jpg?default=false',
  dune: 'https://covers.openlibrary.org/b/id/11481354-L.jpg?default=false',
  'the-little-prince': 'https://covers.openlibrary.org/b/id/13578797-L.jpg?default=false',
  sapiens: 'https://covers.openlibrary.org/b/id/8634250-L.jpg?default=false',
  'rich-dad-poor-dad': 'https://covers.openlibrary.org/b/id/8315603-L.jpg?default=false',
  'the-midnight-library': 'https://covers.openlibrary.org/b/id/10313767-L.jpg?default=false',
  neuromancer: 'https://covers.openlibrary.org/b/id/283860-L.jpg?default=false',
  'the-psychology-of-money': 'https://covers.openlibrary.org/b/id/10389354-L.jpg?default=false',
  'the-book-of-lost-tales': 'https://covers.openlibrary.org/b/id/2154260-L.jpg?default=false',
  'thinking-fast-and-slow': 'https://covers.openlibrary.org/b/id/13290711-L.jpg?default=false',
  'a-short-history-of-nearly-everything': 'https://covers.openlibrary.org/b/id/12725620-L.jpg?default=false',
};

const ALL = PERMISSIONS;
const ROLES = [
  { name: 'Super Admin', slug: 'super-admin', permissions: ALL },
  { name: 'Administrator', slug: 'administrator', permissions: ALL.filter((p) => !p.startsWith('users.')) },
  { name: 'Content Manager', slug: 'content-manager', permissions: ['books.view', 'books.edit', 'categories.manage', 'authors.manage', 'cms.manage'] },
  { name: 'Order Manager', slug: 'order-manager', permissions: ['orders.view', 'orders.manage', 'orders.refund', 'customers.view'] },
  { name: 'Inventory Manager', slug: 'inventory-manager', permissions: ['books.view', 'inventory.view', 'inventory.manage'] },
  { name: 'Marketing Manager', slug: 'marketing-manager', permissions: ['coupons.manage', 'cms.manage', 'analytics.view', 'reports.export'] },
];

const CATEGORIES = [
  { en: 'Fiction', fr: 'Roman', ar: 'رواية' },
  { en: 'Science Fiction', fr: 'Science-fiction', ar: 'الخيال العلمي' },
  { en: 'Self Help', fr: 'Développement personnel', ar: 'تطوير الذات' },
  { en: 'History', fr: 'Histoire', ar: 'التاريخ' },
  { en: 'Children', fr: 'Jeunesse', ar: 'الأطفال' },
  { en: 'Business', fr: 'Affaires', ar: 'الأعمال' },
];

const BOOKS = [
  { title: { en: 'The Alchemist', fr: 'L\'Alchimiste', ar: 'الخيميائي' }, author: 'Paulo Coelho', category: 'Fiction', price: 12900, compare: 16500, stock: 24, tags: ['bestseller', 'classic'], year: 1988 },
  { title: { en: 'Atomic Habits', fr: 'Les Habitudes Atomiques', ar: 'العادات الذرية' }, author: 'James Clear', category: 'Self Help', price: 18900, compare: 22000, stock: 15, tags: ['productivity'], year: 2018 },
  { title: { en: 'Dune', fr: 'Dune', ar: 'ديون' }, author: 'Frank Herbert', category: 'Science Fiction', price: 15500, compare: 0, stock: 8, tags: ['classic'], year: 1965 },
  { title: { en: 'The Little Prince', fr: 'Le Petit Prince', ar: 'الأمير الصغير' }, author: 'Antoine de Saint-Exupéry', category: 'Children', price: 8500, compare: 11000, stock: 40, tags: ['classic'], year: 1943 },
  { title: { en: 'Sapiens', fr: 'Sapiens', ar: 'سابيانس' }, author: 'Yuval Noah Harari', category: 'History', price: 21000, compare: 24500, stock: 12, tags: ['bestseller'], year: 2011 },
  { title: { en: 'Rich Dad Poor Dad', fr: 'Père riche, père pauvre', ar: 'الأب الغني والأب الفقير' }, author: 'Robert Kiyosaki', category: 'Business', price: 14500, compare: 0, stock: 0, tags: ['finance'], year: 1997 },
  { title: { en: 'The Midnight Library', fr: 'La Bibliothèque de minuit', ar: 'مكتبة منتصف الليل' }, author: 'Matt Haig', category: 'Fiction', price: 13900, compare: 17000, stock: 18, tags: ['new'], year: 2020 },
  { title: { en: 'Neuromancer', fr: 'Neuromancien', ar: 'نيورومانسر' }, author: 'William Gibson', category: 'Science Fiction', price: 12500, compare: 0, stock: 6, tags: ['cyberpunk'], year: 1984 },
  { title: { en: 'The Psychology of Money', fr: 'La Psychologie de l\'argent', ar: 'علم النفس والمال' }, author: 'Morgan Housel', category: 'Business', price: 16500, compare: 19000, stock: 21, tags: ['finance'], year: 2020 },
  { title: { en: 'The Book of Lost Tales', fr: 'Le Livre des contes perdus', ar: 'كتاب الحكايات المفقودة' }, author: 'J.R.R. Tolkien', category: 'Fiction', price: 23000, compare: 0, stock: 3, tags: ['fantasy'], year: 1983 },
  { title: { en: 'Thinking, Fast and Slow', fr: 'Système 1, Système 2', ar: 'التفكير السريع والبطيء' }, author: 'Daniel Kahneman', category: 'Self Help', price: 19500, compare: 23000, stock: 9, tags: ['psychology'], year: 2011 },
  { title: { en: 'A Short History of Nearly Everything', fr: 'Une brève histoire de presque tout', ar: 'تاريخ مختصر تقريباً لكل شيء' }, author: 'Bill Bryson', category: 'History', price: 17500, compare: 0, stock: 14, tags: ['science'], year: 2003 },
];

async function seed() {
  await connectDatabase();
  logger.info('Seeding database...');

  for (const role of ROLES) {
    await Role.findOneAndUpdate({ slug: role.slug }, role, { upsert: true, new: true });
  }
  const superRole = await Role.findOne({ slug: 'super-admin' });

  if (!(await Admin.exists({ email: env.seed.adminEmail }))) {
    await Admin.create({
      name: 'Store Administrator',
      email: env.seed.adminEmail,
      password: env.seed.adminPassword,
      role: superRole._id,
    });
  }

  if (!(await User.exists({ email: 'reader@bookstore.test' }))) {
    await User.create({
      name: 'Demo Reader',
      email: 'reader@bookstore.test',
      password: 'Reader@12345',
      isVerified: true,
      language: 'en',
      currency: 'MAD',
    });
  }

  const categoryMap = {};
  for (const [i, name] of CATEGORIES.entries()) {
    const doc = await Category.findOneAndUpdate(
      { slug: slugify(name.en) },
      {
        name,
        description: { en: `Explore our ${name.en} collection.`, fr: `Découvrez notre collection ${name.fr}.`, ar: `استكشف مجموعة ${name.ar}.` },
        image: createCategoryImage(name.en),
        position: i,
        isActive: true,
      },
      { upsert: true, new: true },
    );
    categoryMap[name.en] = doc._id;
  }

  const authorMap = {};
  for (const name of [...new Set(BOOKS.map((b) => b.author))]) {
    const doc = await Author.findOneAndUpdate(
      { slug: slugify(name) },
      {
        name,
        photo: authorPhotoUrl(name),
        biography: { en: `${name} is a celebrated author whose work has inspired readers worldwide.`, fr: `${name} est un auteur célébré dont l'œuvre a inspiré des lecteurs du monde entier.`, ar: `${name} كاتب مشهور ألهمت أعماله قرّاء في جميع أنحاء العالم.` },
      },
      { upsert: true, new: true },
    );
    authorMap[name] = doc._id;
  }

  const publisher = await Publisher.findOneAndUpdate(
    { slug: 'reading-room-press' },
    {
      name: 'Reading Room Press',
      logo: createPublisherLogo('Reading Room Press'),
      contactEmail: 'press@thereadingroom.test',
    },
    { upsert: true, new: true },
  );

  for (const [i, item] of BOOKS.entries()) {
    const coverImage = BOOK_COVERS[slugify(item.title.en)];
    await Book.findOneAndUpdate(
      { slug: slugify(item.title.en) },
      {
        title: item.title,
        subtitle: { en: 'A distinguished edition', fr: 'Une édition prestigieuse', ar: 'طبعة مميزة' },
        description: {
          en: `${item.title.en} by ${item.author} is a captivating read that belongs on every bookshelf. First published in ${item.year}, this edition brings the story to a new generation of readers.`,
          fr: `${item.title.fr} de ${item.author} est une lecture captivante qui mérite sa place dans chaque bibliothèque. Publié pour la première fois en ${item.year}, ce livre touche une nouvelle génération.`,
          ar: `كتاب ${item.title.ar} للكاتب ${item.author} قراءة آسرة تستحق مكاناً في كل مكتبة. نُشر لأول مرة عام ${item.year}، ويصل اليوم إلى جيل جديد من القرّاء.`,
        },
        slug: slugify(item.title.en),
        isbn: `978-${String(2000000000000 + i * 7919)}`,
        author: authorMap[item.author],
        categories: [categoryMap[item.category]],
        publisher: publisher._id,
        publicationDate: new Date(`${item.year}-05-01`),
        pages: 200 + i * 17,
        language: item.title.ar ? 'en' : 'en',
        coverImage,
        images: [coverImage],
        price: item.price,
        compareAtPrice: item.compare,
        stock: item.stock,
        lowStockThreshold: 5,
        featured: i < 4,
        bestSeller: i % 3 === 0,
        newArrival: i >= 6,
        trending: i % 2 === 0,
        isPublished: true,
        ratingAverage: 4 + (i % 5) / 10,
        ratingCount: 12 + i * 7,
        soldCount: 40 + i * 13,
        tags: item.tags,
        seo: { title: { en: `${item.title.en} — Buy online` }, description: { en: `Buy ${item.title.en} by ${item.author} online.` } },
      },
      { upsert: true, new: true },
    );
  }

  const zones = [
    { name: { en: 'Casablanca', fr: 'Casablanca', ar: 'الدار البيضاء' }, countries: ['Morocco'], cities: ['Casablanca'], price: 2500, freeShippingThreshold: 30000, estimatedDaysMin: 1, estimatedDaysMax: 2, order: 1 },
    { name: { en: 'Other Morocco', fr: 'Autre Maroc', ar: 'باقي المغرب' }, countries: ['Morocco'], cities: [], price: 4000, freeShippingThreshold: 50000, estimatedDaysMin: 2, estimatedDaysMax: 5, order: 2 },
    { name: { en: 'International', fr: 'International', ar: 'دولي' }, countries: [], cities: [], price: 15000, freeShippingThreshold: 200000, estimatedDaysMin: 7, estimatedDaysMax: 15, codAvailable: false, order: 3 },
  ];
  for (const zone of zones) {
    await ShippingZone.findOneAndUpdate({ 'name.en': zone.name.en }, zone, { upsert: true });
  }

  await Coupon.findOneAndUpdate({ code: 'SAVE10' }, {
    code: 'SAVE10',
    description: { en: '10% off your order', fr: '10 % de réduction sur votre commande', ar: 'خصم 10٪ على طلبك' },
    type: 'percent',
    value: 10,
    minPurchase: 0,
    maxDiscount: 10000,
    startsAt: new Date(),
    usageLimit: 0,
    perUserLimit: 5,
    isActive: true,
  }, { upsert: true });

  const defaults = {
    'store.name': 'The Reading Room',
    'store.description': 'Explore a world of stories, knowledge and inspiration.',
    'store.email': 'hello@thereadingroom.test',
    'store.phone': '+212 600 000 000',
    'store.address': '123 Library Street, Casablanca, Morocco',
    'store.defaultCurrency': 'MAD',
    'store.defaultLanguage': 'en',
    'tax.rate': 0,
    'shipping.defaultPrice': 3000,
    'payment.codEnabled': true,
    'payment.stripeEnabled': Boolean(env.stripe.secretKey),
    'maintenance.enabled': false,
  };
  for (const [key, value] of Object.entries(defaults)) {
    await StoreSetting.findOneAndUpdate({ key }, { value }, { upsert: true });
  }

  const sections = ['featured', 'bestSellers', 'newArrivals', 'categories', 'authors', 'trending', 'recommended', 'offers', 'banners', 'testimonials', 'newsletter', 'recentlyViewed'];
  for (const [i, key] of sections.entries()) {
    await HomepageSection.findOneAndUpdate({ key }, {
      key, order: i, isVisible: true,
      title: { en: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), fr: '', ar: '' },
    }, { upsert: true });
  }

  const pages = [
    { key: 'about', title: { en: 'About Us', fr: 'À propos', ar: 'من نحن' }, body: { en: 'The Reading Room is a curated destination for readers who value great writing, beautiful editions and thoughtful recommendations.', fr: 'The Reading Room est une destination soigneusement choisie pour les lecteurs qui aiment la belle écriture et les recommandations attentionnées.', ar: 'غرفة القراءة وجهة مختارة للقرّاء الذين يقدّرون الكتابة الرائعة والإصدارات الجميلة والتوصيات المدروسة.' } },
    { key: 'contact', title: { en: 'Contact Us', fr: 'Contactez-nous', ar: 'اتصل بنا' }, body: { en: 'Reach us at hello@thereadingroom.test or +212 600 000 000.', fr: 'Écrivez-nous à hello@thereadingroom.test ou appelez le +212 600 000 000.', ar: 'تواصل معنا على hello@thereadingroom.test أو اتصل بنا على +212 600 000 000.' } },
    { key: 'faq', title: { en: 'FAQ', fr: 'FAQ', ar: 'الأسئلة الشائعة' }, body: { en: 'Frequently asked questions about orders, shipping and returns.', fr: 'أسئلة شائعة حول الطلبات والشحن والإرجاع.', ar: 'أسئلة شائعة حول الطلبات والشحن والإرجاع.' } },
    { key: 'privacy', title: { en: 'Privacy Policy', fr: 'Politique de confidentialité', ar: 'سياسة الخصوصية' }, body: { en: 'We respect your privacy and protect your personal data.', fr: 'نحترم خصوصيتك ونحمي بياناتك الشخصية.', ar: 'نحترم خصوصيتك ونحمي بياناتك الشخصية.' } },
    { key: 'terms', title: { en: 'Terms & Conditions', fr: 'Conditions générales', ar: 'الشروط والأحكام' }, body: { en: 'By using this store you agree to our terms.', fr: 'باستخدامك المتجر فإنك توافق على شروطنا.', ar: 'باستخدامك المتجر فإنك توافق على شروطنا.' } },
    { key: 'shipping-policy', title: { en: 'Shipping Policy', fr: 'Politique de livraison', ar: 'سياسة الشحن' }, body: { en: 'We deliver across Morocco and internationally.', fr: 'Nous livrons au Maroc et à l’international.', ar: 'نشحن إلى جميع أنحاء المغرب ودولياً.' } },
    { key: 'return-policy', title: { en: 'Return Policy', fr: 'Politique de retour', ar: 'سياسة الإرجاع' }, body: { en: 'Returns accepted within 14 days of delivery.', fr: 'الإرجاع مقبول خلال 14 يوماً من الاستلام.', ar: 'الإرجاع مقبول خلال 14 يوماً من الاستلام.' } },
  ];
  for (const page of pages) {
    await CMSPage.findOneAndUpdate({ key: page.key }, page, { upsert: true });
  }

  await Banner.findOneAndUpdate({ 'title.en': 'Stories that stay with you' }, {
    title: { en: 'Stories that stay with you', fr: 'Des histoires qui restent', ar: 'قصص تبقى في الذاكرة' },
    subtitle: { en: 'Discover this season’s most talked-about books.', fr: 'Découvrez les livres les plus commentés de la saison.', ar: 'اكتشف أكثر الكتب تداولاً هذا الموسم.' },
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1600&q=80',
    ctaLabel: { en: 'Explore the collection', fr: 'Explorer la collection', ar: 'استكشف المجموعة' },
    link: '/shop', position: 'home-mid', order: 1, isActive: true,
  }, { upsert: true });

  for (const [i, t] of [
    { name: 'Salma I.', role: 'Reader', quote: { en: 'Beautiful bookstore, fast delivery and wonderful recommendations.', fr: 'Magnifique librairie, livraison rapide et belles recommandations.', ar: 'مكتبة جميلة وتوصيل سريع وتوصيات رائعة.' } },
    { name: 'Youssef B.', role: 'Reader', quote: { en: 'The easiest checkout experience I have had in a long time.', fr: 'L’expérience de paiement la plus simple depuis longtemps.', ar: 'أسهل تجربة دفع مررت بها منذ فترة طويلة.' } },
    { name: 'Nadia K.', role: 'Teacher', quote: { en: 'My students love the curated children’s collection.', fr: 'Mes élèves adorent la collection jeunesse.', ar: 'طلابي يحبون مجموعة الأطفال المختارة.' } },
  ].entries()) {
    await Testimonial.findOneAndUpdate({ name: t.name }, { ...t, rating: 5, order: i, isActive: true }, { upsert: true });
  }

  logger.info('Seed complete:', {
    admins: await Admin.countDocuments(),
    users: await User.countDocuments(),
    books: await Book.countDocuments(),
    categories: await Category.countDocuments(),
  });
  await disconnectDatabase();
}

seed().catch(async (error) => {
  logger.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});

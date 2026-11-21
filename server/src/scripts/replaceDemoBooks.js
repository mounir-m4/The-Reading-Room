import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Author } from '../models/Author.js';
import { Book } from '../models/Book.js';
import { Category } from '../models/Category.js';
import { logger } from '../utils/logger.js';
import { slugify } from '../utils/slugify.js';
import { authorPhotoUrl, catalogBookCoverUrl } from '../utils/realCatalogImages.js';
import { LEGACY_DEMO_AUTHORS, REAL_DEMO_BOOKS } from './realDemoBooks.js';

const dryRun = process.argv.includes('--dry-run');

async function replaceDemoBooks() {
  await connectDatabase();

  const categories = await Category.find().select('name').lean();
  const categoryIds = new Map(categories.map((category) => [category.name?.en, category._id]));
  const replacements = [];
  const missing = [];

  for (const item of REAL_DEMO_BOOKS) {
    const slug = slugify(item.title.en);
    const legacyBook = await Book.findOne({ slug: item.legacySlug });
    const currentBook = await Book.findOne({ slug });
    const categoryId = categoryIds.get(item.category);
    const coverImage = catalogBookCoverUrl(item);
    const photo = authorPhotoUrl(item.author);
    if (legacyBook && currentBook && !legacyBook._id.equals(currentBook._id)) {
      throw new Error(`Both legacy and replacement books exist for "${item.title.en}"`);
    }
    const existing = legacyBook || currentBook;

    if (!existing || !categoryId) {
      missing.push(item.title.en);
      continue;
    }

    replacements.push({ item, existing, slug, categoryId, coverImage, photo });
  }

  if (missing.length) {
    throw new Error(`Could not safely replace catalogue entries: ${missing.join(', ')}`);
  }

  if (dryRun) {
    logger.info('Real catalogue replacement preflight passed:', {
      books: replacements.length,
      authors: new Set(replacements.map(({ item }) => item.author)).size,
    });
    await disconnectDatabase();
    return;
  }

  const authorIds = new Map();
  for (const { item, photo } of replacements) {
    if (authorIds.has(item.author)) continue;
    const author = await Author.findOneAndUpdate(
      { slug: slugify(item.author) },
      {
        $set: {
          name: item.author,
          photo,
          biography: {
            en: `Discover books by ${item.author} in our curated collection.`,
            fr: `Découvrez les livres de ${item.author} dans notre collection.`,
            ar: `اكتشف كتب ${item.author} ضمن مجموعتنا المختارة.`,
          },
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
    authorIds.set(item.author, author._id);
  }

  let updated = 0;
  for (const { item, existing, slug, categoryId, coverImage } of replacements) {
    const result = await Book.updateOne(
      { _id: existing._id },
      {
        $set: {
          title: item.title,
          slug,
          author: authorIds.get(item.author),
          categories: [categoryId],
          publisher: null,
          publicationDate: new Date(`${item.year}-01-01`),
          description: {
            en: `${item.title.en} by ${item.author}, first published in ${item.year}.`,
            fr: `${item.title.fr} de ${item.author}, publié pour la première fois en ${item.year}.`,
            ar: `${item.title.ar} للكاتب ${item.author}، نُشر لأول مرة عام ${item.year}.`,
          },
          coverImage,
          images: [coverImage],
          tags: item.tags,
          isPublished: true,
        },
        $unset: { isbn: '' },
      },
      { runValidators: true },
    );

    if (result.matchedCount !== 1) {
      throw new Error(`Book update did not match "${item.title.en}"`);
    }
    updated += 1;
  }

  await Author.updateMany(
    { name: { $in: LEGACY_DEMO_AUTHORS } },
    { $set: { isActive: false }, $unset: { photo: '' } },
  );
  logger.info('Replaced demo catalogue entries with real books:', { books: updated, authors: authorIds.size });
  await disconnectDatabase();
}

replaceDemoBooks().catch(async (error) => {
  logger.error('Real catalogue replacement failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});

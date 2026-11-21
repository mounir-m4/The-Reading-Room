import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Author } from '../models/Author.js';
import { Book } from '../models/Book.js';
import { logger } from '../utils/logger.js';
import { authorPhotoUrl, bookCoverUrl } from '../utils/realCatalogImages.js';
import { slugify } from '../utils/slugify.js';
import { REAL_DEMO_BOOKS } from './realDemoBooks.js';

const dryRun = process.argv.includes('--dry-run');
const repairedDemoBookSlugs = new Set([
  'a-table-for-twelve',
  'the-blue-hour',
  'poems-for-the-long-way-home',
  'bread-and-orange-blossom',
]);

async function repairCatalogImageSources() {
  await connectDatabase();

  const booksToRepair = [
    { slug: 'the-little-prince', title: 'The Little Prince', coverImage: bookCoverUrl(15217314) },
    ...REAL_DEMO_BOOKS
      .filter((item) => repairedDemoBookSlugs.has(item.legacySlug))
      .map((item) => ({
        slug: slugify(item.title.en),
        title: item.title.en,
        coverImage: bookCoverUrl(item.coverId),
      })),
  ];
  const books = [];

  for (const item of booksToRepair) {
    const book = await Book.findOne({ slug: item.slug }).select('_id slug');
    if (!book) throw new Error(`Could not find catalogue book "${item.title}" (${item.slug})`);
    books.push({ ...item, id: book._id });
  }

  const authorsToRepair = [];
  for (const name of ['Anne Frank', 'Morgan Housel']) {
    const author = await Author.findOne({ slug: slugify(name) }).select('_id name');
    if (!author) throw new Error(`Could not find "${name}" in the author catalogue`);
    authorsToRepair.push({ id: author._id, name: author.name, photo: authorPhotoUrl(name) });
  }

  if (dryRun) {
    logger.info('Catalogue image source preflight passed:', {
      books: books.map(({ title }) => title),
      authors: authorsToRepair.map(({ name }) => name),
    });
    await disconnectDatabase();
    return;
  }

  for (const book of books) {
    const result = await Book.updateOne(
      { _id: book.id, slug: book.slug },
      { $set: { coverImage: book.coverImage, images: [book.coverImage] } },
    );
    if (result.matchedCount !== 1) {
      throw new Error(`Image update did not match "${book.title}"`);
    }
  }

  for (const book of books) {
    const storedBook = await Book.findById(book.id).select('coverImage images').lean();
    if (
      storedBook?.coverImage !== book.coverImage
      || storedBook.images?.length !== 1
      || storedBook.images[0] !== book.coverImage
    ) {
      throw new Error(`Image update verification failed for "${book.title}"`);
    }
  }

  for (const author of authorsToRepair) {
    const authorResult = await Author.updateOne(
      { _id: author.id, slug: slugify(author.name) },
      { $set: { photo: author.photo } },
    );
    if (authorResult.matchedCount !== 1) {
      throw new Error(`Photo update did not match "${author.name}"`);
    }
    const storedAuthor = await Author.findById(author.id).select('photo').lean();
    if (storedAuthor?.photo !== author.photo) {
      throw new Error(`Photo update verification failed for "${author.name}"`);
    }
  }

  logger.info('Catalogue image sources repaired:', { books: books.length, authors: authorsToRepair.length });
  await disconnectDatabase();
}

repairCatalogImageSources().catch(async (error) => {
  logger.error('Catalogue image source repair failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});

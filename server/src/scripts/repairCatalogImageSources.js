import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Author } from '../models/Author.js';
import { Book } from '../models/Book.js';
import { logger } from '../utils/logger.js';
import { authorPhotoUrl, bookCoverUrl, catalogBookCoverUrl } from '../utils/realCatalogImages.js';
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
        coverImage: catalogBookCoverUrl(item),
      })),
  ];
  const books = [];

  for (const item of booksToRepair) {
    const book = await Book.findOne({ slug: item.slug }).select('_id slug');
    if (!book) throw new Error(`Could not find catalogue book "${item.title}" (${item.slug})`);
    books.push({ ...item, id: book._id });
  }

  const anneFrank = await Author.findOne({ slug: slugify('Anne Frank') }).select('_id name');
  if (!anneFrank) throw new Error('Could not find Anne Frank in the author catalogue');
  const anneFrankPhoto = authorPhotoUrl('Anne Frank');

  if (dryRun) {
    logger.info('Catalogue image source preflight passed:', {
      books: books.map(({ title }) => title),
      authors: [anneFrank.name],
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

  const authorResult = await Author.updateOne(
    { _id: anneFrank._id, slug: slugify('Anne Frank') },
    { $set: { photo: anneFrankPhoto } },
  );
  if (authorResult.matchedCount !== 1) {
    throw new Error('Anne Frank photo update did not match the author record');
  }
  const storedAuthor = await Author.findById(anneFrank._id).select('photo').lean();
  if (storedAuthor?.photo !== anneFrankPhoto) {
    throw new Error('Anne Frank photo update verification failed');
  }

  logger.info('Catalogue image sources repaired:', { books: books.length, authors: 1 });
  await disconnectDatabase();
}

repairCatalogImageSources().catch(async (error) => {
  logger.error('Catalogue image source repair failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});

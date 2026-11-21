import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { Author } from '../models/Author.js';
import { Category } from '../models/Category.js';
import { Publisher } from '../models/Publisher.js';
import {
  createAuthorAvatar,
  createCategoryImage,
  createPublisherLogo,
} from '../utils/taxonomyArtwork.js';

const LEGACY_AUTHOR_PHOTOS = new Set([
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
]);
const refreshGenerated = process.argv.includes('--refresh-generated');
const isGeneratedArtwork = (image) => image?.startsWith('data:image/svg+xml;charset=UTF-8,');

async function seedTaxonomyImages() {
  await connectDatabase();
  const counts = { categories: 0, authors: 0, publishers: 0 };

  for (const category of await Category.find().select('name slug image').lean()) {
    if (category.image && !(refreshGenerated && isGeneratedArtwork(category.image))) continue;
    await Category.updateOne(
      { _id: category._id },
      { $set: { image: createCategoryImage(category.name?.en || category.slug) } },
    );
    counts.categories += 1;
  }

  for (const author of await Author.find().select('name photo').lean()) {
    if (author.photo && !LEGACY_AUTHOR_PHOTOS.has(author.photo)
      && !(refreshGenerated && isGeneratedArtwork(author.photo))) continue;
    await Author.updateOne(
      { _id: author._id },
      { $set: { photo: createAuthorAvatar(author.name) } },
    );
    counts.authors += 1;
  }

  for (const publisher of await Publisher.find().select('name logo').lean()) {
    if (publisher.logo && !(refreshGenerated && isGeneratedArtwork(publisher.logo))) continue;
    await Publisher.updateOne(
      { _id: publisher._id },
      { $set: { logo: createPublisherLogo(publisher.name) } },
    );
    counts.publishers += 1;
  }

  logger.info('Taxonomy images seeded:', counts);
  await disconnectDatabase();
}

seedTaxonomyImages().catch(async (error) => {
  logger.error('Taxonomy image seeding failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});

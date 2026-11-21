import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { Author } from '../models/Author.js';
import { Category } from '../models/Category.js';
import { Publisher } from '../models/Publisher.js';
import { createCategoryImage, createPublisherLogo } from '../utils/taxonomyArtwork.js';
import { authorPhotoUrl, hasAuthorPhoto } from '../utils/realCatalogImages.js';
import { LEGACY_DEMO_AUTHORS } from './realDemoBooks.js';

const refreshGenerated = process.argv.includes('--refresh-generated');
const isGeneratedArtwork = (image) => image?.startsWith('data:image/svg+xml;charset=UTF-8,');
const legacyAuthors = new Set(LEGACY_DEMO_AUTHORS);

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

  for (const author of await Author.find().select('name photo isActive').lean()) {
    if (hasAuthorPhoto(author.name)) {
      const photo = authorPhotoUrl(author.name);
      if (author.photo === photo && author.isActive !== false) continue;
      await Author.updateOne(
        { _id: author._id },
        { $set: { photo, isActive: true } },
      );
    } else if (legacyAuthors.has(author.name)) {
      if (author.isActive === false && !author.photo) continue;
      await Author.updateOne(
        { _id: author._id },
        { $set: { isActive: false }, $unset: { photo: '' } },
      );
    } else {
      continue;
    }
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

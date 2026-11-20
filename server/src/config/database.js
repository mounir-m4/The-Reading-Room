import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let memoryServer;

export async function connectDatabase() {
  mongoose.set('strictQuery', true);

  if (env.useMemoryDb || env.isTest) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri(), { dbName: 'bookstore_test' });
    logger.info('Connected to in-memory MongoDB');
    return;
  }

  await mongoose.connect(env.mongoUri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10_000,
  });
  logger.info('Connected to MongoDB');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

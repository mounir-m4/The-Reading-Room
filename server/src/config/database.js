import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let memoryServer;
let connectionPromise;

export function connectDatabase() {
  if (connectionPromise) return connectionPromise;

  mongoose.set('strictQuery', true);

  connectionPromise = (async () => {
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
  })();

  // A failed attempt must not be cached forever (important for warm serverless instances).
  connectionPromise.catch(() => { connectionPromise = undefined; });
  return connectionPromise;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = undefined;
  }
  connectionPromise = undefined;
}

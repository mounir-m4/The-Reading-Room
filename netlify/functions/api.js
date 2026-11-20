import serverless from 'serverless-http';
import { createApp } from '../../server/src/app.js';
import { connectDatabase } from '../../server/src/config/database.js';

// Reused across warm Netlify Function invocations.
let appHandler;
let databasePromise;

function ensureDatabase() {
  databasePromise ||= connectDatabase();
  return databasePromise;
}

export const handler = async (event, context) => {
  if (context && 'callbackWaitsForEmptyEventLoop' in context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  appHandler ||= serverless(createApp());

  // The health probe should answer even if MongoDB is temporarily unavailable.
  if (!event.path?.startsWith('/api/health')) await ensureDatabase();

  return appHandler(event, context);
};

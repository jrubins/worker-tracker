import { createDb } from '@app/db';
import { attachDatabasePool } from '@vercel/functions';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createLogger } from './logger.ts';

/** Wires config, logger, database and app together. Shared by both entry points. */
export function bootstrap() {
  const config = loadConfig();
  const logger = createLogger(config);
  // On Vercel (Fluid compute) one instance serves concurrent requests, so a few connections;
  // Neon's pooled connection string multiplexes them. attachDatabasePool releases idle clients
  // before the instance suspends.
  const db = createDb(config.DATABASE_URL, { max: config.VERCEL ? 5 : 10 });
  if (config.VERCEL) attachDatabasePool(db.pool);
  const app = createApp({ config, db, logger });
  return { app, config, db, logger };
}

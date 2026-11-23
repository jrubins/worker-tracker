import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';
import pg from 'pg';
import type { Contract } from './contract.d.ts';
import contractJson from './contract.json' with { type: 'json' };

export const contract = contractFromJson<Contract>(contractJson);

export interface CreateDbOptions {
  /** Max pooled connections. Keep it small on serverless; use Neon's pooled URL there. */
  max?: number;
  /** Fail instead of hanging when the database is unreachable or a query stalls. */
  connectionTimeoutMs?: number;
  queryTimeoutMs?: number;
}

/**
 * Creates a database client over our own `pg` pool, so the app can run health checks and
 * close connections on shutdown. The caller owns the connection string (validated config).
 */
export function createDb(url: string, options: CreateDbOptions = {}) {
  const pool = new pg.Pool({
    connectionString: url,
    max: options.max ?? 10,
    connectionTimeoutMillis: options.connectionTimeoutMs ?? 5_000,
    query_timeout: options.queryTimeoutMs ?? 15_000,
  });
  const client = postgres({ contract, pg: pool });
  return {
    orm: client.orm,
    /** Runs `fn` in a transaction: it commits when `fn` returns and rolls back if it throws. */
    transaction: client.transaction.bind(client),
    /** True when the database answers a trivial query. */
    async ping(): Promise<boolean> {
      try {
        await pool.query('select 1');
        return true;
      } catch {
        return false;
      }
    },
    async close(): Promise<void> {
      await pool.end();
    },
    /** The underlying pg pool, for platform hooks such as Vercel's attachDatabasePool. */
    pool,
  };
}

export type Db = ReturnType<typeof createDb>;

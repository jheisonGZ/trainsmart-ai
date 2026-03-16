import { Pool, type PoolClient, type QueryResultRow, types } from 'pg';

import { env } from '../config/env';

const useSsl = env.DATABASE_URL.includes('supabase.co');

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

export const pool = env.DATABASE_URL
  ? new Pool({
      connectionString: env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    })
  : null;

function getPoolOrThrow() {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured for direct database access.');
  }

  return pool;
}

export async function checkDatabaseConnection() {
  const databasePool = getPoolOrThrow();
  const result = await databasePool.query<{ current_time: string }>(
    'select now()::text as current_time',
  );
  return result.rows[0] ?? null;
}

export type DatabaseClient = Pool | PoolClient;

export async function queryRows<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client: DatabaseClient = getPoolOrThrow(),
) {
  const result = await client.query<T>(sql, params);
  return result.rows;
}

export async function queryMaybeOne<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client: DatabaseClient = getPoolOrThrow(),
) {
  const rows = await queryRows<T>(sql, params, client);
  return rows[0] ?? null;
}

export async function queryOne<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client: DatabaseClient = getPoolOrThrow(),
) {
  const row = await queryMaybeOne<T>(sql, params, client);

  if (!row) {
    throw new Error('Expected a row but query returned none.');
  }

  return row;
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await getPoolOrThrow().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabasePool() {
  if (pool) {
    await pool.end();
  }
}

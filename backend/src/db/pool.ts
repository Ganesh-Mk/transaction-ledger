import pg from "pg";
import { env } from "../config/env.js";

// NUMERIC (OID 1700) comes back from pg as a string to avoid precision loss.
// Amounts are NUMERIC(15,2), so the largest value (~1e13) converts to a
// JavaScript number exactly; we parse it once here instead of everywhere.
pg.types.setTypeParser(1700, (value) => Number(value));
// COUNT(*) is BIGINT (OID 20); row counts comfortably fit in a number.
pg.types.setTypeParser(20, (value) => Number(value));

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  // An idle client errored (e.g. the database restarted). The pool discards it.
  console.error("Unexpected idle database client error", err);
});

export type DbClient = pg.PoolClient;
export type Queryable = pg.Pool | pg.PoolClient;

/**
 * Runs `work` inside a single database transaction.
 * Commits if it resolves, rolls back if it throws, so every write inside is
 * all-or-nothing (the atomicity guarantee the ledger relies on).
 */
export async function withTransaction<T>(work: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

import { pathToFileURL } from "node:url";
import { migrations } from "./migrations/index.js";
import { pool, withTransaction } from "./pool.js";

// Arbitrary constant; serialises concurrent migration runs (e.g. two replicas booting).
const MIGRATION_LOCK_ID = 727_001;

export async function runMigrations(): Promise<string[]> {
  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        TEXT        PRIMARY KEY,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));
    const ran: string[] = [];

    for (const migration of migrations) {
      if (applied.has(migration.name)) continue;
      await client.query(migration.up);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [migration.name]);
      ran.push(migration.name);
    }
    return ran;
  });
}

// Allow `node dist/db/migrate.js` to be run directly.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runMigrations()
    .then((ran) => {
      console.log(ran.length ? `Applied migrations: ${ran.join(", ")}` : "Database is up to date");
    })
    .catch((err) => {
      console.error("Migration failed", err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}

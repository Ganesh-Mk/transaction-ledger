// Runs once before the whole suite: bring the test database schema up to date.
export default async function setup() {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL ??= "postgres://ledger:ledger@localhost:5433/ledger_test";
  const { runMigrations } = await import("../src/db/migrate.js");
  const { pool } = await import("../src/db/pool.js");
  await runMigrations();
  await pool.end();
}

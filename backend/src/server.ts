import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";
import { pool } from "./db/pool.js";

async function main() {
  // Migrations are idempotent and guarded by an advisory lock, so running
  // them on every boot is safe and keeps deploys to a single step.
  const ran = await runMigrations();
  if (ran.length) console.log(`Applied migrations: ${ran.join(", ")}`);

  const server = createApp().listen(env.PORT, () => {
    console.log(`Ledger API listening on port ${env.PORT} (docs at /api/docs)`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    // Force-exit if in-flight requests don't drain in time.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});

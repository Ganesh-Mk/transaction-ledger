import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration tests run against a real Postgres (see docker-compose.yml);
    // they share one database, so test files run one at a time.
    fileParallelism: false,
    globalSetup: ["./tests/globalSetup.ts"],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://ledger:ledger@localhost:5433/ledger_test",
    },
  },
});

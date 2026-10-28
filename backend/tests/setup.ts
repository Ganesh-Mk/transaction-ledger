import { afterAll, beforeEach } from "vitest";
import { pool } from "../src/db/pool.js";

// TRUNCATE is a statement-level operation, so it isn't blocked by the
// row-level immutability triggers; it's only used here to isolate tests.
beforeEach(async () => {
  await pool.query("TRUNCATE transactions, transfers, accounts RESTART IDENTITY CASCADE");
});

afterAll(async () => {
  await pool.end();
});

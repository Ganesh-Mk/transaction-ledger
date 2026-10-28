/**
 * Loads demo data through the same service layer the API uses, so every
 * balance is produced by real, validated transactions.
 *   npm run seed            (dev, uses .env)
 *   node dist/db/seed.js    (built)
 */
import { accountService } from "../modules/accounts/account.service.js";
import { transactionService } from "../modules/transactions/transaction.service.js";
import { transferService } from "../modules/transfers/transfer.service.js";
import { runMigrations } from "./migrate.js";
import { pool } from "./pool.js";

type Entry = ["credit" | "debit", number, string];

const DEMO: { name: string; entries: Entry[] }[] = [
  {
    name: "Aarav Sharma",
    entries: [
      ["credit", 85000, "October salary"],
      ["debit", 22000, "Apartment rent"],
      ["debit", 3450.75, "Electricity bill"],
      ["credit", 12000, "Freelance project payout"],
      ["debit", 1899, "Streaming subscriptions"],
    ],
  },
  {
    name: "Priya Nair",
    entries: [
      ["credit", 120000, "Consulting retainer"],
      ["debit", 45000, "Laptop purchase"],
      ["debit", 6200.5, "Travel booking"],
    ],
  },
  {
    name: "Kalakaar Studios",
    entries: [
      ["credit", 250000, "Brand campaign advance"],
      ["debit", 90000, "Creator payouts"],
      ["debit", 15500, "Production costs"],
      ["credit", 40000, "Campaign milestone 2"],
    ],
  },
  { name: "Rohan Mehta", entries: [["credit", 5000, "Opening deposit"]] },
  { name: "Intent Farm Ops", entries: [["credit", 60000, "Media budget top-up"], ["debit", 18750, "Ad spend"]] },
];

async function seed() {
  await runMigrations();
  const { rows } = await pool.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM accounts");
  if (rows[0]!.n > 0 && !process.argv.includes("--force")) {
    console.log("Database already has accounts; skipping seed (use --force to add demo data anyway).");
    return;
  }

  const ids: string[] = [];
  for (const [i, demo] of DEMO.entries()) {
    const account = await accountService.create(demo.name);
    ids.push(account.id);
    for (const [j, [type, amount, description]] of demo.entries.entries()) {
      await transactionService.create(account.id, {
        type,
        amount,
        description,
        reference_id: `SEED-${i + 1}-${j + 1}`,
      });
    }
  }

  await transferService.create({
    from_account_id: ids[2]!,
    to_account_id: ids[3]!,
    amount: 25000,
    reference_id: "SEED-TRF-1",
    description: "Creator fee",
  });
  await transferService.create({
    from_account_id: ids[0]!,
    to_account_id: ids[1]!,
    amount: 4500,
    reference_id: "SEED-TRF-2",
    description: "Dinner split",
  });

  console.log(`Seeded ${DEMO.length} accounts with transactions and 2 transfers.`);
}

seed()
  .catch((err) => {
    console.error("Seed failed", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

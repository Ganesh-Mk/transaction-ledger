import { Router } from "express";
import { pool } from "../../db/pool.js";

export const statsRouter = Router();

/** Aggregate numbers for the dashboard overview. */
statsRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query<{
    total_accounts: number;
    total_balance: number;
    total_transactions: number;
    total_credited: number;
    total_debited: number;
    total_transfers: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM accounts)                                             AS total_accounts,
      (SELECT COALESCE(SUM(balance), 0) FROM accounts)                            AS total_balance,
      (SELECT COUNT(*) FROM transactions)                                         AS total_transactions,
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'credit')   AS total_credited,
      (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'debit')    AS total_debited,
      (SELECT COUNT(*) FROM transfers)                                            AS total_transfers
  `);
  res.json({ data: rows[0] });
});

import type { Queryable } from "../../db/pool.js";

export type TransactionType = "credit" | "debit";

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  reference_id: string;
  balance_after: number;
  transfer_id: string | null;
  created_at: Date;
}

export interface NewTransaction {
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  reference_id: string;
  balance_after: number;
  transfer_id?: string | null;
}

const COLUMNS =
  "id, account_id, type, amount, description, reference_id, balance_after, transfer_id, created_at";

export const transactionRepository = {
  async insert(db: Queryable, tx: NewTransaction): Promise<Transaction> {
    const { rows } = await db.query<Transaction>(
      `INSERT INTO transactions
         (account_id, type, amount, description, reference_id, balance_after, transfer_id)
       VALUES ($1, $2, $3::numeric, $4, $5, $6::numeric, $7)
       RETURNING ${COLUMNS}`,
      [
        tx.account_id,
        tx.type,
        String(tx.amount),
        tx.description,
        tx.reference_id,
        String(tx.balance_after),
        tx.transfer_id ?? null,
      ],
    );
    return rows[0]!;
  },

  async findById(db: Queryable, accountId: string, id: string): Promise<Transaction | null> {
    const { rows } = await db.query<Transaction>(
      `SELECT ${COLUMNS} FROM transactions WHERE account_id = $1 AND id = $2`,
      [accountId, id],
    );
    return rows[0] ?? null;
  },

  async findByReference(db: Queryable, accountId: string, referenceId: string): Promise<Transaction | null> {
    const { rows } = await db.query<Transaction>(
      `SELECT ${COLUMNS} FROM transactions WHERE account_id = $1 AND reference_id = $2`,
      [accountId, referenceId],
    );
    return rows[0] ?? null;
  },

  async listByAccount(
    db: Queryable,
    opts: { accountId: string; type?: TransactionType; limit: number; offset: number },
  ): Promise<{ rows: Transaction[]; total: number }> {
    const params: unknown[] = [opts.accountId];
    let where = "WHERE account_id = $1";
    if (opts.type) {
      params.push(opts.type);
      where += ` AND type = $${params.length}`;
    }

    const [list, count] = await Promise.all([
      db.query<Transaction>(
        `SELECT ${COLUMNS} FROM transactions ${where}
         ORDER BY created_at DESC, seq DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, opts.limit, opts.offset],
      ),
      db.query<{ total: number }>(`SELECT COUNT(*) AS total FROM transactions ${where}`, params),
    ]);
    return { rows: list.rows, total: count.rows[0]!.total };
  },
};

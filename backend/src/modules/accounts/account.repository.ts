import type { Queryable } from "../../db/pool.js";

export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: Date;
}

const COLUMNS = "id, name, balance, created_at";

export const accountRepository = {
  async insert(db: Queryable, name: string): Promise<Account> {
    // balance and created_at are deliberately not parameters: the database
    // defaults (0 and clock_timestamp()) are the only source of those values.
    const { rows } = await db.query<Account>(
      `INSERT INTO accounts (name) VALUES ($1) RETURNING ${COLUMNS}`,
      [name],
    );
    return rows[0]!;
  },

  async findById(db: Queryable, id: string): Promise<Account | null> {
    const { rows } = await db.query<Account>(`SELECT ${COLUMNS} FROM accounts WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  /**
   * Reads the account and takes a row-level write lock until the surrounding
   * transaction ends. Concurrent writers to the same account queue up here,
   * so balance checks and updates can't interleave (no lost updates, no
   * double-spend). Must be called inside withTransaction().
   */
  async findByIdForUpdate(db: Queryable, id: string): Promise<Account | null> {
    const { rows } = await db.query<Account>(
      `SELECT ${COLUMNS} FROM accounts WHERE id = $1 FOR UPDATE`,
      [id],
    );
    return rows[0] ?? null;
  },

  /** Applies a signed delta and returns the new balance. */
  async adjustBalance(db: Queryable, id: string, delta: number): Promise<number> {
    const { rows } = await db.query<{ balance: number }>(
      "UPDATE accounts SET balance = balance + $2::numeric WHERE id = $1 RETURNING balance",
      [id, String(delta)],
    );
    return rows[0]!.balance;
  },

  async list(
    db: Queryable,
    opts: { limit: number; offset: number; search?: string },
  ): Promise<{ rows: Account[]; total: number }> {
    const where = opts.search ? "WHERE name ILIKE $1" : "";
    const params: unknown[] = opts.search ? [`%${opts.search.replace(/[\\%_]/g, "\\$&")}%`] : [];

    const [list, count] = await Promise.all([
      db.query<Account>(
        `SELECT ${COLUMNS} FROM accounts ${where}
         ORDER BY created_at DESC, id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, opts.limit, opts.offset],
      ),
      db.query<{ total: number }>(`SELECT COUNT(*) AS total FROM accounts ${where}`, params),
    ]);
    return { rows: list.rows, total: count.rows[0]!.total };
  },
};

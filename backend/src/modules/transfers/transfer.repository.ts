import type { Queryable } from "../../db/pool.js";

export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  reference_id: string;
  created_at: Date;
}

export interface TransferListItem extends Transfer {
  from_account_name: string;
  to_account_name: string;
}

const COLUMNS = "id, from_account_id, to_account_id, amount, description, reference_id, created_at";

export const transferRepository = {
  async insert(
    db: Queryable,
    t: Pick<Transfer, "from_account_id" | "to_account_id" | "amount" | "description" | "reference_id">,
  ): Promise<Transfer> {
    const { rows } = await db.query<Transfer>(
      `INSERT INTO transfers (from_account_id, to_account_id, amount, description, reference_id)
       VALUES ($1, $2, $3::numeric, $4, $5)
       RETURNING ${COLUMNS}`,
      [t.from_account_id, t.to_account_id, String(t.amount), t.description, t.reference_id],
    );
    return rows[0]!;
  },

  async findById(db: Queryable, id: string): Promise<Transfer | null> {
    const { rows } = await db.query<Transfer>(`SELECT ${COLUMNS} FROM transfers WHERE id = $1`, [id]);
    return rows[0] ?? null;
  },

  async findByReference(db: Queryable, fromAccountId: string, referenceId: string): Promise<Transfer | null> {
    const { rows } = await db.query<Transfer>(
      `SELECT ${COLUMNS} FROM transfers WHERE from_account_id = $1 AND reference_id = $2`,
      [fromAccountId, referenceId],
    );
    return rows[0] ?? null;
  },

  async list(
    db: Queryable,
    opts: { accountId?: string; limit: number; offset: number },
  ): Promise<{ rows: TransferListItem[]; total: number }> {
    const params: unknown[] = [];
    let where = "";
    if (opts.accountId) {
      params.push(opts.accountId);
      where = "WHERE t.from_account_id = $1 OR t.to_account_id = $1";
    }
    const [list, count] = await Promise.all([
      db.query<TransferListItem>(
        `SELECT t.id, t.from_account_id, t.to_account_id, t.amount, t.description,
                t.reference_id, t.created_at,
                fa.name AS from_account_name, ta.name AS to_account_name
           FROM transfers t
           JOIN accounts fa ON fa.id = t.from_account_id
           JOIN accounts ta ON ta.id = t.to_account_id
           ${where}
          ORDER BY t.created_at DESC, t.id DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, opts.limit, opts.offset],
      ),
      db.query<{ total: number }>(`SELECT COUNT(*) AS total FROM transfers t ${where}`, params),
    ]);
    return { rows: list.rows, total: count.rows[0]!.total };
  },
};

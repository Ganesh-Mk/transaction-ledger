import { describe, expect, it } from "vitest";
import { pool } from "../src/db/pool.js";
import { api, balanceOf, createAccount, postTx } from "./helpers.js";

const UNKNOWN_ID = "7d1e3a52-2c3f-4b8e-9a51-0e2b8d0c4f11";

describe("POST /api/accounts/:id/transactions", () => {
  it("credit increases the balance (100 + 50 = 150)", async () => {
    const id = await createAccount();
    await postTx(id, { type: "credit", amount: 100 }).expect(201);
    const res = await postTx(id, { type: "credit", amount: 50, description: "top-up" }).expect(201);

    expect(res.body.data).toMatchObject({
      account_id: id,
      type: "credit",
      amount: 50,
      description: "top-up",
      balance_after: 150,
    });
    expect(await balanceOf(id)).toBe(150);
  });

  it("debit decreases the balance (100 - 30 = 70)", async () => {
    const id = await createAccount();
    await postTx(id, { type: "credit", amount: 100 }).expect(201);
    await postTx(id, { type: "debit", amount: 30 }).expect(201);
    expect(await balanceOf(id)).toBe(70);
  });

  it("rejects a debit larger than the balance and leaves the balance unchanged", async () => {
    const id = await createAccount();
    await postTx(id, { type: "credit", amount: 100 }).expect(201);

    const res = await postTx(id, { type: "debit", amount: 150 }).expect(422);
    expect(res.body.error).toMatchObject({
      code: "INSUFFICIENT_BALANCE",
      details: { balance: 100, requested_amount: 150 },
    });
    expect(await balanceOf(id)).toBe(100);

    const history = await api().get(`/api/accounts/${id}/transactions`).expect(200);
    expect(history.body.pagination.total_records).toBe(1); // rejected debit was not recorded
  });

  it("allows debiting the exact balance down to zero", async () => {
    const id = await createAccount();
    await postTx(id, { type: "credit", amount: 75.25 }).expect(201);
    await postTx(id, { type: "debit", amount: 75.25 }).expect(201);
    expect(await balanceOf(id)).toBe(0);
  });

  it("keeps the balance equal to the sum of valid transactions (spec example -> 100)", async () => {
    const id = await createAccount();
    await postTx(id, { type: "credit", amount: 100 }).expect(201);
    await postTx(id, { type: "credit", amount: 50 }).expect(201);
    await postTx(id, { type: "debit", amount: 30 }).expect(201);
    await postTx(id, { type: "debit", amount: 20 }).expect(201);
    await postTx(id, { type: "debit", amount: 1000 }).expect(422); // rejected: no effect
    expect(await balanceOf(id)).toBe(100);

    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) AS net
         FROM transactions WHERE account_id = $1`,
      [id],
    );
    expect(rows[0].net).toBe(100);
  });

  it("handles decimal amounts exactly (no float drift)", async () => {
    const id = await createAccount();
    await postTx(id, { type: "credit", amount: 0.1 }).expect(201);
    await postTx(id, { type: "credit", amount: 0.2 }).expect(201);
    expect(await balanceOf(id)).toBe(0.3);
  });

  describe("duplicate reference_id", () => {
    it("returns 409 with the original transaction and does not change the balance", async () => {
      const id = await createAccount();
      const first = await postTx(id, { type: "credit", amount: 100, reference_id: "INV-1" }).expect(201);

      const dup = await postTx(id, { type: "credit", amount: 100, reference_id: "INV-1" }).expect(409);
      expect(dup.body.error.code).toBe("DUPLICATE_TRANSACTION");
      expect(dup.body.error.details.existing_transaction.id).toBe(first.body.data.id);
      expect(await balanceOf(id)).toBe(100);
    });

    it("reports duplicate (not insufficient balance) when a debit is retried", async () => {
      const id = await createAccount();
      await postTx(id, { type: "credit", amount: 100 }).expect(201);
      await postTx(id, { type: "debit", amount: 100, reference_id: "PAY-1" }).expect(201);
      const retry = await postTx(id, { type: "debit", amount: 100, reference_id: "PAY-1" }).expect(409);
      expect(retry.body.error.code).toBe("DUPLICATE_TRANSACTION");
      expect(await balanceOf(id)).toBe(0);
    });

    it("allows the same reference_id on different accounts", async () => {
      const a = await createAccount("A");
      const b = await createAccount("B");
      await postTx(a, { type: "credit", amount: 10, reference_id: "SHARED" }).expect(201);
      await postTx(b, { type: "credit", amount: 20, reference_id: "SHARED" }).expect(201);
      expect(await balanceOf(a)).toBe(10);
      expect(await balanceOf(b)).toBe(20);
    });
  });

  describe("validation", () => {
    it.each([
      [{ type: "refund", amount: 10 }, "INVALID_TRANSACTION_TYPE"],
      [{ type: undefined, amount: 10 }, "INVALID_TRANSACTION_TYPE"],
      [{ type: "credit", amount: 0 }, "INVALID_AMOUNT"],
      [{ type: "credit", amount: -5 }, "INVALID_AMOUNT"],
      [{ type: "credit", amount: "10" }, "INVALID_AMOUNT"],
      [{ type: "credit", amount: 10.123 }, "INVALID_AMOUNT"],
      [{ type: "credit", amount: 1e16 }, "INVALID_AMOUNT"],
      [{ type: "credit", amount: 10, reference_id: "" }, "VALIDATION_ERROR"],
      [{ type: "credit", amount: 10, reference_id: "   " }, "VALIDATION_ERROR"],
      [{ type: "credit", amount: 10, extra: true }, "VALIDATION_ERROR"],
    ])("rejects %j with %s", async (body, code) => {
      const id = await createAccount();
      const res = await postTx(id, body as never).expect(400);
      expect(res.body.error.code).toBe(code);
      expect(await balanceOf(id)).toBe(0);
    });

    it("requires reference_id", async () => {
      const id = await createAccount();
      const res = await api()
        .post(`/api/accounts/${id}/transactions`)
        .send({ type: "credit", amount: 10 })
        .expect(400);
      expect(res.body.error.details[0].field).toBe("reference_id");
    });

    it("returns 404 when the account does not exist", async () => {
      const res = await postTx(UNKNOWN_ID, { type: "credit", amount: 10 }).expect(404);
      expect(res.body.error.code).toBe("ACCOUNT_NOT_FOUND");
    });

    it("returns 400 for a malformed account id", async () => {
      const res = await postTx("123", { type: "credit", amount: 10 }).expect(400);
      expect(res.body.error.code).toBe("INVALID_ACCOUNT_ID");
    });
  });
});

describe("concurrency", () => {
  it("never overdraws under parallel debits (row lock serialises them)", async () => {
    const id = await createAccount();
    await postTx(id, { type: "credit", amount: 100 }).expect(201);

    // 25 concurrent debits of 10 against a balance of 100: exactly 10 may succeed.
    const results = await Promise.all(Array.from({ length: 25 }, () => postTx(id, { type: "debit", amount: 10 })));
    const statuses = results.map((r) => r.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(10);
    expect(statuses.filter((s) => s === 422)).toHaveLength(15);
    expect(await balanceOf(id)).toBe(0);
  });

  it("creates exactly one transaction when the same reference_id is sent concurrently", async () => {
    const id = await createAccount();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => postTx(id, { type: "credit", amount: 5, reference_id: "SAME" })),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(9);
    expect(await balanceOf(id)).toBe(5);
  });
});

describe("immutability", () => {
  it("rejects PUT/PATCH/DELETE on transactions with 405", async () => {
    const id = await createAccount();
    const tx = await postTx(id, { type: "credit", amount: 10 }).expect(201);
    const url = `/api/accounts/${id}/transactions/${tx.body.data.id}`;

    for (const method of ["put", "patch", "delete"] as const) {
      const res = await api()[method](url).send({ amount: 999 }).expect(405);
      expect(res.body.error.code).toBe("METHOD_NOT_ALLOWED");
      expect(res.headers.allow).toBe("GET");
    }
    const after = await api().get(url).expect(200);
    expect(after.body.data.amount).toBe(10);
  });

  it("is enforced by the database even outside the API", async () => {
    const id = await createAccount();
    const tx = await postTx(id, { type: "credit", amount: 10 }).expect(201);
    await expect(pool.query("UPDATE transactions SET amount = 1 WHERE id = $1", [tx.body.data.id])).rejects.toThrow(
      /immutable/,
    );
    await expect(pool.query("DELETE FROM transactions WHERE id = $1", [tx.body.data.id])).rejects.toThrow(/immutable/);
  });

  it("the database refuses a negative balance even if application checks were bypassed", async () => {
    const id = await createAccount();
    await expect(pool.query("UPDATE accounts SET balance = -1 WHERE id = $1", [id])).rejects.toThrow(
      /accounts_balance_non_negative/,
    );
  });
});

describe("GET /api/accounts/:id/transactions", () => {
  async function seed() {
    const id = await createAccount();
    // 3 credits then 2 debits, inserted in a known order
    for (const [type, amount, ref] of [
      ["credit", 100, "c1"],
      ["credit", 50, "c2"],
      ["debit", 30, "d1"],
      ["credit", 25, "c3"],
      ["debit", 20, "d2"],
    ] as const) {
      await postTx(id, { type, amount, reference_id: ref }).expect(201);
    }
    return id;
  }

  it("returns all transactions latest first", async () => {
    const id = await seed();
    const res = await api().get(`/api/accounts/${id}/transactions`).expect(200);
    expect(res.body.data.map((t: { reference_id: string }) => t.reference_id)).toEqual(["d2", "c3", "d1", "c2", "c1"]);
    const times = res.body.data.map((t: { created_at: string }) => Date.parse(t.created_at));
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("filters by type", async () => {
    const id = await seed();
    const credits = await api().get(`/api/accounts/${id}/transactions?type=credit`).expect(200);
    expect(credits.body.data.every((t: { type: string }) => t.type === "credit")).toBe(true);
    expect(credits.body.pagination.total_records).toBe(3);
    expect(credits.body.filters).toEqual({ type: "credit" });

    const debits = await api().get(`/api/accounts/${id}/transactions?type=debit`).expect(200);
    expect(debits.body.data.map((t: { reference_id: string }) => t.reference_id)).toEqual(["d2", "d1"]);
  });

  it("paginates with full metadata", async () => {
    const id = await seed();
    const p1 = await api().get(`/api/accounts/${id}/transactions?page=1&limit=2`).expect(200);
    expect(p1.body.pagination).toEqual({
      page: 1,
      limit: 2,
      total_records: 5,
      total_pages: 3,
      has_next_page: true,
      has_previous_page: false,
    });
    const p3 = await api().get(`/api/accounts/${id}/transactions?page=3&limit=2`).expect(200);
    expect(p3.body.data.map((t: { reference_id: string }) => t.reference_id)).toEqual(["c1"]);
    expect(p3.body.pagination.has_next_page).toBe(false);

    const beyond = await api().get(`/api/accounts/${id}/transactions?page=9&limit=2`).expect(200);
    expect(beyond.body.data).toEqual([]);
  });

  it.each(["page=0", "page=-1", "page=abc", "page=1.5", "limit=0", "limit=101", "limit=x"])(
    "rejects invalid pagination (%s)",
    async (qs) => {
      const id = await createAccount();
      const res = await api().get(`/api/accounts/${id}/transactions?${qs}`).expect(400);
      expect(res.body.error.code).toBe("INVALID_PAGINATION");
    },
  );

  it("rejects an invalid type filter", async () => {
    const id = await createAccount();
    const res = await api().get(`/api/accounts/${id}/transactions?type=refund`).expect(400);
    expect(res.body.error.code).toBe("INVALID_TRANSACTION_TYPE");
  });

  it("returns 404 for an unknown account", async () => {
    const res = await api().get(`/api/accounts/${UNKNOWN_ID}/transactions`).expect(404);
    expect(res.body.error.code).toBe("ACCOUNT_NOT_FOUND");
  });
});

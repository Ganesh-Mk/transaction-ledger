import { describe, expect, it } from "vitest";
import { api, balanceOf, createAccount, postTx } from "./helpers.js";

async function fundedPair(a = 100, b = 50) {
  const from = await createAccount("A");
  const to = await createAccount("B");
  if (a) await postTx(from, { type: "credit", amount: a }).expect(201);
  if (b) await postTx(to, { type: "credit", amount: b }).expect(201);
  return { from, to };
}

const transfer = (body: Record<string, unknown>) =>
  api()
    .post("/api/transfers")
    .send({ reference_id: `TRF-${Math.random()}`, ...body });

describe("POST /api/transfers", () => {
  it("moves money atomically (A 100 -> 70, B 50 -> 80)", async () => {
    const { from, to } = await fundedPair();
    const res = await transfer({ from_account_id: from, to_account_id: to, amount: 30 }).expect(201);

    expect(res.body.data.balances).toEqual({
      from_account: { account_id: from, balance: 70 },
      to_account: { account_id: to, balance: 80 },
    });
    expect(await balanceOf(from)).toBe(70);
    expect(await balanceOf(to)).toBe(80);

    // Both legs are in each account's history, linked by transfer_id.
    const fromHist = await api().get(`/api/accounts/${from}/transactions?type=debit`).expect(200);
    const toHist = await api().get(`/api/accounts/${to}/transactions?type=credit`).expect(200);
    expect(fromHist.body.data[0]).toMatchObject({ amount: 30, transfer_id: res.body.data.id });
    expect(toHist.body.data[0]).toMatchObject({ amount: 30, transfer_id: res.body.data.id });
  });

  it("rejects insufficient balance and changes neither account", async () => {
    const { from, to } = await fundedPair(20, 50);
    const res = await transfer({ from_account_id: from, to_account_id: to, amount: 30 }).expect(422);
    expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");
    expect(await balanceOf(from)).toBe(20);
    expect(await balanceOf(to)).toBe(50);
  });

  it("returns 404 when either account is missing, with no partial effect", async () => {
    const { from } = await fundedPair();
    const res = await transfer({
      from_account_id: from,
      to_account_id: "7d1e3a52-2c3f-4b8e-9a51-0e2b8d0c4f11",
      amount: 10,
    }).expect(404);
    expect(res.body.error.code).toBe("ACCOUNT_NOT_FOUND");
    expect(await balanceOf(from)).toBe(100);
  });

  it("rejects transferring to the same account", async () => {
    const { from } = await fundedPair();
    const res = await transfer({ from_account_id: from, to_account_id: from, amount: 10 }).expect(400);
    expect(res.body.error.code).toBe("SAME_ACCOUNT_TRANSFER");
  });

  it("is idempotent per source account reference_id", async () => {
    const { from, to } = await fundedPair();
    const body = { from_account_id: from, to_account_id: to, amount: 10, reference_id: "RENT-OCT" };
    await transfer(body).expect(201);
    const dup = await transfer(body).expect(409);
    expect(dup.body.error.code).toBe("DUPLICATE_TRANSFER");
    expect(await balanceOf(from)).toBe(90);
    expect(await balanceOf(to)).toBe(60);
  });

  it("validates the payload", async () => {
    const res = await api().post("/api/transfers").send({ from_account_id: "x", amount: -1 }).expect(400);
    expect(res.body.error.code).toBe("INVALID_ACCOUNT_ID");
    expect(res.body.error.details.length).toBeGreaterThan(1);
  });

  it("does not deadlock or lose money with concurrent opposite-direction transfers", async () => {
    const { from: a, to: b } = await fundedPair(500, 500);
    const jobs = Array.from({ length: 20 }, (_, i) =>
      i % 2 === 0
        ? transfer({ from_account_id: a, to_account_id: b, amount: 7 })
        : transfer({ from_account_id: b, to_account_id: a, amount: 3 }),
    );
    const results = await Promise.all(jobs);
    expect(results.every((r) => r.status === 201)).toBe(true);
    // a: 500 - 10*7 + 10*3 = 460 ; b: 500 + 70 - 30 = 540 ; total conserved
    expect(await balanceOf(a)).toBe(460);
    expect(await balanceOf(b)).toBe(540);
  });
});

describe("GET /api/transfers", () => {
  it("lists transfers with account names, filterable by account", async () => {
    const { from, to } = await fundedPair();
    const other = await createAccount("C");
    await transfer({ from_account_id: from, to_account_id: to, amount: 5 }).expect(201);
    await transfer({ from_account_id: from, to_account_id: other, amount: 5 }).expect(201);

    const all = await api().get("/api/transfers").expect(200);
    expect(all.body.pagination.total_records).toBe(2);
    expect(all.body.data[0]).toMatchObject({ from_account_name: "A", to_account_name: "C" });

    const forTo = await api().get(`/api/transfers?account_id=${to}`).expect(200);
    expect(forTo.body.pagination.total_records).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { api, createAccount } from "./helpers.js";

describe("POST /api/accounts", () => {
  it("creates an account with a zero balance and server-generated id/created_at", async () => {
    const res = await api().post("/api/accounts").send({ name: "  Ganesh  " }).expect(201);

    expect(res.body.data).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: "Ganesh",
      balance: 0,
      created_at: expect.any(String),
    });
    expect(res.headers.location).toBe(`/api/accounts/${res.body.data.id}`);
  });

  it("generates unique ids", async () => {
    const [a, b] = await Promise.all([createAccount("A"), createAccount("B")]);
    expect(a).not.toBe(b);
  });

  it("rejects a client-supplied balance", async () => {
    const res = await api().post("/api/accounts").send({ name: "Rich", balance: 1_000_000 }).expect(400);
    expect(res.body.error.code).toBe("BALANCE_NOT_ALLOWED");
  });

  it("rejects a client-supplied id (ids are server-generated)", async () => {
    const res = await api()
      .post("/api/accounts")
      .send({ name: "X", id: "00000000-0000-4000-8000-000000000000" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    [{}, "missing"],
    [{ name: "" }, "empty"],
    [{ name: "   " }, "blank"],
    [{ name: 42 }, "non-string"],
    [{ name: "x".repeat(101) }, "too long"],
  ])("rejects a %s name (%s)", async (body) => {
    const res = await api().post("/api/accounts").send(body).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details[0].field).toBe("name");
  });

  it("rejects malformed JSON with a consistent error envelope", async () => {
    const res = await api()
      .post("/api/accounts")
      .set("content-type", "application/json")
      .send("{not json")
      .expect(400);
    expect(res.body.error).toMatchObject({ code: "INVALID_JSON", request_id: expect.any(String) });
  });

  it("rejects a non-object body", async () => {
    const res = await api().post("/api/accounts").send([{ name: "x" }]).expect(400);
    expect(res.body.error.code).toBe("INVALID_REQUEST_BODY");
  });
});

describe("GET /api/accounts/:id/balance", () => {
  it("returns account_id and balance", async () => {
    const id = await createAccount();
    const res = await api().get(`/api/accounts/${id}/balance`).expect(200);
    expect(res.body.data).toMatchObject({ account_id: id, balance: 0 });
  });

  it("returns 404 for an unknown account", async () => {
    const res = await api().get("/api/accounts/7d1e3a52-2c3f-4b8e-9a51-0e2b8d0c4f11/balance").expect(404);
    expect(res.body.error.code).toBe("ACCOUNT_NOT_FOUND");
  });

  it("returns 400 for a malformed account id", async () => {
    const res = await api().get("/api/accounts/not-a-uuid/balance").expect(400);
    expect(res.body.error.code).toBe("INVALID_ACCOUNT_ID");
  });
});

describe("GET /api/accounts", () => {
  it("lists accounts newest first with pagination metadata", async () => {
    for (const name of ["first", "second", "third"]) await createAccount(name);
    const res = await api().get("/api/accounts?page=1&limit=2").expect(200);
    expect(res.body.data.map((a: { name: string }) => a.name)).toEqual(["third", "second"]);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total_records: 3, total_pages: 2 });
  });

  it("filters by name", async () => {
    await createAccount("Alice");
    await createAccount("Bob");
    const res = await api().get("/api/accounts?search=ali").expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Alice");
  });
});

describe("unknown routes", () => {
  it("returns a 404 in the standard envelope", async () => {
    const res = await api().get("/api/nope").expect(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});

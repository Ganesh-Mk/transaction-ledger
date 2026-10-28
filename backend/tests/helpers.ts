import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();
export const api = () => request(app);

export async function createAccount(name = "Test User"): Promise<string> {
  const res = await api().post("/api/accounts").send({ name }).expect(201);
  return res.body.data.id;
}

let refCounter = 0;
export const nextRef = () => `ref-${++refCounter}`;

export function postTx(
  accountId: string,
  body: { type: string; amount: unknown; reference_id?: string; description?: string },
) {
  return api()
    .post(`/api/accounts/${accountId}/transactions`)
    .send({ reference_id: nextRef(), ...body });
}

export async function balanceOf(accountId: string): Promise<number> {
  const res = await api().get(`/api/accounts/${accountId}/balance`).expect(200);
  return res.body.data.balance;
}

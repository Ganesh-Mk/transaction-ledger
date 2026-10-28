import { Router } from "express";
import { AppError } from "../../errors/AppError.js";
import { AccountIdParams } from "../../lib/schemas.js";
import { parseOrThrow } from "../../lib/validation.js";
import { CreateAccountBody, ListAccountsQuery } from "./account.schemas.js";
import { accountService } from "./account.service.js";

export const accountRouter = Router();

accountRouter.post("/", async (req, res) => {
  // Explicit, friendly rejection for the most likely misuse of this endpoint.
  if (req.body && typeof req.body === "object" && "balance" in req.body) {
    throw new AppError(
      400,
      "BALANCE_NOT_ALLOWED",
      "balance cannot be set by the client; new accounts always start with a balance of 0",
      [{ field: "balance", message: "field is not allowed" }],
    );
  }
  const { name } = parseOrThrow(CreateAccountBody, req.body);
  const account = await accountService.create(name);
  res.status(201).location(`/api/accounts/${account.id}`).json({ data: account });
});

accountRouter.get("/", async (req, res) => {
  const { page, limit, search } = parseOrThrow(ListAccountsQuery, req.query);
  res.json(await accountService.list(page, limit, search));
});

accountRouter.get("/:accountId", async (req, res) => {
  const { accountId } = parseOrThrow(AccountIdParams, req.params);
  res.json({ data: await accountService.get(accountId) });
});

accountRouter.get("/:accountId/balance", async (req, res) => {
  const { accountId } = parseOrThrow(AccountIdParams, req.params);
  res.json({ data: await accountService.getBalance(accountId) });
});

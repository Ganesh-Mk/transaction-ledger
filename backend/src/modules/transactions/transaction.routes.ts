import { Router } from "express";
import { methodNotAllowed } from "../../middleware/methodNotAllowed.js";
import { AccountIdParams } from "../../lib/schemas.js";
import { parseOrThrow } from "../../lib/validation.js";
import {
  CreateTransactionBody,
  TransactionHistoryQuery,
  TransactionParams,
} from "./transaction.schemas.js";
import { transactionService } from "./transaction.service.js";

// Mounted at /api/accounts/:accountId/transactions
export const transactionRouter = Router({ mergeParams: true });

const IMMUTABLE = "Transactions are immutable: they cannot be edited or deleted once created";

transactionRouter
  .route("/")
  .post(async (req, res) => {
    const { accountId } = parseOrThrow(AccountIdParams, req.params);
    const input = parseOrThrow(CreateTransactionBody, req.body);
    const transaction = await transactionService.create(accountId, input);
    res.status(201).json({ data: transaction });
  })
  .get(async (req, res) => {
    const { accountId } = parseOrThrow(AccountIdParams, req.params);
    const { page, limit, type } = parseOrThrow(TransactionHistoryQuery, req.query);
    res.json(await transactionService.history(accountId, page, limit, type));
  })
  .all(methodNotAllowed(["GET", "POST"], IMMUTABLE));

transactionRouter
  .route("/:transactionId")
  .get(async (req, res) => {
    const { accountId, transactionId } = parseOrThrow(TransactionParams, req.params);
    res.json({ data: await transactionService.get(accountId, transactionId) });
  })
  // No PUT / PATCH / DELETE exists for a ledger entry; say so explicitly.
  .all(methodNotAllowed(["GET"], IMMUTABLE));

import { pool, withTransaction } from "../../db/pool.js";
import { AppError, Errors } from "../../errors/AppError.js";
import { offsetFor, paginate } from "../../lib/pagination.js";
import { isPgError, PG } from "../../lib/pgErrors.js";
import { accountRepository } from "../accounts/account.repository.js";
import {
  transactionRepository,
  type Transaction,
  type TransactionType,
} from "./transaction.repository.js";
import type { CreateTransactionInput } from "./transaction.schemas.js";

function duplicateError(existing: Transaction | null, accountId: string, referenceId: string) {
  return new AppError(
    409,
    "DUPLICATE_TRANSACTION",
    `A transaction with reference_id '${referenceId}' already exists for this account`,
    { account_id: accountId, reference_id: referenceId, existing_transaction: existing },
  );
}

export const transactionService = {
  /**
   * Records a credit/debit and updates the balance as ONE database transaction:
   *
   *   BEGIN
   *     SELECT ... FROM accounts WHERE id = $1 FOR UPDATE   -- lock the account row
   *     reject if reference_id already used                -- idempotency
   *     reject debit if balance < amount                    -- no overdraft
   *     UPDATE accounts SET balance = balance ± amount
   *     INSERT INTO transactions (...)
   *   COMMIT   (any error -> ROLLBACK, nothing is persisted)
   *
   * The row lock serialises concurrent writes to the same account, so two
   * simultaneous debits can't both pass the balance check.
   */
  async create(accountId: string, input: CreateTransactionInput): Promise<Transaction> {
    try {
      return await withTransaction(async (client) => {
        const account = await accountRepository.findByIdForUpdate(client, accountId);
        if (!account) throw Errors.accountNotFound(accountId);

        // Checked before the balance rule: a retried debit whose original
        // already went through must report "duplicate", not "insufficient".
        const existing = await transactionRepository.findByReference(client, accountId, input.reference_id);
        if (existing) throw duplicateError(existing, accountId, input.reference_id);

        if (input.type === "debit" && account.balance < input.amount) {
          throw Errors.insufficientBalance(accountId, account.balance, input.amount);
        }

        const delta = input.type === "credit" ? input.amount : -input.amount;
        const balanceAfter = await accountRepository.adjustBalance(client, accountId, delta);

        return transactionRepository.insert(client, {
          account_id: accountId,
          type: input.type,
          amount: input.amount,
          description: input.description,
          reference_id: input.reference_id,
          balance_after: balanceAfter,
        });
      });
    } catch (err) {
      // Safety nets in case a constraint is hit despite the checks above.
      if (isPgError(err, PG.UNIQUE_VIOLATION, "transactions_account_reference_uq")) {
        const existing = await transactionRepository.findByReference(pool, accountId, input.reference_id);
        throw duplicateError(existing, accountId, input.reference_id);
      }
      if (isPgError(err, PG.CHECK_VIOLATION, "accounts_balance_non_negative")) {
        const account = await accountRepository.findById(pool, accountId);
        throw Errors.insufficientBalance(accountId, account?.balance ?? 0, input.amount);
      }
      throw err;
    }
  },

  async get(accountId: string, transactionId: string): Promise<Transaction> {
    const account = await accountRepository.findById(pool, accountId);
    if (!account) throw Errors.accountNotFound(accountId);
    const transaction = await transactionRepository.findById(pool, accountId, transactionId);
    if (!transaction) {
      throw new AppError(404, "TRANSACTION_NOT_FOUND", `Transaction '${transactionId}' was not found`, {
        account_id: accountId,
        transaction_id: transactionId,
      });
    }
    return transaction;
  },

  async history(accountId: string, page: number, limit: number, type?: TransactionType) {
    const account = await accountRepository.findById(pool, accountId);
    if (!account) throw Errors.accountNotFound(accountId);

    const { rows, total } = await transactionRepository.listByAccount(pool, {
      accountId,
      type,
      limit,
      offset: offsetFor(page, limit),
    });
    return { ...paginate(rows, page, limit, total), filters: { type: type ?? null } };
  },
};

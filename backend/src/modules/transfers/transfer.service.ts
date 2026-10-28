import { pool, withTransaction } from "../../db/pool.js";
import { AppError, Errors } from "../../errors/AppError.js";
import { offsetFor, paginate } from "../../lib/pagination.js";
import { isPgError, PG } from "../../lib/pgErrors.js";
import { accountRepository } from "../accounts/account.repository.js";
import { transactionRepository } from "../transactions/transaction.repository.js";
import { transferRepository, type Transfer } from "./transfer.repository.js";
import type { CreateTransferInput } from "./transfer.schemas.js";

function duplicateError(existing: Transfer | null, input: CreateTransferInput) {
  return new AppError(
    409,
    "DUPLICATE_TRANSFER",
    `A transfer with reference_id '${input.reference_id}' already exists for the source account`,
    {
      from_account_id: input.from_account_id,
      reference_id: input.reference_id,
      existing_transfer: existing,
    },
  );
}

export const transferService = {
  /**
   * Moves money between two accounts atomically. One DB transaction:
   *   lock both account rows (always in ascending id order -> no deadlocks
   *   when A->B and B->A run concurrently), check idempotency + balance,
   *   insert the transfer, debit the source, credit the destination.
   * Any failure rolls everything back, so a partial transfer can't exist.
   */
  async create(input: CreateTransferInput) {
    if (input.from_account_id === input.to_account_id) {
      throw new AppError(400, "SAME_ACCOUNT_TRANSFER", "from_account_id and to_account_id must be different", [
        { field: "to_account_id", message: "must differ from from_account_id" },
      ]);
    }

    try {
      return await withTransaction(async (client) => {
        const lockOrder = [input.from_account_id, input.to_account_id].sort();
        const locked = new Map<string, Awaited<ReturnType<typeof accountRepository.findByIdForUpdate>>>();
        for (const id of lockOrder) {
          locked.set(id, await accountRepository.findByIdForUpdate(client, id));
        }

        const source = locked.get(input.from_account_id);
        const destination = locked.get(input.to_account_id);
        if (!source) throw Errors.accountNotFound(input.from_account_id);
        if (!destination) throw Errors.accountNotFound(input.to_account_id);

        const existing = await transferRepository.findByReference(client, source.id, input.reference_id);
        if (existing) throw duplicateError(existing, input);

        if (source.balance < input.amount) {
          throw Errors.insufficientBalance(source.id, source.balance, input.amount);
        }

        const transfer = await transferRepository.insert(client, input);

        // Ledger legs get a system reference derived from the transfer id, so
        // they can never collide with client references on either account.
        const legReference = `transfer:${transfer.id}`;
        const description = input.description ?? null;

        const sourceBalance = await accountRepository.adjustBalance(client, source.id, -input.amount);
        const debit = await transactionRepository.insert(client, {
          account_id: source.id,
          type: "debit",
          amount: input.amount,
          description: description ?? `Transfer to ${destination.name}`,
          reference_id: legReference,
          balance_after: sourceBalance,
          transfer_id: transfer.id,
        });

        const destinationBalance = await accountRepository.adjustBalance(client, destination.id, input.amount);
        const credit = await transactionRepository.insert(client, {
          account_id: destination.id,
          type: "credit",
          amount: input.amount,
          description: description ?? `Transfer from ${source.name}`,
          reference_id: legReference,
          balance_after: destinationBalance,
          transfer_id: transfer.id,
        });

        return {
          ...transfer,
          transactions: { debit, credit },
          balances: {
            from_account: { account_id: source.id, balance: sourceBalance },
            to_account: { account_id: destination.id, balance: destinationBalance },
          },
        };
      });
    } catch (err) {
      if (isPgError(err, PG.UNIQUE_VIOLATION, "transfers_source_reference_uq")) {
        const existing = await transferRepository.findByReference(pool, input.from_account_id, input.reference_id);
        throw duplicateError(existing, input);
      }
      if (isPgError(err, PG.CHECK_VIOLATION, "accounts_balance_non_negative")) {
        const account = await accountRepository.findById(pool, input.from_account_id);
        throw Errors.insufficientBalance(input.from_account_id, account?.balance ?? 0, input.amount);
      }
      throw err;
    }
  },

  async get(id: string): Promise<Transfer> {
    const transfer = await transferRepository.findById(pool, id);
    if (!transfer) {
      throw new AppError(404, "TRANSFER_NOT_FOUND", `Transfer '${id}' was not found`, { transfer_id: id });
    }
    return transfer;
  },

  async list(page: number, limit: number, accountId?: string) {
    const { rows, total } = await transferRepository.list(pool, {
      accountId,
      limit,
      offset: offsetFor(page, limit),
    });
    return paginate(rows, page, limit, total);
  },
};

import { pool } from "../../db/pool.js";
import { Errors } from "../../errors/AppError.js";
import { offsetFor, paginate } from "../../lib/pagination.js";
import { accountRepository, type Account } from "./account.repository.js";

export const accountService = {
  create(name: string): Promise<Account> {
    return accountRepository.insert(pool, name);
  },

  async get(id: string): Promise<Account> {
    const account = await accountRepository.findById(pool, id);
    if (!account) throw Errors.accountNotFound(id);
    return account;
  },

  async getBalance(id: string) {
    const account = await this.get(id);
    return { account_id: account.id, name: account.name, balance: account.balance };
  },

  async list(page: number, limit: number, search?: string) {
    const { rows, total } = await accountRepository.list(pool, {
      limit,
      offset: offsetFor(page, limit),
      search: search || undefined,
    });
    return paginate(rows, page, limit, total);
  },
};

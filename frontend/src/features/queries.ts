import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, NetworkError } from "@/lib/api";
import type { TransactionType } from "@/lib/types";

export const qk = {
  stats: ["stats"] as const,
  accounts: (p: object) => ["accounts", p] as const,
  account: (id: string) => ["account", id] as const,
  transactions: (id: string, p: object) => ["transactions", id, p] as const,
  transfers: (p: object) => ["transfers", p] as const,
};

export const useStats = () => useQuery({ queryKey: qk.stats, queryFn: api.stats });

export const useAccounts = (p: { page: number; limit: number; search?: string }) =>
  useQuery({ queryKey: qk.accounts(p), queryFn: () => api.listAccounts(p), placeholderData: keepPreviousData });

export const useAccount = (id: string) =>
  useQuery({ queryKey: qk.account(id), queryFn: () => api.getAccount(id), retry: false });

export const useTransactions = (id: string, p: { page: number; limit: number; type?: TransactionType }) =>
  useQuery({
    queryKey: qk.transactions(id, p),
    queryFn: () => api.listTransactions(id, p),
    placeholderData: keepPreviousData,
  });

export const useTransfers = (p: { page: number; limit: number; account_id?: string }) =>
  useQuery({ queryKey: qk.transfers(p), queryFn: () => api.listTransfers(p), placeholderData: keepPreviousData });

/** After any write, refresh everything that shows balances or history. */
export function useInvalidateLedger() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["stats"] }),
      qc.invalidateQueries({ queryKey: ["accounts"] }),
      qc.invalidateQueries({ queryKey: ["account"] }),
      qc.invalidateQueries({ queryKey: ["transactions"] }),
      qc.invalidateQueries({ queryKey: ["transfers"] }),
    ]);
}

const TITLES: Record<string, string> = {
  INSUFFICIENT_BALANCE: "Insufficient balance",
  DUPLICATE_TRANSACTION: "Duplicate transaction",
  DUPLICATE_TRANSFER: "Duplicate transfer",
  ACCOUNT_NOT_FOUND: "Account not found",
  SAME_ACCOUNT_TRANSFER: "Choose two different accounts",
  INVALID_AMOUNT: "Invalid amount",
  INVALID_TRANSACTION_TYPE: "Invalid transaction type",
};

/** Turns any thrown error into toast-ready copy. */
export function describeError(err: unknown): { title: string; description: string; code?: string } {
  if (err instanceof ApiError) {
    return { title: TITLES[err.code] ?? "Request failed", description: err.message, code: err.code };
  }
  if (err instanceof NetworkError) {
    return { title: "Can't reach the server", description: "It may be waking up. Try again in a few seconds." };
  }
  return { title: "Something went wrong", description: err instanceof Error ? err.message : String(err) };
}

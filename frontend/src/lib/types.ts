export type TransactionType = "credit" | "debit";

export interface Account {
  id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface Balance {
  account_id: string;
  name: string;
  balance: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  reference_id: string;
  balance_after: number;
  transfer_id: string | null;
  created_at: string;
}

export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string | null;
  reference_id: string;
  created_at: string;
}

export interface TransferListItem extends Transfer {
  from_account_name: string;
  to_account_name: string;
}

export interface TransferResult extends Transfer {
  balances: {
    from_account: { account_id: string; balance: number };
    to_account: { account_id: string; balance: number };
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface Page<T> {
  data: T[];
  pagination: Pagination;
}

export interface Stats {
  total_accounts: number;
  total_balance: number;
  total_transactions: number;
  total_credited: number;
  total_debited: number;
  total_transfers: number;
}

export interface Health {
  status: "ok" | "degraded";
  database: "up" | "down";
  db_latency_ms?: number;
  uptime_seconds: number;
}

/**
 * Machine-readable error codes. Clients should branch on `code`, never on
 * `message` (messages are for humans and may change).
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_REQUEST_BODY"
  | "INVALID_JSON"
  | "INVALID_ACCOUNT_ID"
  | "INVALID_TRANSACTION_ID"
  | "INVALID_TRANSFER_ID"
  | "INVALID_TRANSACTION_TYPE"
  | "INVALID_AMOUNT"
  | "INVALID_PAGINATION"
  | "BALANCE_NOT_ALLOWED"
  | "SAME_ACCOUNT_TRANSFER"
  | "ACCOUNT_NOT_FOUND"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSFER_NOT_FOUND"
  | "ROUTE_NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "DUPLICATE_TRANSACTION"
  | "DUPLICATE_TRANSFER"
  | "INSUFFICIENT_BALANCE"
  | "PAYLOAD_TOO_LARGE"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  accountNotFound: (accountId: string) =>
    new AppError(404, "ACCOUNT_NOT_FOUND", `Account '${accountId}' was not found`, {
      account_id: accountId,
    }),

  insufficientBalance: (accountId: string, balance: number, requested: number) =>
    new AppError(
      422,
      "INSUFFICIENT_BALANCE",
      `Insufficient balance: available ${balance.toFixed(2)}, requested ${requested.toFixed(2)}`,
      { account_id: accountId, balance, requested_amount: requested },
    ),
};

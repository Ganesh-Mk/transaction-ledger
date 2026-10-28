import type { z } from "zod";
import { AppError, type ErrorCode } from "../errors/AppError.js";

/**
 * Fields whose failures get a dedicated error code, so clients can tell
 * "bad amount" from "bad type" without parsing messages.
 */
const FIELD_ERROR_CODES: Record<string, ErrorCode> = {
  type: "INVALID_TRANSACTION_TYPE",
  amount: "INVALID_AMOUNT",
  page: "INVALID_PAGINATION",
  limit: "INVALID_PAGINATION",
  accountId: "INVALID_ACCOUNT_ID",
  transactionId: "INVALID_TRANSACTION_ID",
  transferId: "INVALID_TRANSFER_ID",
  account_id: "INVALID_ACCOUNT_ID",
  from_account_id: "INVALID_ACCOUNT_ID",
  to_account_id: "INVALID_ACCOUNT_ID",
};

export interface FieldIssue {
  field: string;
  message: string;
}

function toIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.flatMap((issue) => {
    // Unknown fields are reported at the parent path; list each one by name.
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({
        field: [...issue.path, key].join("."),
        message: "unknown field is not allowed",
      }));
    }
    return [{ field: issue.path.length ? issue.path.join(".") : "(root)", message: issue.message }];
  });
}

function pickCode(error: z.ZodError, fallback: ErrorCode): ErrorCode {
  const first = error.issues[0];
  if (!first) return fallback;
  if (first.code === "unrecognized_keys") return "VALIDATION_ERROR";
  // A root-level failure means the payload itself is wrong (e.g. not an object).
  if (first.path.length === 0) return "INVALID_REQUEST_BODY";
  return FIELD_ERROR_CODES[String(first.path[0])] ?? fallback;
}

/** Parses `input` with `schema`, throwing a 400 AppError with per-field details on failure. */
export function parseOrThrow<S extends z.ZodType>(
  schema: S,
  input: unknown,
  fallback: ErrorCode = "VALIDATION_ERROR",
): z.output<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const issues = toIssues(result.error);
  const code = pickCode(result.error, fallback);
  const summary = issues.map((i) => (i.field === "(root)" ? i.message : `${i.field}: ${i.message}`)).join("; ");
  throw new AppError(400, code, summary, issues);
}

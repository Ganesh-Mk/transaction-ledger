import { z } from "zod";

/** Upper bound that fits NUMERIC(15,2) and converts to a JS number exactly. */
export const MAX_AMOUNT = 9_999_999_999_999.99;

export const uuidField = (label: string) => z.uuid({ error: `${label} must be a valid UUID` });

/**
 * A positive money amount with at most 2 decimal places.
 * Accepted as a JSON number; the check on the decimal places runs against the
 * number's shortest string form, so float noise like 0.1 + 0.2 is rejected
 * instead of being silently rounded.
 */
export const amountField = z
  .number({ error: "amount must be a number" })
  .gt(0, { error: "amount must be greater than 0" })
  .max(MAX_AMOUNT, { error: `amount must not exceed ${MAX_AMOUNT}` })
  .refine((n) => /^\d+(\.\d{1,2})?$/.test(String(n)), {
    error: "amount must have at most 2 decimal places",
  });

export const referenceIdField = z
  .string({ error: "reference_id is required and must be a string" })
  .trim()
  .min(1, { error: "reference_id is required" })
  .max(100, { error: "reference_id must be at most 100 characters" });

export const descriptionField = z
  .string({ error: "description must be a string" })
  .trim()
  .max(255, { error: "description must be at most 255 characters" })
  .transform((s) => (s.length ? s : null))
  .nullish()
  .transform((v) => v ?? null);

const positiveIntParam = (label: string, max?: number) => {
  let schema = z.coerce
    .number({ error: `${label} must be a number` })
    .int({ error: `${label} must be an integer` })
    .min(1, { error: `${label} must be at least 1` });
  if (max) schema = schema.max(max, { error: `${label} must be at most ${max}` });
  return schema;
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const paginationQuery = {
  page: positiveIntParam("page").default(1),
  limit: positiveIntParam("limit", MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
};

export const AccountIdParams = z.object({ accountId: uuidField("accountId") });

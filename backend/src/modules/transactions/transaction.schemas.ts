import { z } from "zod";
import {
  AccountIdParams,
  amountField,
  descriptionField,
  paginationQuery,
  referenceIdField,
  uuidField,
} from "../../lib/schemas.js";

export const transactionTypeField = z.enum(["credit", "debit"], {
  error: "type must be either 'credit' or 'debit'",
});

export const CreateTransactionBody = z.strictObject(
  {
    type: transactionTypeField,
    amount: amountField,
    reference_id: referenceIdField,
    description: descriptionField,
  },
  { error: "Request body must be a JSON object" },
);

export const TransactionHistoryQuery = z.object({
  ...paginationQuery,
  type: transactionTypeField.optional(),
});

export const TransactionParams = AccountIdParams.extend({
  transactionId: uuidField("transactionId"),
});

export type CreateTransactionInput = z.output<typeof CreateTransactionBody>;

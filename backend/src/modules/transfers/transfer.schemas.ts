import { z } from "zod";
import {
  amountField,
  descriptionField,
  paginationQuery,
  referenceIdField,
  uuidField,
} from "../../lib/schemas.js";

export const CreateTransferBody = z.strictObject(
  {
    from_account_id: uuidField("from_account_id"),
    to_account_id: uuidField("to_account_id"),
    amount: amountField,
    reference_id: referenceIdField,
    description: descriptionField,
  },
  { error: "Request body must be a JSON object" },
);

export const ListTransfersQuery = z.object({
  ...paginationQuery,
  account_id: uuidField("account_id").optional(),
});

export const TransferIdParams = z.object({ transferId: uuidField("transferId") });

export type CreateTransferInput = z.output<typeof CreateTransferBody>;

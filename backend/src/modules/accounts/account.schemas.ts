import { z } from "zod";
import { paginationQuery } from "../../lib/schemas.js";

export const CreateAccountBody = z.strictObject(
  {
    name: z
      .string({ error: "name is required and must be a string" })
      .trim()
      .min(1, { error: "name is required" })
      .max(100, { error: "name must be at most 100 characters" }),
  },
  { error: "Request body must be a JSON object" },
);

export const ListAccountsQuery = z.object({
  ...paginationQuery,
  search: z.string().trim().max(100).optional(),
});

import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";

/**
 * Answers 405 (with an `Allow` header) for verbs a resource doesn't support.
 * Used to make ledger immutability explicit: PUT/PATCH/DELETE on transactions
 * is refused with a clear reason instead of a generic 404.
 */
export function methodNotAllowed(allowed: string[], reason?: string): RequestHandler {
  return (req, res) => {
    res.setHeader("Allow", allowed.join(", "));
    throw new AppError(
      405,
      "METHOD_NOT_ALLOWED",
      reason ?? `${req.method} is not allowed on this resource`,
      { allowed_methods: allowed },
    );
  };
}

import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    request_id?: string;
  };
}

function send(res: Parameters<ErrorRequestHandler>[2], status: number, body: ErrorBody["error"]) {
  res.status(status).json({ error: { ...body, request_id: res.locals.requestId } } satisfies ErrorBody);
}

/** 404 for any route that isn't registered. */
export const notFoundHandler: RequestHandler = (req, res) => {
  send(res, 404, {
    code: "ROUTE_NOT_FOUND",
    message: `Route ${req.method} ${req.path} does not exist`,
  });
};

/**
 * Single place that turns any thrown error into the standard error envelope:
 *   { "error": { "code", "message", "details?", "request_id" } }
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    send(res, err.status, { code: err.code, message: err.message, details: err.details });
    return;
  }

  // Errors raised by express.json() (body-parser).
  const type = (err as { type?: string }).type;
  if (type === "entity.parse.failed") {
    send(res, 400, { code: "INVALID_JSON", message: "Request body is not valid JSON" });
    return;
  }
  if (type === "entity.too.large") {
    send(res, 413, { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" });
    return;
  }
  if (type === "encoding.unsupported" || type === "charset.unsupported") {
    send(res, 415, { code: "INVALID_REQUEST_BODY", message: "Unsupported request body encoding" });
    return;
  }

  console.error(`[${res.locals.requestId}] Unhandled error`, err);
  send(res, 500, { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." });
};

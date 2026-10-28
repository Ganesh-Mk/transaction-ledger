/** Postgres SQLSTATE codes we react to. */
export const PG = {
  UNIQUE_VIOLATION: "23505",
  CHECK_VIOLATION: "23514",
  FOREIGN_KEY_VIOLATION: "23503",
} as const;

interface PgError {
  code: string;
  constraint?: string;
}

export function isPgError(err: unknown, code?: string, constraint?: string): err is PgError {
  if (typeof err !== "object" || err === null || !("code" in err)) return false;
  const e = err as PgError;
  if (code && e.code !== code) return false;
  if (constraint && e.constraint !== constraint) return false;
  return true;
}

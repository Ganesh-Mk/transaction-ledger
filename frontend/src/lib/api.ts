import type {
  Account,
  Balance,
  Health,
  Page,
  Stats,
  Transaction,
  TransactionType,
  TransferListItem,
  TransferResult,
} from "./types";

/**
 * Origin for data requests. Empty means same-origin: Vite proxies /api in dev,
 * and on Vercel /api is rewritten to the backend.
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/** Public backend origin for links people open directly (Swagger docs). Falls back to API_URL. */
export const API_PUBLIC_URL = (import.meta.env.VITE_API_PUBLIC_URL || API_URL).replace(/\/$/, "");
export const API_DOCS_URL = `${API_PUBLIC_URL}/api/docs`;

/** Error carrying the API's `{ error: { code, message, details } }` envelope. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-level messages from a validation error, keyed by field name. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const d of this.details as { field?: string; message?: string }[]) {
      if (d.field && d.message && !out[d.field]) out[d.field] = d.message;
    }
    return out;
  }
}

/** Thrown when the server can't be reached at all (asleep, offline, CORS...). */
export class NetworkError extends Error {
  constructor(message = "Can't reach the server") {
    super(message);
    this.name = "NetworkError";
  }
}

type Listener = () => void;
const networkFailureListeners = new Set<Listener>();
/** Lets the server-status monitor react when any request fails to connect. */
export function onNetworkFailure(fn: Listener) {
  networkFailureListeners.add(fn);
  return () => {
    networkFailureListeners.delete(fn);
  };
}

async function request<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number; silent?: boolean } = {},
): Promise<T> {
  const { timeoutMs = 30_000, silent, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...rest.headers },
    });
  } catch {
    if (!silent) networkFailureListeners.forEach((fn) => fn());
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // Proxies in front of a sleeping/booting instance answer 502/503 without our envelope.
    if (!body?.error && (res.status === 502 || res.status === 503 || res.status === 504)) {
      if (!silent) networkFailureListeners.forEach((fn) => fn());
      throw new NetworkError("The server is starting up");
    }
    const err = body?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? "HTTP_ERROR",
      err.message ?? `Request failed (${res.status})`,
      err.details,
    );
  }
  return body as T;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") search.set(k, String(v));
  const s = search.toString();
  return s ? `?${s}` : "";
};

export const api = {
  health: (timeoutMs: number) => request<Health>("/health", { timeoutMs, silent: true }),

  stats: () => request<{ data: Stats }>("/api/stats").then((r) => r.data),

  listAccounts: (p: { page?: number; limit?: number; search?: string }) =>
    request<Page<Account>>(`/api/accounts${qs(p)}`),

  getAccount: (id: string) => request<{ data: Account }>(`/api/accounts/${id}`).then((r) => r.data),

  getBalance: (id: string) => request<{ data: Balance }>(`/api/accounts/${id}/balance`).then((r) => r.data),

  createAccount: (name: string) =>
    request<{ data: Account }>("/api/accounts", { method: "POST", body: JSON.stringify({ name }) }).then(
      (r) => r.data,
    ),

  listTransactions: (id: string, p: { page?: number; limit?: number; type?: TransactionType }) =>
    request<Page<Transaction>>(`/api/accounts/${id}/transactions${qs(p)}`),

  createTransaction: (
    id: string,
    body: { type: TransactionType; amount: number; reference_id: string; description?: string },
  ) =>
    request<{ data: Transaction }>(`/api/accounts/${id}/transactions`, {
      method: "POST",
      body: JSON.stringify(body),
    }).then((r) => r.data),

  listTransfers: (p: { page?: number; limit?: number; account_id?: string }) =>
    request<Page<TransferListItem>>(`/api/transfers${qs(p)}`),

  createTransfer: (body: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    reference_id: string;
    description?: string;
  }) =>
    request<{ data: TransferResult }>("/api/transfers", { method: "POST", body: JSON.stringify(body) }).then(
      (r) => r.data,
    ),
};

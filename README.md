# Transaction Ledger

A transaction ledger API with a web console. You can create accounts, post credits and debits, read balances, browse paginated history, and move money between accounts atomically.

| | |
|---|---|
| **Live app** | _added after deployment_ |
| **Live API docs** | _added after deployment_ (`/api/docs`) |
| **API reference** | [docs/API.md](docs/API.md) · interactive Swagger UI at `/api/docs` |
| **Assumptions** | [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) |
| **Deployment** | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |

---

## Quick start (one command)

Requires Docker.

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Web console | http://localhost:5173 |
| API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/api/docs |
| Health | http://localhost:8080/health |

The database schema is created automatically when the API starts. To load demo data:

```bash
docker compose exec api node dist/db/seed.js
```

## Local development (hot reload)

Requires Node 20+ and Docker (for Postgres only).

```bash
docker compose up -d db                 # Postgres on localhost:5433 (also creates ledger_test)

cd backend
cp .env.example .env
npm install
npm run dev                             # API on :8080, runs migrations on boot
npm run seed                            # optional demo data

cd ../frontend
npm install
npm run dev                             # UI on :5173, proxies /api to :8080
```

## Tests

```bash
docker compose up -d db
cd backend && npm test
```

There are 64 integration tests. They run against a real Postgres database, because the guarantees being tested (locking, constraints, rollbacks) live in the database. They cover every rule in the brief, plus:

- **Concurrency:** 25 parallel ₹10 debits against a ₹100 balance. Exactly 10 succeed and the balance ends at 0.
- **Duplicate requests at the same moment:** 10 requests with the same `reference_id` produce exactly one transaction.
- **Opposite transfers:** 20 transfers A→B and B→A run at once without deadlocking, and the total money is unchanged.
- **Database-level immutability:** a raw `UPDATE` or `DELETE` on `transactions` is rejected by a trigger.
- **Balance check in the database:** `balance >= 0` is enforced by the database even if application code is bypassed.

---

## Tech stack and why

| Choice | Why |
|---|---|
| **PostgreSQL** | A ledger's main requirements are atomicity and consistency. Postgres provides ACID transactions, `SELECT … FOR UPDATE` row locks, `CHECK`/`UNIQUE`/`FOREIGN KEY` constraints, an exact `NUMERIC` type for money, and triggers. A document store would leave more of this to application code. |
| **Node.js + TypeScript** | One language across API and UI. Strict typing catches mistakes in request and response shapes at compile time. Its non-blocking I/O suits a database-bound API. |
| **Express 5** | Small and widely known, so the code is easy to review. Version 5 forwards errors from async handlers to the central error handler without extra wrappers. |
| **`pg` with hand-written SQL (no ORM)** | Transaction boundaries, locks and constraint names are explicit and easy to read. That's the part a reviewer most needs to verify in a ledger. |
| **Zod** | One schema both validates the request and gives the handler a typed result, so validation can't drift from the types. |
| **Vitest + Supertest** | Fast integration tests that call the real HTTP stack against real Postgres. |
| **React + Vite + Tailwind v4 + TanStack Query** | A fast static single-page app. Query handles caching, pagination and refreshing data after writes. The design tokens follow a two-layer (primitive → semantic) system. |
| **Docker Compose / Railway** | One command to run locally, and the same containers deploy to Railway. |

## How correctness is guaranteed

**1. Atomic write path.** Every credit or debit runs inside one database transaction:

```
BEGIN
  SELECT … FROM accounts WHERE id = $1 FOR UPDATE   -- lock the account row
  reference_id already used?   → 409, nothing written
  debit and balance < amount?  → 422, nothing written
  UPDATE accounts SET balance = balance ± amount
  INSERT INTO transactions (… balance_after …)
COMMIT                                             -- any error → ROLLBACK
```

The row lock makes concurrent writes to the same account run one after another, so two debits can't both pass the balance check (no double-spend, no lost updates).

**2. Database constraints as a backstop.** These hold even if the application code has a bug:

- `CHECK (balance >= 0)`
- `CHECK (amount > 0)`
- `transaction_type` enum
- `UNIQUE (account_id, reference_id)`
- foreign keys with `ON DELETE RESTRICT`
- `CHECK (from_account_id <> to_account_id)` on transfers

**3. Idempotency.** Sending the same `reference_id` again on an account returns `409 DUPLICATE_TRANSACTION` with the original transaction and changes nothing. The duplicate check runs before the balance check, so a retried debit reports "duplicate" rather than "insufficient balance". The unique constraint also covers the case of two identical requests arriving at the same moment.

**4. Immutability.** There are no update or delete routes. `PUT`, `PATCH` and `DELETE` return `405` with an `Allow` header. A `BEFORE UPDATE OR DELETE` trigger also rejects changes made directly in the database.

**5. Money.** Amounts are stored as `NUMERIC(15,2)`, never as floats. Balance arithmetic happens in SQL. The API rejects amounts with more than 2 decimal places instead of rounding them silently.

**6. Transfers.** Both account rows are locked in ascending id order, which prevents deadlocks between A→B and B→A. The transfer row, the debit and the credit are written in one transaction, so a partial transfer can't exist. Both sides share a `transfer_id`.

**7. Audit trail.** Every transaction stores `balance_after`, so an account's history can be checked line by line.

## API at a glance

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/accounts` | Create an account (balance always starts at 0) |
| `GET` | `/api/accounts` | List accounts (`page`, `limit`, `search`) |
| `GET` | `/api/accounts/:id` | Get an account |
| `GET` | `/api/accounts/:id/balance` | Current balance |
| `POST` | `/api/accounts/:id/transactions` | Credit or debit |
| `GET` | `/api/accounts/:id/transactions` | History (`type`, `page`, `limit`; newest first) |
| `GET` | `/api/accounts/:id/transactions/:txId` | One transaction |
| `POST` | `/api/transfers` | **Bonus:** atomic transfer |
| `GET` | `/api/transfers` | List transfers |
| `GET` | `/api/stats` | Dashboard totals |
| `GET` | `/health` | Liveness and database check |

Every error has the same shape:

```json
{ "error": { "code": "INSUFFICIENT_BALANCE", "message": "Insufficient balance: available 100.00, requested 150.00", "details": { … }, "request_id": "…" } }
```

The full reference with every status code is in [docs/API.md](docs/API.md).

## Cold starts (free hosting)

Free-tier instances sleep when idle, so the first request after a pause can take 15–40 s. The web console handles this:

- On load it checks `/health`. If there's no answer within 1.5 s, it shows a **"Waking up the server"** panel with progress steps and an elapsed timer, and polls every 2.5 s.
- The page content appears automatically once the API responds. After 2 minutes without a response it shows a "can't reach the API" message with a retry button.
- If any request fails to connect later (for example, the API went back to sleep), the check runs again.
- A status pill in the header shows `Online · 42ms`, `Waking up`, or `Unreachable`.

## Project structure

```
backend/
  src/
    config/env.ts              environment validation (fails fast on bad config)
    db/                        pool + withTransaction(), migrations, seed
    errors/AppError.ts         typed error codes
    lib/                       shared Zod schemas, pagination, Postgres error helpers
    middleware/                request id + logging, error handler, 405 helper
    modules/
      accounts/                routes → service → repository
      transactions/            atomic write path, history
      transfers/               bonus: atomic transfers
      health/  stats/
    docs/openapi.ts            OpenAPI 3.1 spec (served at /api/docs)
    app.ts  server.ts
  tests/                       integration tests (real Postgres)
frontend/
  src/
    components/ui/             design-system primitives (Button, Card, Table, Modal, …)
    components/layout/         app shell, sidebar, server status / wake screen
    features/                  account, transaction and transfer modals, data hooks
    pages/                     Dashboard, Accounts, Account detail, Transfers
    lib/                       API client, cold-start monitor, formatters
docker-compose.yml             db + api + web
```

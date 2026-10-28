# Transaction Ledger API — Plan (brief)

**Deadline:** 29 Oct 2026 EOD · **Effort:** about 3–4 hrs · **Type:** Backend API only (no UI, no AI)

## 1. What we need to build
| # | API | Key rules |
|---|-----|-----------|
| 1 | `POST /accounts` | `name` required; balance always starts at 0 (client can't set it); `id` and `created_at` set by the server |
| 2 | `POST /accounts/:id/transactions` | `credit` adds to the balance, `debit` subtracts from it; debit is **rejected if the balance is too low**; `amount > 0`; `reference_id` is required and **unique per account** (a repeat returns "already exists" and nothing changes) |
| 3 | `GET /accounts/:id/balance` | returns `account_id` and `balance`; 404 if the account is missing |
| 4 | `GET /accounts/:id/transactions` | `?type=credit\|debit`, `?page=&limit=`, newest first; response includes page, limit, total, total_pages |
| 5 | Integrity | transactions can't be changed (no PUT/PATCH/DELETE); the transaction insert and balance update succeed or fail together; balance always equals the sum of transactions |
| 6 | Validation and errors | one error format (`{ error: { code, message, details } }`) with correct status codes: 400/422, 404, 409 duplicate, 422 insufficient balance |
| 7 | **Bonus** `POST /transfers` | A → B in one DB transaction; both accounts must exist; enough balance; no partial transfer |

**Deliverables:** source code, README (how to run it), API docs, assumptions.

## 2. Proposed stack
- **Node.js + TypeScript + Express**
- **PostgreSQL** (run through Docker Compose) for real transactions, row locks and constraints
- **Zod** for validation, **Swagger/OpenAPI** (`/docs`) for the API documentation
- **Vitest + Supertest** tests that cover each rule in the brief (including concurrent debits)

## 3. How we guarantee correctness (the part they will grill you on)
- Money is stored as `NUMERIC(18,2)` (or as integer paise), never as a float.
- Database constraints: `CHECK (balance >= 0)`, `CHECK (amount > 0)`, `CHECK (type IN ('credit','debit'))`, and `UNIQUE (account_id, reference_id)`.
- Each write runs as `BEGIN` → `SELECT … FOR UPDATE` (locks the account row) → insert the transaction → update the balance → `COMMIT`. Any error triggers a `ROLLBACK`.
- Duplicates are caught by the unique constraint, so even two requests that arrive at the same moment can't both succeed. The API returns 409 with the existing transaction.
- Transfers lock both accounts in a fixed order (sorted by id) to avoid deadlocks, then write a debit and a credit that share a `transfer_id`.
- Immutability: there are no update or delete routes, and an optional DB trigger blocks UPDATE/DELETE on `transactions`.

## 4. Build steps
1. Scaffold the project, Docker Compose (Postgres), and the migration/schema
2. Accounts API, then the Transactions API (atomic, idempotent), then the balance and history endpoints
3. Shared error handler and validation
4. Transfer (bonus)
5. Tests
6. README, OpenAPI docs, ASSUMPTIONS.md, and a Postman collection

## 5. What YOU must do (I can't)
- [ ] Install **Docker Desktop** and **Node.js 20+** if you don't have them (I'll check first)
- [ ] Create a **GitHub repo** and push to it (I can run `git init` and commit locally; pushing needs your account), or tell me to use the `gh` CLI if it's logged in
- [ ] **Submit the Google Form** (https://forms.gle/fgKzNPY1wEpR8XkL7) with the repo link
- [ ] **Read and understand the code**, especially section 3, before Round 2 (the technical group interview)
- [ ] Optional: deploy it (Render/Railway plus a hosted Postgres) if you want a live URL. This needs your accounts.

## 6. Decide before I start
- Is the stack OK (Node/TS + Postgres)? Or do you prefer Python/FastAPI or Java/Spring?

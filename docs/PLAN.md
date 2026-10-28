# Transaction Ledger: plan and status

**Deadline:** 29 Oct 2026 EOD

## Status
| Item | State |
|---|---|
| Backend API (accounts, transactions, balance, history, transfers bonus) | ✅ Done |
| Validation, error codes, DB constraints, immutability triggers | ✅ Done |
| 64 integration tests (incl. concurrency, deadlock, idempotency) | ✅ Passing |
| Web console (dashboard, accounts, account detail, transfers) | ✅ Done |
| Cold-start "waking up" screen | ✅ Done and tested (API stopped, then restarted) |
| Docker Compose: one command runs db + api + web | ✅ Verified |
| README, API.md, ASSUMPTIONS.md, DEPLOYMENT.md, Swagger UI | ✅ Done |
| Local git commit | ✅ Done |
| Push to GitHub (Ganesh-Mk) | ⏳ Needs your GitHub login |
| Deploy to Railway | ⏳ Needs your Railway login |
| Submit the Google Form | ⏳ You |

## Why this stack
Short version (the full table is in the README):

- **PostgreSQL:** a ledger needs ACID transactions, row locks, constraints and exact `NUMERIC` money. Postgres gives all of these built in.
- **Node + TypeScript:** one language for the API and UI, with type safety on request and response shapes.
- **Express 5:** small and easy to review, and it forwards async errors natively.
- **Raw SQL with `pg` (no ORM):** the transaction boundaries and locks are visible, which is the part interviewers will look at.
- **Zod:** one schema provides both validation and types.

## What to study before Round 2
1. `backend/src/modules/transactions/transaction.service.ts`: the atomic write path. Explain `BEGIN → SELECT … FOR UPDATE → checks → UPDATE → INSERT → COMMIT`.
2. `backend/src/db/migrations/001_init.ts`: the constraints and the immutability trigger.
3. `backend/src/modules/transfers/transfer.service.ts`: why the rows are locked in sorted id order (deadlock avoidance).
4. `backend/tests/transactions.test.ts`: the "concurrency" tests prove the locking works.
5. Likely questions:
   - Why not floats?
   - Why 409 vs 422?
   - What if two identical requests arrive at the same moment? (The unique constraint catches the second one.)
   - How would you scale this? (Partition by account, read replicas for history, an outbox pattern for events.)

# API reference

- **Base URL:** `http://localhost:8080` locally, or the deployed API URL.
- **Interactive docs:** `/api/docs` (Swagger UI). The raw spec is at `/api/openapi.json` (OpenAPI 3.1).

**Conventions**
- JSON in, JSON out.
- Successful responses are wrapped in `data`. List responses also include `pagination`.
- Amounts are numbers with at most 2 decimal places. Timestamps are ISO-8601 UTC.
- Every response carries an `X-Request-Id` header.

## Error format

```json
{
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "amount: amount must be greater than 0",
    "details": [{ "field": "amount", "message": "amount must be greater than 0" }],
    "request_id": "0b6f8f0e-3c1e-4f7a-9d55-2d8f1f3e9a10"
  }
}
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | A field fails validation, or an unknown field is sent |
| 400 | `INVALID_REQUEST_BODY` | The body isn't a JSON object |
| 400 | `INVALID_JSON` | The body isn't parseable JSON |
| 400 | `INVALID_ACCOUNT_ID` | An account id is not a UUID |
| 400 | `INVALID_TRANSACTION_TYPE` | `type` is not `credit` or `debit` |
| 400 | `INVALID_AMOUNT` | Missing, ≤ 0, more than 2 decimals, not a number, or too large |
| 400 | `INVALID_PAGINATION` | `page` or `limit` isn't a positive integer, or `limit` > 100 |
| 400 | `BALANCE_NOT_ALLOWED` | The client tried to set `balance` on create |
| 400 | `SAME_ACCOUNT_TRANSFER` | Transfer source and destination are the same |
| 404 | `ACCOUNT_NOT_FOUND` | No account with that id |
| 404 | `TRANSACTION_NOT_FOUND` / `TRANSFER_NOT_FOUND` / `ROUTE_NOT_FOUND` | Not found |
| 405 | `METHOD_NOT_ALLOWED` | `PUT`/`PATCH`/`DELETE` on immutable resources |
| 409 | `DUPLICATE_TRANSACTION` | `reference_id` was already used on this account |
| 409 | `DUPLICATE_TRANSFER` | `reference_id` was already used by this source account |
| 413 | `PAYLOAD_TOO_LARGE` | Body is over 100 KB |
| 422 | `INSUFFICIENT_BALANCE` | Debit or transfer exceeds the available balance |
| 500 | `INTERNAL_ERROR` | Unexpected error |

---

## 1. Create account
`POST /api/accounts`

```json
{ "name": "Ganesh Kumar" }
```

**201 Created** (with a `Location: /api/accounts/{id}` header)

```json
{ "data": { "id": "9f1c2d3e-…", "name": "Ganesh Kumar", "balance": 0, "created_at": "2026-10-28T10:00:00.000Z" } }
```

**Errors:** `400 VALIDATION_ERROR` (name missing, blank or over 100 characters), `400 BALANCE_NOT_ALLOWED`.

## 2. Add transaction
`POST /api/accounts/{accountId}/transactions`

```json
{ "type": "debit", "amount": 30, "reference_id": "PAY-0001", "description": "Vendor payment" }
```

| Field | Rules |
|---|---|
| `type` | `credit` or `debit`, required |
| `amount` | number > 0, at most 2 decimals, required |
| `reference_id` | string, 1–100 characters, unique per account, required |
| `description` | string, up to 255 characters, optional |

**201 Created**

```json
{
  "data": {
    "id": "c0ffee00-…",
    "account_id": "9f1c2d3e-…",
    "type": "debit",
    "amount": 30,
    "description": "Vendor payment",
    "reference_id": "PAY-0001",
    "balance_after": 70,
    "transfer_id": null,
    "created_at": "2026-10-28T10:05:00.000Z"
  }
}
```

**Errors:**
- `404 ACCOUNT_NOT_FOUND`
- `422 INSUFFICIENT_BALANCE`: `details` includes `balance` and `requested_amount`. Nothing is written.
- `409 DUPLICATE_TRANSACTION`: `details.existing_transaction` is the original. Nothing is written.
- `400` validation codes

## 3. Get balance
`GET /api/accounts/{accountId}/balance`

**200 OK**

```json
{ "data": { "account_id": "9f1c2d3e-…", "name": "Ganesh Kumar", "balance": 70 } }
```

**Errors:** `404 ACCOUNT_NOT_FOUND`, `400 INVALID_ACCOUNT_ID`.

## 4. Transaction history
`GET /api/accounts/{accountId}/transactions?type=credit&page=1&limit=20`

| Query | Default | Notes |
|---|---|---|
| `type` | (both) | `credit` or `debit` |
| `page` | 1 | ≥ 1 |
| `limit` | 20 | 1–100 |

Results are sorted **latest first** by `created_at`.

**200 OK**

```json
{
  "data": [ { "id": "…", "type": "credit", "amount": 50, "balance_after": 150, "…": "…" } ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_records": 57,
    "total_pages": 3,
    "has_next_page": true,
    "has_previous_page": false
  },
  "filters": { "type": "credit" }
}
```

**Errors:** `400 INVALID_PAGINATION`, `400 INVALID_TRANSACTION_TYPE`, `404 ACCOUNT_NOT_FOUND`.

### Get a single transaction
`GET /api/accounts/{accountId}/transactions/{transactionId}` returns 200, or 404 `TRANSACTION_NOT_FOUND`.

`PUT`, `PATCH` and `DELETE` on this path (and on the collection) return **405 METHOD_NOT_ALLOWED**, because transactions are immutable.

## 5. Transfer (bonus)
`POST /api/transfers`

```json
{
  "from_account_id": "9f1c…",
  "to_account_id": "2b7e…",
  "amount": 30,
  "reference_id": "TRF-0001",
  "description": "Rent split"
}
```

**201 Created**

```json
{
  "data": {
    "id": "7a1b…",
    "from_account_id": "9f1c…",
    "to_account_id": "2b7e…",
    "amount": 30,
    "reference_id": "TRF-0001",
    "description": "Rent split",
    "created_at": "…",
    "transactions": { "debit": { "…": "…" }, "credit": { "…": "…" } },
    "balances": {
      "from_account": { "account_id": "9f1c…", "balance": 70 },
      "to_account": { "account_id": "2b7e…", "balance": 80 }
    }
  }
}
```

**Errors:** `404 ACCOUNT_NOT_FOUND` (either account), `422 INSUFFICIENT_BALANCE`, `409 DUPLICATE_TRANSFER`, `400 SAME_ACCOUNT_TRANSFER`. In every failure case neither balance changes.

Other transfer endpoints:
- `GET /api/transfers?page=&limit=&account_id=`: newest first, includes both account names.
- `GET /api/transfers/{id}`

## Supporting endpoints
- `GET /api/accounts?page=&limit=&search=`: newest first, case-insensitive search by name.
- `GET /api/accounts/{id}`
- `GET /api/stats`: totals for the dashboard.
- `GET /health`: `200 {status:"ok", database:"up"}`, or `503` if the database is unreachable.

## curl walkthrough

```bash
API=http://localhost:8080

# create two accounts
A=$(curl -s -XPOST $API/api/accounts -H 'content-type: application/json' -d '{"name":"Alice"}' | jq -r .data.id)
B=$(curl -s -XPOST $API/api/accounts -H 'content-type: application/json' -d '{"name":"Bob"}'   | jq -r .data.id)

# credit 100, debit 30
curl -s -XPOST $API/api/accounts/$A/transactions -H 'content-type: application/json' \
  -d '{"type":"credit","amount":100,"reference_id":"r-1"}'
curl -s -XPOST $API/api/accounts/$A/transactions -H 'content-type: application/json' \
  -d '{"type":"debit","amount":30,"reference_id":"r-2"}'

# duplicate returns 409, balance unchanged
curl -s -XPOST $API/api/accounts/$A/transactions -H 'content-type: application/json' \
  -d '{"type":"debit","amount":30,"reference_id":"r-2"}'

# overdraft returns 422
curl -s -XPOST $API/api/accounts/$A/transactions -H 'content-type: application/json' \
  -d '{"type":"debit","amount":500,"reference_id":"r-3"}'

# transfer 20 from A to B
curl -s -XPOST $API/api/transfers -H 'content-type: application/json' \
  -d "{\"from_account_id\":\"$A\",\"to_account_id\":\"$B\",\"amount\":20,\"reference_id\":\"t-1\"}"

curl -s "$API/api/accounts/$A/balance"
curl -s "$API/api/accounts/$A/transactions?type=debit&page=1&limit=10"
```

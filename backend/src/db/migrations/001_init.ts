export const name = "001_init";

export const up = /* sql */ `
CREATE TABLE accounts (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100)  NOT NULL,
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT accounts_name_not_blank       CHECK (length(btrim(name)) > 0),
  -- Last line of defence: the balance can never go negative, even if
  -- application code had a bug.
  CONSTRAINT accounts_balance_non_negative CHECK (balance >= 0)
);

CREATE INDEX accounts_created_at_idx ON accounts (created_at DESC);

CREATE TYPE transaction_type AS ENUM ('credit', 'debit');

CREATE TABLE transfers (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id  UUID          NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id    UUID          NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  amount           NUMERIC(15,2) NOT NULL,
  description      VARCHAR(255),
  reference_id     VARCHAR(100)  NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT transfers_amount_positive      CHECK (amount > 0),
  CONSTRAINT transfers_distinct_accounts    CHECK (from_account_id <> to_account_id),
  CONSTRAINT transfers_reference_not_blank  CHECK (length(btrim(reference_id)) > 0),
  CONSTRAINT transfers_source_reference_uq  UNIQUE (from_account_id, reference_id)
);

CREATE TABLE transactions (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Monotonic insertion order; tie-breaker so "latest first" is stable even
  -- when two rows share a timestamp.
  seq            BIGINT           GENERATED ALWAYS AS IDENTITY UNIQUE,
  account_id     UUID             NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  type           transaction_type NOT NULL,
  amount         NUMERIC(15,2)    NOT NULL,
  description    VARCHAR(255),
  reference_id   VARCHAR(100)     NOT NULL,
  balance_after  NUMERIC(15,2)    NOT NULL,
  transfer_id    UUID             REFERENCES transfers(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ      NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT transactions_amount_positive        CHECK (amount > 0),
  CONSTRAINT transactions_balance_after_non_neg  CHECK (balance_after >= 0),
  CONSTRAINT transactions_reference_not_blank    CHECK (length(btrim(reference_id)) > 0),
  -- Idempotency: one reference per account; the same reference may be
  -- reused on a different account.
  CONSTRAINT transactions_account_reference_uq   UNIQUE (account_id, reference_id)
);

-- Serves history queries: WHERE account_id = ? [AND type = ?] ORDER BY created_at DESC
CREATE INDEX transactions_account_created_idx
  ON transactions (account_id, created_at DESC, seq DESC);
CREATE INDEX transactions_account_type_created_idx
  ON transactions (account_id, type, created_at DESC, seq DESC);

-- Immutability enforced by the database itself, not just by the API surface:
-- ledger entries and transfers can never be updated or deleted.
CREATE FUNCTION forbid_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable (% is not allowed)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER transactions_immutable
  BEFORE UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();

CREATE TRIGGER transfers_immutable
  BEFORE UPDATE OR DELETE ON transfers
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();
`;

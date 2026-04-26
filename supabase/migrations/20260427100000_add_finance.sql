-- HostCheckIn — Phase 2 Lot C — Financial analytics module
-- Adds finance_transactions table with host-scoped RLS.

-- =========================================================================
-- TABLE
-- =========================================================================

CREATE TABLE IF NOT EXISTS finance_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id      uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_id  uuid REFERENCES properties(id) ON DELETE SET NULL,

  kind         text NOT NULL
                 CHECK (kind IN ('income', 'expense')),
  category     text NOT NULL
                 CHECK (
                   category IN (
                     'reservation',
                     'laundry',
                     'cleaning',
                     'utilities',
                     'platform_fee',
                     'tax',
                     'supplies',
                     'other_income',
                     'other_expense'
                   )
                 ),
  amount       numeric(10, 2) NOT NULL CHECK (amount >= 0),
  currency     text NOT NULL DEFAULT 'EUR',
  occurred_on  date NOT NULL,
  description  text,
  notes        text,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_host_id
  ON finance_transactions(host_id);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_property_id
  ON finance_transactions(property_id);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_occurred_on
  ON finance_transactions(occurred_on);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_category
  ON finance_transactions(category);

-- =========================================================================
-- updated_at trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION set_finance_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_finance_transactions_updated_at ON finance_transactions;
CREATE TRIGGER trg_finance_transactions_updated_at
  BEFORE UPDATE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION set_finance_transactions_updated_at();

-- =========================================================================
-- RLS — finance_transactions
-- =========================================================================

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own finance transactions" ON finance_transactions;
CREATE POLICY "Hosts can read own finance transactions" ON finance_transactions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert own finance transactions" ON finance_transactions;
CREATE POLICY "Hosts can insert own finance transactions" ON finance_transactions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update own finance transactions" ON finance_transactions;
CREATE POLICY "Hosts can update own finance transactions" ON finance_transactions
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_id)
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete own finance transactions" ON finance_transactions;
CREATE POLICY "Hosts can delete own finance transactions" ON finance_transactions
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_id);

-- =========================================================================
-- ALTER reservations: add total_amount (revenue field consumed by Finance)
-- =========================================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS total_amount numeric(10, 2);

COMMENT ON COLUMN reservations.total_amount IS
  'Booking total amount in default currency. Used by Finance module to compute revenue. Nullable for legacy rows.';

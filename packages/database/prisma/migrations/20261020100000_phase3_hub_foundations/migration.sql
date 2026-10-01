-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('CASH', 'CLIENT_RECEIVABLE', 'PROJECT_FUNDS', 'PLATFORM_REVENUE', 'LEAD_PAYABLE', 'STUDENT_HELD', 'STUDENT_PAYABLE', 'PAYOUT_CLEARING', 'TAX_WITHHELD');

-- CreateEnum
CREATE TYPE "LedgerSide" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
ALTER TABLE "countries" ADD COLUMN     "hub_day_end_minute" SMALLINT NOT NULL DEFAULT 1260,
ADD COLUMN     "hub_day_start_minute" SMALLINT NOT NULL DEFAULT 420,
ADD COLUMN     "hub_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hub_hold_days" SMALLINT NOT NULL DEFAULT 14,
ADD COLUMN     "hub_lead_percent" SMALLINT NOT NULL DEFAULT 25,
ADD COLUMN     "hub_min_age" SMALLINT NOT NULL DEFAULT 15,
ADD COLUMN     "hub_platform_percent" SMALLINT NOT NULL DEFAULT 25,
ADD COLUMN     "hub_school_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
ADD COLUMN     "hub_school_end_minute" SMALLINT NOT NULL DEFAULT 840,
ADD COLUMN     "hub_school_start_minute" SMALLINT NOT NULL DEFAULT 480,
ADD COLUMN     "hub_student_percent" SMALLINT NOT NULL DEFAULT 50,
ADD COLUMN     "hub_weekly_minutes" SMALLINT NOT NULL DEFAULT 360,
ADD COLUMN     "hub_withholding_bp" SMALLINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "mentor_profiles" ADD COLUMN     "is_lead" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "hub_eligibility" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "readiness_id" UUID,
    "signed_off_by_id" UUID,
    "signed_off_at" TIMESTAMP(3),
    "sign_off_note" TEXT,
    "eligible_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" UUID,
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_eligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "owner_key" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_transactions" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "memo" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" UUID,
    "idempotency_key" TEXT NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "side" "LedgerSide" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hub_eligibility_student_id_key" ON "hub_eligibility"("student_id");

-- CreateIndex
CREATE INDEX "hub_eligibility_eligible_at_idx" ON "hub_eligibility"("eligible_at");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_accounts_type_currency_owner_key_key" ON "ledger_accounts"("type", "currency", "owner_key");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_transactions_idempotency_key_key" ON "ledger_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_transactions_ref_type_ref_id_idx" ON "ledger_transactions"("ref_type", "ref_id");

-- CreateIndex
CREATE INDEX "ledger_transactions_created_at_idx" ON "ledger_transactions"("created_at");

-- CreateIndex
CREATE INDEX "ledger_entries_account_id_created_at_idx" ON "ledger_entries"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "ledger_entries_transaction_id_idx" ON "ledger_entries"("transaction_id");

-- AddForeignKey
ALTER TABLE "hub_eligibility" ADD CONSTRAINT "hub_eligibility_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_eligibility" ADD CONSTRAINT "hub_eligibility_signed_off_by_id_fkey" FOREIGN KEY ("signed_off_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_eligibility" ADD CONSTRAINT "hub_eligibility_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ── Written by hand ──────────────────────────────────────────────────────────

-- A country's hub split always adds up to 100%.
ALTER TABLE "countries" ADD CONSTRAINT "countries_hub_split_check"
  CHECK ("hub_student_percent" + "hub_lead_percent" + "hub_platform_percent" = 100
     AND "hub_student_percent" >= 0 AND "hub_lead_percent" >= 0 AND "hub_platform_percent" >= 0);

-- Ledger amounts are positive (the side says which way the money moves).
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_amount_check" CHECK ("amount_minor" > 0);

-- The ledger is append-only: accounts, transactions and entries are never changed or
-- deleted (a mistake is put right by a new posting).
CREATE FUNCTION "prevent_ledger_changes"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only (% blocked)', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ledger_accounts_append_only"
  BEFORE UPDATE OR DELETE ON "ledger_accounts"
  FOR EACH ROW EXECUTE FUNCTION "prevent_ledger_changes"();

CREATE TRIGGER "ledger_transactions_append_only"
  BEFORE UPDATE OR DELETE ON "ledger_transactions"
  FOR EACH ROW EXECUTE FUNCTION "prevent_ledger_changes"();

CREATE TRIGGER "ledger_entries_append_only"
  BEFORE UPDATE OR DELETE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION "prevent_ledger_changes"();

-- An entry is in its account's currency.
CREATE FUNCTION "check_ledger_entry_currency"() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "ledger_accounts" WHERE "id" = NEW."account_id" AND "currency" = NEW."currency"
  ) THEN
    RAISE EXCEPTION 'ledger entry currency % does not match its account', NEW."currency";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ledger_entries_currency"
  BEFORE INSERT ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION "check_ledger_entry_currency"();

-- Every posting balances: when the database transaction commits, each ledger
-- transaction's debits equal its credits in every currency.
CREATE FUNCTION "check_ledger_balance"() RETURNS trigger AS $$
DECLARE
  unbalanced TEXT;
BEGIN
  SELECT "currency" INTO unbalanced
  FROM "ledger_entries"
  WHERE "transaction_id" = NEW."transaction_id"
  GROUP BY "currency"
  HAVING SUM(CASE WHEN "side" = 'DEBIT' THEN "amount_minor" ELSE -"amount_minor" END) <> 0
  LIMIT 1;
  IF unbalanced IS NOT NULL THEN
    RAISE EXCEPTION 'ledger transaction % does not balance in %', NEW."transaction_id", unbalanced;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER "ledger_entries_balance"
  AFTER INSERT ON "ledger_entries"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "check_ledger_balance"();

-- CreateEnum
CREATE TYPE "PayoutAccountKind" AS ENUM ('IBAN', 'OTHER');

-- CreateEnum
CREATE TYPE "PayoutProvider" AS ENUM ('WISE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PayoutBatchStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('AWAITING_PARENT', 'CONFIRMED', 'SENDING', 'SENT', 'PAID', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "hub_earnings" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "held_until" TIMESTAMP(3) NOT NULL,
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_accounts" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "kind" "PayoutAccountKind" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "details_cipher" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "usable_from" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "verified_by_id" UUID,
    "provider_recipient_id" TEXT,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payout_batches" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "provider" "PayoutProvider" NOT NULL,
    "status" "PayoutBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "created_by_id" UUID NOT NULL,
    "first_approved_by_id" UUID,
    "first_approved_at" TIMESTAMP(3),
    "second_approved_by_id" UUID,
    "second_approved_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "batch_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "withheld_minor" INTEGER NOT NULL DEFAULT 0,
    "net_minor" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'AWAITING_PARENT',
    "parent_confirmed_at" TIMESTAMP(3),
    "provider_transfer_id" TEXT,
    "provider_status" TEXT,
    "failure_reason" TEXT,
    "method" TEXT,
    "reference" TEXT,
    "recorded_by_id" UUID,
    "sent_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hub_earnings_student_id_created_at_idx" ON "hub_earnings"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "hub_earnings_released_at_held_until_idx" ON "hub_earnings"("released_at", "held_until");

-- CreateIndex
CREATE UNIQUE INDEX "hub_earnings_invoice_id_student_id_key" ON "hub_earnings"("invoice_id", "student_id");

-- CreateIndex
CREATE INDEX "payout_accounts_parent_id_created_at_idx" ON "payout_accounts"("parent_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payout_batches_number_key" ON "payout_batches"("number");

-- CreateIndex
CREATE INDEX "payout_batches_status_created_at_idx" ON "payout_batches"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_number_key" ON "payouts"("number");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_provider_transfer_id_key" ON "payouts"("provider_transfer_id");

-- CreateIndex
CREATE INDEX "payouts_batch_id_idx" ON "payouts"("batch_id");

-- CreateIndex
CREATE INDEX "payouts_student_id_created_at_idx" ON "payouts"("student_id", "created_at");

-- CreateIndex
CREATE INDEX "payouts_parent_id_created_at_idx" ON "payouts"("parent_id", "created_at");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- AddForeignKey
ALTER TABLE "hub_earnings" ADD CONSTRAINT "hub_earnings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_earnings" ADD CONSTRAINT "hub_earnings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_earnings" ADD CONSTRAINT "hub_earnings_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "hub_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_accounts" ADD CONSTRAINT "payout_accounts_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_first_approved_by_id_fkey" FOREIGN KEY ("first_approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_second_approved_by_id_fkey" FOREIGN KEY ("second_approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "payout_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "payout_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Hand-written: amounts, approvals and "one at a time" rules the database keeps.
ALTER TABLE "hub_earnings" ADD CONSTRAINT "hub_earnings_amount_check" CHECK ("amount_minor" > 0);
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_amounts_check"
  CHECK ("amount_minor" > 0 AND "withheld_minor" >= 0 AND "net_minor" > 0
         AND "net_minor" = "amount_minor" - "withheld_minor");
-- Two different people approve a batch.
ALTER TABLE "payout_batches" ADD CONSTRAINT "payout_batches_two_people_check"
  CHECK ("second_approved_by_id" IS NULL
         OR ("first_approved_by_id" IS NOT NULL AND "second_approved_by_id" <> "first_approved_by_id"));
-- One live payout account per parent.
CREATE UNIQUE INDEX "payout_accounts_one_live" ON "payout_accounts"("parent_id") WHERE "removed_at" IS NULL;
-- One payout in progress per student (its money can't be paid twice).
CREATE UNIQUE INDEX "payouts_one_open_per_student" ON "payouts"("student_id")
  WHERE "status" IN ('AWAITING_PARENT', 'CONFIRMED', 'SENDING', 'SENT');

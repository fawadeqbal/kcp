
-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MANUAL', 'STRIPE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID', 'VOID', 'REFUNDED');

-- AlterTable
ALTER TABLE "countries" ADD COLUMN     "family_discount_percent" SMALLINT NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "project_briefs" ADD COLUMN     "is_premium" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "plans" (
    "key" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "plan_prices" (
    "id" UUID NOT NULL,
    "plan_key" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_customers" (
    "parent_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("parent_id","provider")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "plan_key" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 1,
    "provider_subscription_id" TEXT,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "subscription_id" UUID,
    "provider" "PaymentProvider" NOT NULL,
    "provider_payment_id" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "refunded_minor" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT,
    "reference" TEXT,
    "recorded_by_id" UUID,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "provider_refund_id" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "parent_id" UUID NOT NULL,
    "subscription_id" UUID,
    "payment_id" UUID,
    "provider_invoice_id" TEXT,
    "status" "InvoiceStatus" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent_id" UUID,
    "subscription_id" UUID,
    "payment_id" UUID,
    "actor_id" UUID,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_prices_plan_key_country_code_key" ON "plan_prices"("plan_key", "country_code");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_provider_customer_id_key" ON "billing_customers"("provider", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_provider_subscription_id_key" ON "subscriptions"("provider_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_parent_id_status_idx" ON "subscriptions"("parent_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_status_current_period_end_idx" ON "subscriptions"("status", "current_period_end");

-- CreateIndex
CREATE INDEX "payments_parent_id_created_at_idx" ON "payments"("parent_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_refund_id_key" ON "refunds"("provider_refund_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_id_key" ON "invoices"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_provider_invoice_id_key" ON "invoices"("provider_invoice_id");

-- CreateIndex
CREATE INDEX "invoices_parent_id_issued_at_idx" ON "invoices"("parent_id", "issued_at");

-- CreateIndex
CREATE INDEX "payment_events_parent_id_created_at_idx" ON "payment_events"("parent_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider", "event_id");

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_plan_key_fkey" FOREIGN KEY ("plan_key") REFERENCES "plans"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_key_fkey" FOREIGN KEY ("plan_key") REFERENCES "plans"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────
-- Hand-written
-- ─────────────────────────────────────────────────────────────

-- One live subscription per family (a new one starts only after the last ended).
CREATE UNIQUE INDEX "subscriptions_one_live_per_parent" ON "subscriptions" ("parent_id")
  WHERE "status" IN ('ACTIVE', 'PAST_DUE');

ALTER TABLE "plan_prices" ADD CONSTRAINT "plan_prices_amount_positive" CHECK ("amount_minor" > 0);
ALTER TABLE "countries" ADD CONSTRAINT "countries_family_discount_range"
  CHECK ("family_discount_percent" BETWEEN 0 AND 90);
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_amount_positive" CHECK ("amount_minor" > 0);
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_children_positive" CHECK ("children" >= 1);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amounts_valid"
  CHECK ("amount_minor" > 0 AND "refunded_minor" BETWEEN 0 AND "amount_minor");
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_positive" CHECK ("amount_minor" > 0);
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_reason_given" CHECK (length(trim("reason")) >= 3);
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_amount_positive" CHECK ("amount_minor" > 0);

-- Payment events are the record of what happened: never changed or removed.
CREATE FUNCTION "prevent_payment_event_changes"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'payment_events is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "payment_events_append_only"
  BEFORE UPDATE OR DELETE ON "payment_events"
  FOR EACH ROW EXECUTE FUNCTION "prevent_payment_event_changes"();

-- Students who joined before payments get the same 14-day trial, from today.
UPDATE "student_profiles" SET "trial_ends_at" = now() + interval '14 days'
  WHERE "trial_ends_at" IS NULL;

-- Checkout is on (the `payments` feature flag; staff can switch it off per country).
UPDATE "feature_flags" SET "enabled" = true WHERE "key" = 'payments';

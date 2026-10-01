-- CreateEnum
CREATE TYPE "HubQuoteKind" AS ENUM ('MAIN', 'CHANGE');

-- CreateEnum
CREATE TYPE "HubQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "HubTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HubInvoiceKind" AS ENUM ('DEPOSIT', 'FINAL');

-- CreateEnum
CREATE TYPE "HubInvoiceStatus" AS ENUM ('OPEN', 'PAID', 'VOID');

-- CreateTable
CREATE TABLE "hub_quotes" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version" SMALLINT NOT NULL,
    "kind" "HubQuoteKind" NOT NULL,
    "status" "HubQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "price_minor" INTEGER NOT NULL,
    "deposit_minor" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "sow_text" TEXT,
    "sow_version" TEXT,
    "sent_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "approved_by_id" UUID,
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "withdrawn_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_tasks" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "number" SMALLINT NOT NULL,
    "title" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "skill_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimate_minutes" INTEGER NOT NULL,
    "share_bp" INTEGER NOT NULL,
    "status" "HubTaskStatus" NOT NULL DEFAULT 'TODO',
    "assignee_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "done_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_invoices" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "project_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "kind" "HubInvoiceKind" NOT NULL,
    "status" "HubInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "currency" CHAR(3) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "void_reason" TEXT,
    "checkout_session_id" TEXT,
    "distributed_at" TIMESTAMP(3),

    CONSTRAINT "hub_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_payments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_payment_id" TEXT,
    "currency" CHAR(3) NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "recorded_by_id" UUID,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hub_quotes_status_idx" ON "hub_quotes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "hub_quotes_project_id_version_key" ON "hub_quotes"("project_id", "version");

-- CreateIndex
CREATE INDEX "hub_tasks_quote_id_idx" ON "hub_tasks"("quote_id");

-- CreateIndex
CREATE INDEX "hub_tasks_assignee_id_status_idx" ON "hub_tasks"("assignee_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hub_tasks_project_id_number_key" ON "hub_tasks"("project_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "hub_invoices_number_key" ON "hub_invoices"("number");

-- CreateIndex
CREATE INDEX "hub_invoices_org_id_issued_at_idx" ON "hub_invoices"("org_id", "issued_at");

-- CreateIndex
CREATE INDEX "hub_invoices_status_idx" ON "hub_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "hub_invoices_quote_id_kind_key" ON "hub_invoices"("quote_id", "kind");

-- CreateIndex
CREATE INDEX "hub_payments_invoice_id_idx" ON "hub_payments"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "hub_payments_provider_provider_payment_id_key" ON "hub_payments"("provider", "provider_payment_id");

-- AddForeignKey
ALTER TABLE "hub_quotes" ADD CONSTRAINT "hub_quotes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_quotes" ADD CONSTRAINT "hub_quotes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_quotes" ADD CONSTRAINT "hub_quotes_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_tasks" ADD CONSTRAINT "hub_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_tasks" ADD CONSTRAINT "hub_tasks_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "hub_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_tasks" ADD CONSTRAINT "hub_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_invoices" ADD CONSTRAINT "hub_invoices_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_invoices" ADD CONSTRAINT "hub_invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "client_orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_invoices" ADD CONSTRAINT "hub_invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "hub_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_payments" ADD CONSTRAINT "hub_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "hub_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_payments" ADD CONSTRAINT "hub_payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── Written by hand ──────────────────────────────────────────────────────────

ALTER TABLE "hub_quotes" ADD CONSTRAINT "hub_quotes_amounts_check"
  CHECK ("price_minor" >= 0 AND "deposit_minor" >= 0 AND "deposit_minor" <= "price_minor");
ALTER TABLE "hub_tasks" ADD CONSTRAINT "hub_tasks_amounts_check"
  CHECK ("share_bp" BETWEEN 0 AND 10000 AND "estimate_minutes" > 0);
ALTER TABLE "hub_invoices" ADD CONSTRAINT "hub_invoices_amount_check" CHECK ("amount_minor" > 0);
ALTER TABLE "hub_payments" ADD CONSTRAINT "hub_payments_amount_check" CHECK ("amount_minor" > 0);

-- One draft quote per project at a time.
CREATE UNIQUE INDEX "hub_quotes_one_draft" ON "hub_quotes" ("project_id") WHERE "status" = 'DRAFT';

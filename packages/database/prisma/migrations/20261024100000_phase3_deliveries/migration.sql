-- CreateEnum
CREATE TYPE "HubDeliveryStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'CHANGES_REQUESTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "HubChangeStatus" AS ENUM ('OPEN', 'IN_SCOPE', 'QUOTED', 'DECLINED');

-- CreateTable
CREATE TABLE "hub_deliveries" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "quote_id" UUID NOT NULL,
    "number" SMALLINT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "final" BOOLEAN NOT NULL DEFAULT false,
    "commit" TEXT NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "preview_token" TEXT NOT NULL,
    "status" "HubDeliveryStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decided_by_id" UUID,
    "client_comment" TEXT,
    "created_by_id" UUID,

    CONSTRAINT "hub_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_comments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "delivery_id" UUID,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_change_requests" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "delivery_id" UUID,
    "body" TEXT NOT NULL,
    "status" "HubChangeStatus" NOT NULL DEFAULT 'OPEN',
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMP(3),
    "note" TEXT,
    "quote_id" UUID,

    CONSTRAINT "hub_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hub_deliveries_preview_token_key" ON "hub_deliveries"("preview_token");

-- CreateIndex
CREATE INDEX "hub_deliveries_quote_id_idx" ON "hub_deliveries"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "hub_deliveries_project_id_number_key" ON "hub_deliveries"("project_id", "number");

-- CreateIndex
CREATE INDEX "hub_comments_project_id_created_at_idx" ON "hub_comments"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "hub_change_requests_project_id_status_idx" ON "hub_change_requests"("project_id", "status");

-- AddForeignKey
ALTER TABLE "hub_deliveries" ADD CONSTRAINT "hub_deliveries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_deliveries" ADD CONSTRAINT "hub_deliveries_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "hub_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_deliveries" ADD CONSTRAINT "hub_deliveries_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_deliveries" ADD CONSTRAINT "hub_deliveries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_comments" ADD CONSTRAINT "hub_comments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_comments" ADD CONSTRAINT "hub_comments_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "hub_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_comments" ADD CONSTRAINT "hub_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_change_requests" ADD CONSTRAINT "hub_change_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_change_requests" ADD CONSTRAINT "hub_change_requests_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "hub_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_change_requests" ADD CONSTRAINT "hub_change_requests_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "hub_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_change_requests" ADD CONSTRAINT "hub_change_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_change_requests" ADD CONSTRAINT "hub_change_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


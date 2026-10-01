-- CreateEnum
CREATE TYPE "HubStoryStatus" AS ENUM ('AWAITING_PARENT', 'APPROVED', 'PUBLISHED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "hub_stories" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "project_id" UUID,
    "language_code" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "HubStoryStatus" NOT NULL DEFAULT 'AWAITING_PARENT',
    "parent_answered_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hub_stories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hub_stories_status_language_code_published_at_idx" ON "hub_stories"("status", "language_code", "published_at");

-- CreateIndex
CREATE INDEX "hub_stories_parent_id_created_at_idx" ON "hub_stories"("parent_id", "created_at");

-- AddForeignKey
ALTER TABLE "hub_stories" ADD CONSTRAINT "hub_stories_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_stories" ADD CONSTRAINT "hub_stories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_stories" ADD CONSTRAINT "hub_stories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "hub_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_stories" ADD CONSTRAINT "hub_stories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Hand-written: short texts (they're shown on the marketing site).
ALTER TABLE "hub_stories" ADD CONSTRAINT "hub_stories_lengths_check"
  CHECK (char_length("first_name") BETWEEN 1 AND 40
         AND char_length("headline") BETWEEN 3 AND 120
         AND char_length("body") BETWEEN 10 AND 1200);

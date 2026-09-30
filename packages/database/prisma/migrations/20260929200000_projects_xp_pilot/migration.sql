-- Sprint 4: project briefs, students' projects and portfolio, XP events, levels,
-- streaks, feedback, premium granted by hand, and the daily five numbers.

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'SHIPPED');

-- CreateEnum
CREATE TYPE "XpSource" AS ENUM ('CHALLENGE', 'LESSON', 'PROJECT', 'ADMIN');

-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('BUG', 'IDEA', 'PRAISE', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'READ', 'DONE');

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "portfolio_share_token" TEXT,
ADD COLUMN     "xp_total" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "project_briefs" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 100,
    "starter" JSONB NOT NULL,
    "checks" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_brief_translations" (
    "brief_id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hints" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_brief_translations_pkey" PRIMARY KEY ("brief_id","language_code")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "brief_id" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "shipped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "module_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "files" JSONB NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XpSource" NOT NULL,
    "source_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "number" INTEGER NOT NULL,
    "min_xp" INTEGER NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "streaks" (
    "user_id" UUID NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "longest" INTEGER NOT NULL DEFAULT 0,
    "last_goal_day" DATE,
    "daily_goal_xp" INTEGER NOT NULL DEFAULT 20,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streaks_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "kind" "FeedbackKind" NOT NULL,
    "message" TEXT NOT NULL,
    "page_path" TEXT,
    "language_code" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premium_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "granted_by_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "premium_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics_daily" (
    "day" DATE NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "sign_ups" INTEGER NOT NULL DEFAULT 0,
    "first_projects" INTEGER NOT NULL DEFAULT 0,
    "weekly_active" INTEGER NOT NULL DEFAULT 0,
    "paying_parents" INTEGER NOT NULL DEFAULT 0,
    "cancellations" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_daily_pkey" PRIMARY KEY ("day","country_code")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_briefs_module_id_key" ON "project_briefs"("module_id");

-- CreateIndex
CREATE INDEX "projects_brief_id_idx" ON "projects"("brief_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_user_id_brief_id_key" ON "projects"("user_id", "brief_id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_items_project_id_key" ON "portfolio_items"("project_id");

-- CreateIndex
CREATE INDEX "portfolio_items_user_id_published_at_idx" ON "portfolio_items"("user_id", "published_at");

-- CreateIndex
CREATE INDEX "xp_events_user_id_day_idx" ON "xp_events"("user_id", "day");

-- CreateIndex
CREATE INDEX "xp_events_created_at_idx" ON "xp_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "xp_events_user_id_source_source_id_key" ON "xp_events"("user_id", "source", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "levels_min_xp_key" ON "levels"("min_xp");

-- CreateIndex
CREATE INDEX "feedback_status_created_at_idx" ON "feedback"("status", "created_at");

-- CreateIndex
CREATE INDEX "premium_grants_user_id_ends_at_idx" ON "premium_grants"("user_id", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_portfolio_share_token_key" ON "student_profiles"("portfolio_share_token");

-- AddForeignKey
ALTER TABLE "project_briefs" ADD CONSTRAINT "project_briefs_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_brief_translations" ADD CONSTRAINT "project_brief_translations_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "project_briefs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_brief_translations" ADD CONSTRAINT "project_brief_translations_language_code_fkey" FOREIGN KEY ("language_code") REFERENCES "languages"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "project_briefs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_grants" ADD CONSTRAINT "premium_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_grants" ADD CONSTRAINT "premium_grants_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premium_grants" ADD CONSTRAINT "premium_grants_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Hand-written: XP is a history. Totals, streaks and leaderboards are rebuilt
-- from xp_events, so its rows are never changed or removed (corrections are new
-- rows with source ADMIN).
-- ─────────────────────────────────────────────────────────────
CREATE FUNCTION "prevent_xp_event_changes"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'xp_events is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "xp_events_append_only"
  BEFORE UPDATE OR DELETE ON "xp_events"
  FOR EACH ROW EXECUTE FUNCTION "prevent_xp_event_changes"();

ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_amount_not_zero" CHECK ("amount" <> 0);

-- ─────────────────────────────────────────────────────────────
-- Hand-written: XP for work done before XP existed (Sprint 3), so progress and
-- XP agree: each challenge's first passing submission, each completed lesson.
-- The daily cap doesn't apply to this history.
-- ─────────────────────────────────────────────────────────────
INSERT INTO "xp_events" ("id", "user_id", "amount", "source", "source_id", "day", "created_at")
SELECT gen_random_uuid(), s."user_id", c."xp", 'CHALLENGE', s."challenge_id",
       MIN(s."created_at")::date, MIN(s."created_at")
FROM "submissions" s
JOIN "challenges" c ON c."id" = s."challenge_id"
JOIN "student_profiles" sp ON sp."user_id" = s."user_id"
WHERE s."passed" AND c."xp" > 0
GROUP BY s."user_id", s."challenge_id", c."xp";

INSERT INTO "xp_events" ("id", "user_id", "amount", "source", "source_id", "day", "created_at")
SELECT gen_random_uuid(), lp."user_id", l."xp", 'LESSON', lp."lesson_id",
       lp."completed_at"::date, lp."completed_at"
FROM "lesson_progress" lp
JOIN "lessons" l ON l."id" = lp."lesson_id"
JOIN "student_profiles" sp ON sp."user_id" = lp."user_id"
WHERE lp."status" = 'COMPLETED' AND lp."completed_at" IS NOT NULL AND l."xp" > 0;

UPDATE "student_profiles" sp
SET "xp_total" = totals."xp"
FROM (SELECT "user_id", SUM("amount") AS "xp" FROM "xp_events" GROUP BY "user_id") totals
WHERE totals."user_id" = sp."user_id";

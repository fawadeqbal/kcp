-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('SKILL', 'SHIPPING', 'STREAK', 'LEVEL', 'LEADERBOARD', 'HELPING');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "BoardPeriod" AS ENUM ('WEEK', 'SEASON');

-- CreateEnum
CREATE TYPE "BoardScope" AS ENUM ('GLOBAL', 'COUNTRY', 'REGION', 'CITY');

-- AlterEnum
ALTER TYPE "ChallengeType" ADD VALUE 'PYTHON';

-- AlterTable
ALTER TABLE "streaks" ADD COLUMN     "freezes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "xp_events" ADD COLUMN     "reason" TEXT;

-- CreateTable
CREATE TABLE "badges" (
    "key" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "criteria" JSONB NOT NULL,
    "icon" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "user_id" UUID NOT NULL,
    "badge_key" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen_at" TIMESTAMP(3),
    "awarded_by_id" UUID,
    "reason" TEXT,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id","badge_key")
);

-- CreateTable
CREATE TABLE "leaderboard_seasons" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_day" DATE NOT NULL,
    "end_day" DATE,
    "status" "SeasonStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" UUID,
    "ended_by_id" UUID,
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_results" (
    "id" UUID NOT NULL,
    "period" "BoardPeriod" NOT NULL,
    "period_key" TEXT NOT NULL,
    "season_id" UUID,
    "scope" "BoardScope" NOT NULL,
    "scope_id" TEXT NOT NULL DEFAULT '',
    "rank" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,
    "xp" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_badges_badge_key_idx" ON "user_badges"("badge_key");

-- CreateIndex
CREATE INDEX "leaderboard_seasons_status_idx" ON "leaderboard_seasons"("status");

-- CreateIndex
CREATE INDEX "leaderboard_results_period_period_key_scope_scope_id_rank_idx" ON "leaderboard_results"("period", "period_key", "scope", "scope_id", "rank");

-- CreateIndex
CREATE INDEX "leaderboard_results_user_id_idx" ON "leaderboard_results"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_results_period_period_key_scope_scope_id_user_i_key" ON "leaderboard_results"("period", "period_key", "scope", "scope_id", "user_id");

-- CreateIndex
CREATE INDEX "xp_events_day_idx" ON "xp_events"("day");

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_key_fkey" FOREIGN KEY ("badge_key") REFERENCES "badges"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_results" ADD CONSTRAINT "leaderboard_results_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "leaderboard_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_results" ADD CONSTRAINT "leaderboard_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-written (see CONVENTIONS.md): rules the schema language can't express.

-- At most one active leaderboard season at a time.
CREATE UNIQUE INDEX "leaderboard_seasons_one_active" ON "leaderboard_seasons" ("status") WHERE "status" = 'ACTIVE';

-- A student holds at most two streak freezes.
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_freezes_range" CHECK ("freezes" BETWEEN 0 AND 2);

-- XP only goes down through a staff correction, and always with a written reason.
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_removal_needs_reason"
  CHECK ("amount" > 0 OR ("source" = 'ADMIN' AND "reason" IS NOT NULL AND length(trim("reason")) >= 3));

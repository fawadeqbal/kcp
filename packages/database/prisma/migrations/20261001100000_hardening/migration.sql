-- A safety report is its own kind of feedback (shown first to staff).
ALTER TYPE "FeedbackKind" ADD VALUE 'SAFETY';

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "authenticated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "trials_started" SMALLINT NOT NULL DEFAULT 0;


-- Everything already imported stays visible: published now. From here on, new
-- modules imported in staging and production wait for staff to publish them.
UPDATE "modules" SET "published_at" = CURRENT_TIMESTAMP WHERE "is_active";

-- Sessions from before this change: their start is the best guess of the login.
UPDATE "sessions" SET "authenticated_at" = "created_at";

-- Trials already started: one per child linked to the parent today.
UPDATE "users" AS u
SET "trials_started" = t.started
FROM (
  SELECT l."parent_id", COUNT(*)::SMALLINT AS started
  FROM "parent_child_links" l
  JOIN "student_profiles" p ON p."user_id" = l."child_id"
  WHERE p."trial_ends_at" IS NOT NULL
  GROUP BY l."parent_id"
) AS t
WHERE u."id" = t."parent_id";

-- Flags no code reads: switching them in the admin panel would do nothing.
DELETE FROM "feature_flags" WHERE "key" IN ('public_leaderboards', 'python_lessons');

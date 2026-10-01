-- CreateEnum
CREATE TYPE "LeagueOutcome" AS ENUM ('PROMOTED', 'STAYED', 'RELEGATED');

-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- AlterTable
ALTER TABLE "student_profiles" ADD COLUMN     "friend_code" TEXT,
ADD COLUMN     "league_tier" SMALLINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "league_groups" (
    "id" UUID NOT NULL,
    "week_key" TEXT NOT NULL,
    "tier" SMALLINT NOT NULL,
    "level_band" SMALLINT NOT NULL,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_memberships" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "week_key" TEXT NOT NULL,
    "tier" SMALLINT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "last_xp_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rank" INTEGER,
    "outcome" "LeagueOutcome",
    "seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friend_requests" (
    "id" UUID NOT NULL,
    "from_id" UUID NOT NULL,
    "to_id" UUID NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "from_parent_approved_at" TIMESTAMP(3),
    "from_parent_id" UUID,
    "to_parent_approved_at" TIMESTAMP(3),
    "to_parent_id" UUID,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friendships" (
    "id" UUID NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "request_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "league_groups_week_key_tier_level_band_closed_at_idx" ON "league_groups"("week_key", "tier", "level_band", "closed_at");

-- CreateIndex
CREATE INDEX "league_groups_closed_at_week_key_idx" ON "league_groups"("closed_at", "week_key");

-- CreateIndex
CREATE INDEX "league_memberships_group_id_xp_idx" ON "league_memberships"("group_id", "xp");

-- CreateIndex
CREATE UNIQUE INDEX "league_memberships_user_id_week_key_key" ON "league_memberships"("user_id", "week_key");

-- CreateIndex
CREATE INDEX "friend_requests_from_id_status_idx" ON "friend_requests"("from_id", "status");

-- CreateIndex
CREATE INDEX "friend_requests_to_id_status_idx" ON "friend_requests"("to_id", "status");

-- CreateIndex
CREATE INDEX "friend_requests_status_created_at_idx" ON "friend_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_request_id_key" ON "friendships"("request_id");

-- CreateIndex
CREATE INDEX "friendships_user_b_id_idx" ON "friendships"("user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "friendships_user_a_id_user_b_id_key" ON "friendships"("user_a_id", "user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_friend_code_key" ON "student_profiles"("friend_code");

-- AddForeignKey
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "league_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_memberships" ADD CONSTRAINT "league_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- One open request per pair of students (whoever asked).
CREATE UNIQUE INDEX "friend_requests_pending_pair" ON "friend_requests" (LEAST("from_id", "to_id"), GREATEST("from_id", "to_id")) WHERE "status" = 'PENDING';

-- Friendships are stored once, with the smaller ID first.
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_ordered" CHECK ("user_a_id" < "user_b_id");

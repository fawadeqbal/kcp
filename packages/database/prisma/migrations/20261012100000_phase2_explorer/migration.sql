-- AlterEnum
ALTER TYPE "ChallengeType" ADD VALUE 'BLOCKS';

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "stage" JSONB;

-- AlterTable
ALTER TABLE "project_briefs" ADD COLUMN     "stage" JSONB;

-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "age_from" INTEGER,
ADD COLUMN     "age_to" INTEGER;

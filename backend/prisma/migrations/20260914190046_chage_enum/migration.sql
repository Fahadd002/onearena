/*
  Warnings:

  - The values [DRAFT,PENDING_APPROVAL] on the enum `TurfStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TurfStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'REJECTED');
ALTER TABLE "public"."turf" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "turf" ALTER COLUMN "status" TYPE "TurfStatus_new" USING ("status"::text::"TurfStatus_new");
ALTER TYPE "TurfStatus" RENAME TO "TurfStatus_old";
ALTER TYPE "TurfStatus_new" RENAME TO "TurfStatus";
DROP TYPE "public"."TurfStatus_old";
ALTER TABLE "turf" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "owner_subscription" ALTER COLUMN "autoRenew" SET DEFAULT false;

-- AlterTable
ALTER TABLE "turf" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

/*
  Warnings:

  - The values [KICKED_OFF,COMPLETED,EXPIRED] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `advanceAmount` on the `booking` table. All the data in the column will be lost.
  - You are about to drop the column `advanceMethod` on the `booking` table. All the data in the column will be lost.
  - You are about to drop the column `advanceSenderMobile` on the `booking` table. All the data in the column will be lost.
  - You are about to drop the column `advanceTransactionId` on the `booking` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('PREBOOKED', 'CONFIRMED', 'CANCELLED');
ALTER TABLE "public"."booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "public"."BookingStatus_old";
ALTER TABLE "booking" ALTER COLUMN "status" SET DEFAULT 'PREBOOKED';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SlotSatus" ADD VALUE 'PLAYED';
ALTER TYPE "SlotSatus" ADD VALUE 'ABANDONED';
ALTER TYPE "SlotSatus" ADD VALUE 'ABSENT';

-- AlterTable
ALTER TABLE "booking" DROP COLUMN "advanceAmount",
DROP COLUMN "advanceMethod",
DROP COLUMN "advanceSenderMobile",
DROP COLUMN "advanceTransactionId";

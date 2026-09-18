/*
  Warnings:

  - A unique constraint covering the columns `[tierLevel]` on the table `subscription_plan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `action` to the `subscription_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `subscription_log` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tierLevel` to the `subscription_plan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionAction" AS ENUM ('TRIAL_STARTED', 'SUBSCRIBED', 'RENEWED', 'UPGRADED', 'CANCELLED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "subscription_log" DROP CONSTRAINT "subscription_log_subscriptionId_fkey";

-- AlterTable
ALTER TABLE "subscription_log" ADD COLUMN     "action" "SubscriptionAction" NOT NULL,
ADD COLUMN     "status" "SubscriptionStatus" NOT NULL;

-- AlterTable
ALTER TABLE "subscription_plan" ADD COLUMN     "tierLevel" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_tierLevel_key" ON "subscription_plan"("tierLevel");

-- AddForeignKey
ALTER TABLE "subscription_log" ADD CONSTRAINT "subscription_log_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

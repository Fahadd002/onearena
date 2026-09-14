/*
  Warnings:

  - You are about to drop the column `description` on the `subscription_plan` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `subscription_plan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "subscription_plan" DROP COLUMN "description",
DROP COLUMN "features";

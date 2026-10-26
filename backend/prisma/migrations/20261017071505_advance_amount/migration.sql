/*
  Warnings:

  - Added the required column `advancePaymentAmount` to the `turf` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "turf" ADD COLUMN     "advancePaymentAmount" DECIMAL(12,2) NOT NULL;

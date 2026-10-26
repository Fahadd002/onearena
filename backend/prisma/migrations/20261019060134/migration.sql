-- AlterTable
ALTER TABLE "package" ALTER COLUMN "price" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "turf" ALTER COLUMN "defaultSlotPrice" SET DEFAULT 0,
ALTER COLUMN "advancePaymentAmount" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "turf_price_rule" ALTER COLUMN "price" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "turf_slot" ALTER COLUMN "price" SET DEFAULT 0;

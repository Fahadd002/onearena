-- AlterTable
ALTER TABLE "booking" ADD COLUMN     "advanceAmount" DECIMAL(12,2),
ADD COLUMN     "advanceMethod" "PaymentMethod",
ADD COLUMN     "advanceSenderMobile" TEXT,
ADD COLUMN     "advanceTransactionId" TEXT;

-- Add tierLevel column to subscription_plan
ALTER TABLE "subscription_plan" ADD COLUMN "tierLevel" INTEGER NOT NULL DEFAULT 0;

-- Create unique index for tierLevel
CREATE UNIQUE INDEX "subscription_plan_tierLevel_key" ON "subscription_plan"("tierLevel");
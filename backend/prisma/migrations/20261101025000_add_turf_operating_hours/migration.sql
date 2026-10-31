-- Existing turfs have no stored hours; backfill a full-day operating window.
ALTER TABLE "turf"
  ADD COLUMN "openingTime" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "closingTime" INTEGER NOT NULL DEFAULT 1439;

ALTER TABLE "turf"
  ALTER COLUMN "openingTime" DROP DEFAULT,
  ALTER COLUMN "closingTime" DROP DEFAULT;

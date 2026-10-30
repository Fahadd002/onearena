ALTER TABLE "turf" ADD COLUMN "establishedSince" DATE;

UPDATE "turf"
SET "establishedSince" = "createdAt"::date
WHERE "establishedSince" IS NULL;

ALTER TABLE "turf" ALTER COLUMN "establishedSince" SET NOT NULL;

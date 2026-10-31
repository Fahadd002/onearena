ALTER TABLE "subscription"
  ALTER COLUMN "startDate" TYPE DATE USING "startDate"::date,
  ALTER COLUMN "endDate" TYPE DATE USING "endDate"::date,
  ALTER COLUMN "freeStart" TYPE DATE USING "freeStart"::date,
  ALTER COLUMN "freeEnd" TYPE DATE USING "freeEnd"::date;

ALTER TABLE "subscription_log"
  ALTER COLUMN "startDate" TYPE DATE USING "startDate"::date,
  ALTER COLUMN "endDate" TYPE DATE USING "endDate"::date;

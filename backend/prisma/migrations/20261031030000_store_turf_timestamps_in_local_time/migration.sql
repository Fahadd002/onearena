UPDATE "turf"
SET
  "createdAt" = ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE "timezone",
  "updatedAt" = ("updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE "timezone";

UPDATE "turf_slot" AS slot
SET
  "createdAt" = (slot."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE turf."timezone",
  "updatedAt" = (slot."updatedAt" AT TIME ZONE 'UTC') AT TIME ZONE turf."timezone"
FROM "turf" AS turf
WHERE slot."turfId" = turf."id";

CREATE OR REPLACE FUNCTION set_turf_local_timestamps()
RETURNS TRIGGER AS $$
DECLARE
  local_now TIMESTAMP(3);
BEGIN
  local_now := clock_timestamp() AT TIME ZONE NEW."timezone";

  IF TG_OP = 'INSERT' THEN
    NEW."createdAt" := local_now;
  END IF;
  NEW."updatedAt" := local_now;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "turf_local_timestamps"
BEFORE INSERT OR UPDATE ON "turf"
FOR EACH ROW
EXECUTE FUNCTION set_turf_local_timestamps();

CREATE OR REPLACE FUNCTION set_turf_slot_local_timestamps()
RETURNS TRIGGER AS $$
DECLARE
  turf_timezone TEXT;
  local_now TIMESTAMP(3);
BEGIN
  SELECT "timezone"
  INTO turf_timezone
  FROM "turf"
  WHERE "id" = NEW."turfId";

  IF turf_timezone IS NULL THEN
    RAISE EXCEPTION 'Cannot determine timezone for turf slot %', NEW."turfId";
  END IF;

  local_now := clock_timestamp() AT TIME ZONE turf_timezone;

  IF TG_OP = 'INSERT' THEN
    NEW."createdAt" := local_now;
  END IF;
  NEW."updatedAt" := local_now;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "turf_slot_local_timestamps"
BEFORE INSERT OR UPDATE ON "turf_slot"
FOR EACH ROW
EXECUTE FUNCTION set_turf_slot_local_timestamps();

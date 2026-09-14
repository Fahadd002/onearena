-- Add quarterly billing support to subscription periods.
ALTER TYPE "FixedPeriod" ADD VALUE IF NOT EXISTS 'QUARTERLY' AFTER 'MONTHLY';

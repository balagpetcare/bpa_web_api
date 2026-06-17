-- Add cancelled and pending_review values to PaymentStatus enum.
-- ALTER TYPE ADD VALUE is safe in PostgreSQL 12+ inside a transaction.
-- IF NOT EXISTS prevents errors on re-run (idempotent).

ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'pending_review';

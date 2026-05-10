-- Migration: Add sample collection requirements to lims_orders
-- Created: 2026-01-07

-- Add sample collection requirement fields to lims_orders table
ALTER TABLE "lims_orders" ADD COLUMN "sample_type" text;
ALTER TABLE "lims_orders" ADD COLUMN "container_type" text;
ALTER TABLE "lims_orders" ADD COLUMN "volume" text;
ALTER TABLE "lims_orders" ADD COLUMN "volume_unit" text DEFAULT 'mL';
ALTER TABLE "lims_orders" ADD COLUMN "sample_recommendations" jsonb;

-- Add index for sample type queries
CREATE INDEX IF NOT EXISTS "lims_orders_sample_type_idx" ON "lims_orders" ("sample_type");

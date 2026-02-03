-- Clear existing test reference ranges
DELETE FROM test_reference_ranges WHERE workspaceid = 'fa9fb036-a7eb-49af-890c-54406dad139d';

-- This file prepares the database for seeding
-- Run the API endpoint after this: POST /api/admin/seed-test-references

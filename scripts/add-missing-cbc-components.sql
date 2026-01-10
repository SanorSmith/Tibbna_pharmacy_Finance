-- Add missing CBC component tests to test_reference_ranges table
-- Run this with: psql $DATABASE_URL -f scripts/add-missing-cbc-components.sql

INSERT INTO test_reference_ranges (
  workspaceid, testcode, testname, category, unit,
  agegroup, sex, referencemin, referencemax, referencetext,
  paniclow, panichigh, panictext, notes,
  isactive, createdby, createdat
) VALUES 
  -- MCV - Mean Corpuscular Volume
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'MCV', 'Mean Corpuscular Volume', 'Hematology', 'fL',
   'ALL', 'ANY', 80.0000, 100.0000, NULL,
   60.0000, 120.0000, NULL, 'Mean volume of red blood cells',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- MCH - Mean Corpuscular Hemoglobin
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'MCH', 'Mean Corpuscular Hemoglobin', 'Hematology', 'pg',
   'ALL', 'ANY', 27.0000, 32.0000, NULL,
   20.0000, 40.0000, NULL, 'Average amount of hemoglobin per red blood cell',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- MCHC - Mean Corpuscular Hemoglobin Concentration
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'MCHC', 'Mean Corpuscular Hemoglobin Concentration', 'Hematology', 'g/dL',
   'ALL', 'ANY', 32.0000, 36.0000, NULL,
   28.0000, 40.0000, NULL, 'Average concentration of hemoglobin in red blood cells',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- RDW - Red Cell Distribution Width
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'RDW', 'Red Cell Distribution Width', 'Hematology', '%',
   'ALL', 'ANY', 11.5000, 14.5000, NULL,
   NULL, 20.0000, NULL, 'Variation in red blood cell size',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW())
ON CONFLICT DO NOTHING;

-- Verify the insert
SELECT testcode, testname, unit, referencemin, referencemax 
FROM test_reference_ranges 
WHERE testcode IN ('MCV', 'MCH', 'MCHC', 'RDW')
ORDER BY testcode;

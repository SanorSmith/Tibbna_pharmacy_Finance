-- Add ALL/ANY fallback entries for HGB, RBC, WBC, HCT
-- These provide default reference ranges when no specific age/sex match is found

INSERT INTO test_reference_ranges (
  workspaceid, testcode, testname, category, unit,
  agegroup, sex, referencemin, referencemax, referencetext,
  paniclow, panichigh, panictext, notes,
  isactive, createdby, createdat
) VALUES 
  -- HGB - Hemoglobin (Adult average)
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'HGB', 'Hemoglobin', 'Hematology', 'g/dL',
   'ALL', 'ANY', 12.0000, 16.0000, NULL,
   7.0000, 20.0000, NULL, 'Hemoglobin - general reference range',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- RBC - Red Blood Cells (Adult average)
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'RBC', 'Red Blood Cells', 'Hematology', 'million/µL',
   'ALL', 'ANY', 4.0000, 5.5000, NULL,
   2.5000, 7.0000, NULL, 'Red blood cells - general reference range',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- WBC - White Blood Cells (Adult/Pediatric average)
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'WBC', 'White Blood Cells', 'Hematology', 'cells/µL',
   'ALL', 'ANY', 4000.0000, 11000.0000, NULL,
   2000.0000, 30000.0000, NULL, 'White blood cells - general reference range',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- HCT - Hematocrit (Adult average)
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'HCT', 'Hematocrit', 'Hematology', '%',
   'ALL', 'ANY', 36.0000, 48.0000, NULL,
   25.0000, 60.0000, NULL, 'Hematocrit - general reference range',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW())
ON CONFLICT DO NOTHING;

-- Verify the insert
SELECT testcode, testname, agegroup, sex, unit, referencemin, referencemax 
FROM test_reference_ranges 
WHERE testcode IN ('HGB', 'RBC', 'WBC', 'HCT') 
  AND agegroup = 'ALL' 
  AND sex = 'ANY'
ORDER BY testcode;

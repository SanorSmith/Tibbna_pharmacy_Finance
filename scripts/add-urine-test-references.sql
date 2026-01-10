-- Add urine test reference ranges to test_reference_ranges table

INSERT INTO test_reference_ranges (
  workspaceid, testcode, testname, category, unit,
  agegroup, sex, referencemin, referencemax, referencetext,
  paniclow, panichigh, panictext, notes,
  isactive, createdby, createdat
) VALUES 
  -- U-PROT - Urine Protein
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'U-PROT', 'Urine Protein', 'Urinalysis', 'mg/dL',
   'ALL', 'ANY', NULL, 10.0000, '< 10 mg/dL (Negative to Trace)',
   NULL, 300.0000, NULL, 'Normal urine protein levels',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- U-GLU - Urine Glucose
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'U-GLU', 'Urine Glucose', 'Urinalysis', 'mg/dL',
   'ALL', 'ANY', NULL, 15.0000, '< 15 mg/dL (Negative)',
   NULL, 1000.0000, NULL, 'Normal urine glucose levels',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- U-BLOOD - Urine Blood
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'U-BLOOD', 'Urine Blood', 'Urinalysis', 'Present/Absent',
   'ALL', 'ANY', NULL, NULL, 'Negative (Absent)',
   NULL, NULL, NULL, 'Blood should be absent in normal urine',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- U-BILI - Urine Bilirubin
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'U-BILI', 'Urine Bilirubin', 'Urinalysis', 'Present/Absent',
   'ALL', 'ANY', NULL, NULL, 'Negative (Absent)',
   NULL, NULL, NULL, 'Bilirubin should be absent in normal urine',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- U-NIT-LE - Urine Nitrite/Leukocyte Esterase
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'U-NIT-LE', 'Urine Nitrite/Leukocyte Esterase', 'Urinalysis', 'Present/Absent',
   'ALL', 'ANY', NULL, NULL, 'Negative (Absent)',
   NULL, NULL, NULL, 'Indicates possible urinary tract infection if positive',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- U-24H-CR - 24-Hour Urine Creatinine
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'U-24H-CR', '24-Hour Urine Creatinine', 'Urinalysis', 'g/24h',
   'ALL', 'M', 1.0000, 2.0000, '1.0-2.0 g/24h',
   0.5000, 3.0000, NULL, '24-hour urine creatinine for males',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'U-24H-CR', '24-Hour Urine Creatinine', 'Urinalysis', 'g/24h',
   'ALL', 'F', 0.8000, 1.8000, '0.8-1.8 g/24h',
   0.4000, 2.5000, NULL, '24-hour urine creatinine for females',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW()),
  
  -- U-KET - Urine Ketones
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'U-KET', 'Urine Ketones', 'Urinalysis', 'Present/Absent',
   'ALL', 'ANY', NULL, NULL, 'Negative (Absent)',
   NULL, NULL, NULL, 'Ketones should be absent in normal urine',
   'Y', '5037145a-971e-4348-8e44-f7a7ca96a35f', NOW())
ON CONFLICT DO NOTHING;

-- Verify the insert
SELECT testcode, testname, unit, referencetext, referencemin, referencemax 
FROM test_reference_ranges 
WHERE testcode IN ('U-PROT', 'U-GLU', 'U-BLOOD', 'U-BILI', 'U-NIT-LE', 'U-24H-CR', 'U-KET')
ORDER BY testcode;

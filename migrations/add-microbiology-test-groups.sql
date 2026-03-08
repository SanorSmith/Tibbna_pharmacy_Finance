-- Add test groups to all lab tests
-- This organizes tests into logical groups for better UI display in lab order forms

-- MICROBIOLOGY TEST GROUPS

-- Blood Culture group
UPDATE test_reference_ranges 
SET grouptests = 'Blood Culture'
WHERE testcode IN ('BC-M', 'BC-A') AND labtype = 'Microbiology';

-- Sputum Culture group
UPDATE test_reference_ranges 
SET grouptests = 'Sputum Culture'
WHERE testcode = 'SPUTUM' AND labtype = 'Microbiology';

-- Urine Culture group
UPDATE test_reference_ranges 
SET grouptests = 'Urine Culture'
WHERE testcode = 'URINE' AND labtype = 'Microbiology';

-- Stool Culture group
UPDATE test_reference_ranges 
SET grouptests = 'Stool Culture'
WHERE testcode = 'STOOL' AND labtype = 'Microbiology';

-- Wound Culture group
UPDATE test_reference_ranges 
SET grouptests = 'Wound Culture'
WHERE testcode = 'WOUND' AND labtype = 'Microbiology';

-- Throat Swab group
UPDATE test_reference_ranges 
SET grouptests = 'Throat Swab'
WHERE testcode = 'THROAT' AND labtype = 'Microbiology';

-- Nasal Swab group
UPDATE test_reference_ranges 
SET grouptests = 'Nasal Swab'
WHERE testcode = 'NASAL' AND labtype = 'Microbiology';

-- CSF Culture group
UPDATE test_reference_ranges 
SET grouptests = 'CSF Culture'
WHERE testcode = 'CSF' AND labtype = 'Microbiology';

-- BIOCHEMISTRY TEST GROUPS

-- Electrolytes group
UPDATE test_reference_ranges 
SET grouptests = 'Electrolytes'
WHERE testcode IN ('NA', 'K') AND labtype = 'Biochemistry';

-- Renal Function group
UPDATE test_reference_ranges 
SET grouptests = 'Renal Function'
WHERE testcode IN ('CREAT', 'GLU') AND labtype = 'Biochemistry';

-- HEMATOLOGY TEST GROUPS

-- Complete Blood Count group
UPDATE test_reference_ranges 
SET grouptests = 'Complete Blood Count'
WHERE testcode IN ('CBC', 'HGB', 'WBC', 'PLT') AND labtype = 'Hematology';

-- Seed Reference Ranges for Pathology and Cytology Tests
-- Run this SQL in your database

-- Replace 'YOUR_WORKSPACE_ID' with your actual workspace ID
-- Replace 'YOUR_USER_ID' with your actual user ID

INSERT INTO test_reference_ranges (
  workspaceid,
  testcode,
  testname,
  category,
  unit,
  agegroup,
  sex,
  referencetext,
  notes,
  isactive,
  createdby,
  createdat
) VALUES
  -- Biopsy Examination
  (
    'fa9fb036-a7eb-49af-890c-54406dad139d',
    'BIOPSY',
    'Biopsy Examination',
    'Pathology',
    'N/A',
    'ALL',
    'ANY',
    'Normal tissue architecture with no evidence of malignancy',
    'Descriptive pathology report required',
    'Y',
    (SELECT userid FROM users LIMIT 1),
    NOW()
  ),
  -- Cervical Cancer Screening (Pap Smear)
  (
    'fa9fb036-a7eb-49af-890c-54406dad139d',
    'PAP_SMEAR',
    'Cervical Cancer Screening (Pap Smear)',
    'Cytology',
    'N/A',
    'ALL',
    'F',
    'Negative for intraepithelial lesion or malignancy (NILM)',
    'Bethesda System classification',
    'Y',
    (SELECT userid FROM users LIMIT 1),
    NOW()
  ),
  -- FNAC
  (
    'fa9fb036-a7eb-49af-890c-54406dad139d',
    'FNAC',
    'FNAC',
    'Cytology',
    'N/A',
    'ALL',
    'ANY',
    'Benign cytology with no evidence of malignancy',
    'Fine Needle Aspiration Cytology - descriptive report',
    'Y',
    (SELECT userid FROM users LIMIT 1),
    NOW()
  ),
  -- Histopathology
  (
    'fa9fb036-a7eb-49af-890c-54406dad139d',
    'HISTOPATH',
    'Histopathology',
    'Pathology',
    'N/A',
    'ALL',
    'ANY',
    'Normal histological findings',
    'Microscopic examination of tissue',
    'Y',
    (SELECT userid FROM users LIMIT 1),
    NOW()
  ),
  -- Frozen Section
  (
    'fa9fb036-a7eb-49af-890c-54406dad139d',
    'FROZEN_SECTION',
    'Frozen Section',
    'Pathology',
    'N/A',
    'ALL',
    'ANY',
    'Benign tissue',
    'Intraoperative consultation',
    'Y',
    (SELECT userid FROM users LIMIT 1),
    NOW()
  )
ON CONFLICT (rangeid) DO NOTHING;

-- Verify the data was inserted
SELECT testcode, testname, unit, referencetext 
FROM test_reference_ranges 
WHERE testcode IN ('BIOPSY', 'PAP_SMEAR', 'FNAC', 'HISTOPATH', 'FROZEN_SECTION');

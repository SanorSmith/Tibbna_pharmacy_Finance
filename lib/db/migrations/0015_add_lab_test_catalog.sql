-- Migration: Add common lab tests to catalog
-- This adds the basic test codes used by the LIMS order system

INSERT INTO lab_test_catalog (
  workspaceid, 
  testcode, 
  testname, 
  testcategory, 
  specimentype, 
  description, 
  turnaroundtime, 
  isactive
) VALUES 
  -- Hematology Tests
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'CBC', 'Complete Blood Count', 'Hematology', 'Blood', 'Measures different components of blood including RBCs, WBCs, hemoglobin, hematocrit, and platelets', '24 hours', true),
  
  -- Chemistry Tests
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'CMP', 'Comprehensive Metabolic Panel', 'Chemistry', 'Blood', 'Measures glucose, electrolytes, kidney function (BUN, creatinine), and liver function (ALT, AST, bilirubin)', '24 hours', true),
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'GLU', 'Glucose', 'Chemistry', 'Blood', 'Measures blood sugar level', '2 hours', true),
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'CHOL', 'Cholesterol', 'Chemistry', 'Blood', 'Measures total cholesterol levels', '24 hours', true),
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'TRIG', 'Triglycerides', 'Chemistry', 'Blood', 'Measures triglyceride levels', '24 hours', true),
  
  -- Urinalysis
  ('fa9fb036-a7eb-49af-890c-54406dad139d', 'UA', 'Urinalysis', 'Urinalysis', 'Urine', 'Analyzes urine composition including pH, protein, glucose, ketones, blood, and microscopy', '4 hours', true)
ON CONFLICT (testcode, workspaceid) DO NOTHING;

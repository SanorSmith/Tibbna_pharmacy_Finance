-- Add common microbiology tests to test_reference_ranges
-- These are frequently used tests that should have reference data

DO $$
DECLARE
    v_userid UUID;
    v_workspaceid UUID := 'fa9fb036-a7eb-49af-890c-54406dad139d';
BEGIN
    -- Get first user ID
    SELECT userid INTO v_userid FROM users LIMIT 1;
    
    -- Blood Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'BC-M', 'Blood for C/S', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'BC-M' AND workspaceid = v_workspaceid);
    
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'BC-A', 'Blood for C/S', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'BC-A' AND workspaceid = v_workspaceid);
    
    -- Urine Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'URINE', 'Urine Culture', 'Microbiology', 'CFU/mL', '<10,000 CFU/mL', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'URINE' AND workspaceid = v_workspaceid);
    
    -- Stool Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'STOOL', 'Stool Culture', 'Microbiology', 'Present/Absent', 'Normal flora', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'STOOL' AND workspaceid = v_workspaceid);
    
    -- Wound Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'WOUND', 'Wound Culture', 'Microbiology', 'Present/Absent', 'No pathogen isolated', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'WOUND' AND workspaceid = v_workspaceid);
    
    -- Throat/Nasal Swabs
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'THROAT', 'Throat Swab', 'Microbiology', 'Present/Absent', 'Normal flora', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'THROAT' AND workspaceid = v_workspaceid);
    
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'NASAL', 'Nasal Swab', 'Microbiology', 'Present/Absent', 'Normal flora', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'NASAL' AND workspaceid = v_workspaceid);
    
    -- CSF Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'CSF', 'CSF Culture', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'CSF' AND workspaceid = v_workspaceid);
    
    -- Common Biochemistry Tests
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencemin, referencemax, isactive, workspaceid, createdby)
    SELECT 'GLU', 'Glucose', 'Biochemistry', 'mg/dL', '70', '100', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'GLU' AND workspaceid = v_workspaceid);
    
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencemin, referencemax, isactive, workspaceid, createdby)
    SELECT 'CREAT', 'Creatinine', 'Biochemistry', 'mg/dL', '0.6', '1.2', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'CREAT' AND workspaceid = v_workspaceid);
    
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencemin, referencemax, isactive, workspaceid, createdby)
    SELECT 'NA', 'Sodium', 'Biochemistry', 'mmol/L', '135', '145', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'NA' AND workspaceid = v_workspaceid);
    
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencemin, referencemax, isactive, workspaceid, createdby)
    SELECT 'K', 'Potassium', 'Biochemistry', 'mmol/L', '3.5', '5.0', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'K' AND workspaceid = v_workspaceid);
    
    -- Common Hematology Tests
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'CBC', 'Complete Blood Count', 'Hematology', 'Various', 'WBC 4.5-11; Hgb M 13.5-17.5/F 12-16; Plt 150-400', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'CBC' AND workspaceid = v_workspaceid);
    
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'HGB', 'Hemoglobin', 'Hematology', 'g/dL', 'M: 13.5-17.5, F: 12-16', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'HGB' AND workspaceid = v_workspaceid);
    
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'WBC', 'White Blood Cell Count', 'Hematology', 'x10^3/uL', '4.5-11.0', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'WBC' AND workspaceid = v_workspaceid);
    
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    SELECT 'PLT', 'Platelet Count', 'Hematology', 'x10^3/uL', '150-400', 'Y', v_workspaceid, v_userid
    WHERE NOT EXISTS (SELECT 1 FROM test_reference_ranges WHERE testcode = 'PLT' AND workspaceid = v_workspaceid);
    
    RAISE NOTICE 'Successfully added common microbiology and lab tests';
END $$;

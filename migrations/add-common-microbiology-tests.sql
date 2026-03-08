-- Add common microbiology tests to test_reference_ranges
-- These are frequently used tests that should have reference data

-- Get a user ID for createdby field
DO $$
DECLARE
    v_userid UUID;
    v_workspaceid UUID := 'fa9fb036-a7eb-49af-890c-54406dad139d';
BEGIN
    -- Get first user ID
    SELECT userid INTO v_userid FROM users LIMIT 1;
    
    -- Blood Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    VALUES 
    ('BC-M', 'Blood for C/S', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid),
    ('BC-A', 'Blood for C/S', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid)
    ON CONFLICT (testcode, workspaceid) DO NOTHING;
    
    -- Sputum Culture (already added SPUTUM, adding variants)
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    VALUES 
    ('Sput-M', 'Sputum for C/S', 'Microbiology', 'Present/Absent', 'Normal flora / No pathogen', 'Y', v_workspaceid, v_userid),
    ('Sput-A', 'Sputum for C/S', 'Microbiology', 'Present/Absent', 'Normal flora / No pathogen', 'Y', v_workspaceid, v_userid),
    ('Sput-GS', 'Gram stain', 'Microbiology', 'Present/Absent', 'No organisms seen', 'Y', v_workspaceid, v_userid),
    ('Sput-AFB', 'Acid Fast Bacilli stain for T.B', 'Microbiology', 'Present/Absent', 'No AFB seen', 'Y', v_workspaceid, v_userid),
    ('Sput-Fungal', 'Mycological Cultivation', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid)
    ON CONFLICT (testcode, workspaceid) DO NOTHING;
    
    -- Urine Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    VALUES 
    ('UC-M', 'Urine for C/S', 'Microbiology', 'CFU/mL', '<10,000 CFU/mL', 'Y', v_workspaceid, v_userid),
    ('UC-A', 'Urine for C/S', 'Microbiology', 'CFU/mL', '<10,000 CFU/mL', 'Y', v_workspaceid, v_userid),
    ('URINE', 'Urine Culture', 'Microbiology', 'CFU/mL', '<10,000 CFU/mL', 'Y', v_workspaceid, v_userid)
    ON CONFLICT (testcode, workspaceid) DO NOTHING;
    
    -- Stool Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    VALUES 
    ('SC-M', 'Stool for C/S', 'Microbiology', 'Present/Absent', 'Normal flora', 'Y', v_workspaceid, v_userid),
    ('SC-A', 'Stool for C/S', 'Microbiology', 'Present/Absent', 'Normal flora', 'Y', v_workspaceid, v_userid),
    ('STOOL', 'Stool Culture', 'Microbiology', 'Present/Absent', 'Normal flora', 'Y', v_workspaceid, v_userid)
    ON CONFLICT (testcode, workspaceid) DO NOTHING;
    
    -- Wound Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    VALUES 
    ('WC-M', 'Wound Swab', 'Microbiology', 'Present/Absent', 'No pathogen isolated', 'Y', v_workspaceid, v_userid),
    ('WC-A', 'Wound Swab', 'Microbiology', 'Present/Absent', 'No pathogen isolated', 'Y', v_workspaceid, v_userid),
    ('WC-Fungal', 'Mycological Cultivation', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid),
    ('WOUND', 'Wound Culture', 'Microbiology', 'Present/Absent', 'No pathogen isolated', 'Y', v_workspaceid, v_userid)
    ON CONFLICT (testcode, workspaceid) DO NOTHING;
    
    -- Throat/Nasal Swabs
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    VALUES 
    ('NS', 'Nasal Swab', 'Microbiology', 'Present/Absent', 'Normal flora', 'Y', v_workspaceid, v_userid),
    ('TS', 'Throat Swab', 'Microbiology', 'Present/Absent', 'Normal flora', 'Y', v_workspaceid, v_userid),
    ('TS-GS', 'Gram stain', 'Microbiology', 'Present/Absent', 'No organisms seen', 'Y', v_workspaceid, v_userid)
    ON CONFLICT (testcode, workspaceid) DO NOTHING;
    
    -- CSF Culture
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    VALUES 
    ('CSF-M', 'CSF for C/S', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid),
    ('CSF-A', 'CSF for C/S', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid),
    ('CSF', 'CSF Culture', 'Microbiology', 'Present/Absent', 'No growth', 'Y', v_workspaceid, v_userid)
    ON CONFLICT (testcode, workspaceid) DO NOTHING;
    
    -- Common Biochemistry Tests
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencemin, referencemax, isactive, workspaceid, createdby)
    VALUES 
    ('GLU', 'Glucose', 'Biochemistry', 'mg/dL', '70', '100', 'Y', v_workspaceid, v_userid),
    ('CREAT', 'Creatinine', 'Biochemistry', 'mg/dL', '0.6', '1.2', 'Y', v_workspaceid, v_userid),
    ('UREA', 'Urea', 'Biochemistry', 'mg/dL', '15', '45', 'Y', v_workspaceid, v_userid),
    ('NA', 'Sodium', 'Biochemistry', 'mmol/L', '135', '145', 'Y', v_workspaceid, v_userid),
    ('K', 'Potassium', 'Biochemistry', 'mmol/L', '3.5', '5.0', 'Y', v_workspaceid, v_userid),
    ('CA', 'Calcium', 'Biochemistry', 'mg/dL', '8.5', '10.5', 'Y', v_workspaceid, v_userid)
    ON CONFLICT (testcode, workspaceid) DO NOTHING;
    
    -- Common Hematology Tests
    INSERT INTO test_reference_ranges (testcode, testname, labtype, unit, referencetext, isactive, workspaceid, createdby)
    VALUES 
    ('CBC', 'Complete Blood Count', 'Hematology', 'Various', 'WBC 4.5-11; RBC M 4.5-5.5/F 4.0-5.0; Hgb M 13.5-17.5/F 12-16; Plt 150-400', 'Y', v_workspaceid, v_userid),
    ('HGB', 'Hemoglobin', 'Hematology', 'g/dL', 'M: 13.5-17.5, F: 12-16', 'Y', v_workspaceid, v_userid),
    ('WBC', 'White Blood Cell Count', 'Hematology', 'x10^3/uL', '4.5-11.0', 'Y', v_workspaceid, v_userid),
    ('PLT', 'Platelet Count', 'Hematology', 'x10^3/uL', '150-400', 'Y', v_workspaceid, v_userid)
    ON CONFLICT (testcode, workspaceid) DO NOTHING;
    
    RAISE NOTICE 'Successfully added common microbiology and lab tests';
END $$;

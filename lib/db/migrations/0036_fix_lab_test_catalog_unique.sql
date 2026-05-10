-- Fix lab_test_catalog: replace global testcode unique with per-workspace (testcode, workspaceid) unique
ALTER TABLE "lab_test_catalog" DROP CONSTRAINT IF EXISTS "lab_test_catalog_testcode_unique";
ALTER TABLE "lab_test_catalog" ADD CONSTRAINT "lab_test_catalog_code_workspace_unique" UNIQUE ("testcode", "workspaceid");

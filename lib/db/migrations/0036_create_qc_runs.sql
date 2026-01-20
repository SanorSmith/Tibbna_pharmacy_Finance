CREATE TABLE IF NOT EXISTS "qc_runs" (
  "qcid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "qctype" text NOT NULL,
  "equipmentid" uuid,
  "equipmentname" text,
  "qclevel" text,
  "lotnumber" text,
  "analyte" text,
  "resultvalue" numeric(15,4),
  "unit" text,
  "expectedmin" numeric(15,4),
  "expectedmax" numeric(15,4),
  "pass" boolean NOT NULL DEFAULT true,
  "notes" text,
  "runat" timestamptz NOT NULL DEFAULT now(),
  "performedby" uuid,
  "performedbyname" text,
  "workspaceid" text NOT NULL,
  "createdat" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "qc_runs_workspace_idx" ON "qc_runs" ("workspaceid");
CREATE INDEX IF NOT EXISTS "qc_runs_equipment_idx" ON "qc_runs" ("equipmentid");
CREATE INDEX IF NOT EXISTS "qc_runs_type_idx" ON "qc_runs" ("qctype");
CREATE INDEX IF NOT EXISTS "qc_runs_runat_idx" ON "qc_runs" ("runat");

ALTER TABLE "qc_runs"
  ADD CONSTRAINT IF NOT EXISTS "qc_runs_equipment_fk" FOREIGN KEY ("equipmentid") REFERENCES "equipment" ("equipmentid") ON DELETE SET NULL;

ALTER TABLE "qc_runs"
  ADD CONSTRAINT IF NOT EXISTS "qc_runs_performedby_fk" FOREIGN KEY ("performedby") REFERENCES "users" ("userid") ON DELETE SET NULL;

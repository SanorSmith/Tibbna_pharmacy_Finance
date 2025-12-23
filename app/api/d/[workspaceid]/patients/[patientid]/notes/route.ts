import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getOpenEHREHRBySubjectId,
  createClinicalNote,
  listClinicalNotes,
  getClinicalNote,
  parseSOAPData,
  formatSOAPData,
  type ClinicalNoteComposition,
} from "@/lib/openehr";

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/notes
 * Retrieve clinical notes for a patient from OpenEHR using template_clinical_encounter_v2
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view clinical notes
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find EHR by National ID or patient UUID
    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json({ notes: [] }, { status: 200 });
    }

    // Get list of clinical note compositions
    const noteList = await listClinicalNotes(ehrId);

    // Fetch full details for each note
    const notes = await Promise.all(
      noteList.map(async (item) => {
        const composition = await getClinicalNote(ehrId, item.composition_uid);
        
        // Parse SOAP data from the protocol field
        const protocol = composition["template_clinical_encounter_v2/clinical_synopsis/protocol"] || "";
        const soapData = parseSOAPData(protocol);
        
        // Parse description field for additional context
        const description = composition["template_clinical_encounter_v2/clinical_synopsis/description"] || "";
        const descriptionParts = description.split(" | ");
        const noteType = descriptionParts[0]?.trim() || "progress_note";
        const noteTitle = descriptionParts[1]?.trim() || "";
        const status = descriptionParts[2]?.trim() || "final";

        return {
          composition_uid: item.composition_uid,
          recorded_time: item.start_time,
          note_type: noteType,
          note_title: noteTitle,
          synopsis: soapData.synopsis || "",
          subjective: soapData.subjective || "",
          objective: soapData.objective || "",
          assessment: soapData.assessment || "",
          plan: soapData.plan || "",
          clinical_context: soapData.clinical_context || "",
          comment: soapData.comment || "",
          author: composition["template_clinical_encounter_v2/composer|name"] || "Unknown",
          author_role: membership.role || "doctor",
          status: status,
        };
      })
    );

    return NextResponse.json({ notes }, { status: 200 });
  } catch (error) {
    console.error("Error fetching clinical notes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/notes
 * Create a new clinical note in OpenEHR using template_clinical_encounter_v2
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors can create clinical notes
    if (membership.role !== "doctor") {
      return NextResponse.json(
        { error: "Forbidden - Only doctors can create clinical notes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { note } = body as {
      note: {
        noteType: string;
        noteTitle?: string;
        synopsis: string;
        subjective?: string;
        objective?: string;
        assessment?: string;
        plan?: string;
        clinicalContext?: string;
        comment?: string;
        status?: string;
      };
    };

    if (!note) {
      return NextResponse.json(
        { error: "Clinical note payload is required" },
        { status: 400 }
      );
    }

    if (!note.synopsis) {
      return NextResponse.json(
        {
          error: "Synopsis is required for a clinical note",
        },
        { status: 400 }
      );
    }

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find EHR by National ID or patient UUID
    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json(
        { error: "No EHR found for this patient" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    // Format SOAP data into protocol string
    const protocolData = formatSOAPData({
      synopsis: note.synopsis,
      subjective: note.subjective || "",
      objective: note.objective || "",
      assessment: note.assessment || "",
      plan: note.plan || "",
      clinical_context: note.clinicalContext || "",
      comment: note.comment || "",
    });

    // Create description field with metadata
    const description = `${note.noteType || "progress_note"} | ${note.noteTitle || ""} | ${note.status || "final"}`;

    // Create composition using clinical encounter v2 template with clinical_synopsis archetype
    const composition: ClinicalNoteComposition = {
      // Language / territory / composer
      "template_clinical_encounter_v2/language|code": "en",
      "template_clinical_encounter_v2/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v2/territory|code": "US",
      "template_clinical_encounter_v2/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v2/composer|name": user.name || user.email || "Unknown",

      // Context
      "template_clinical_encounter_v2/context/start_time": now,
      "template_clinical_encounter_v2/context/setting|code": "238",
      "template_clinical_encounter_v2/context/setting|value": "other care",
      "template_clinical_encounter_v2/context/setting|terminology": "openehr",

      // Category
      "template_clinical_encounter_v2/category|code": "433",
      "template_clinical_encounter_v2/category|value": "event",
      "template_clinical_encounter_v2/category|terminology": "openehr",

      // Clinical synopsis archetype fields
      "template_clinical_encounter_v2/clinical_synopsis/data": note.synopsis,
      "template_clinical_encounter_v2/clinical_synopsis/protocol": protocolData,
      "template_clinical_encounter_v2/clinical_synopsis/description": description,
    };

    const compositionUid = await createClinicalNote(ehrId, composition);

    return NextResponse.json(
      {
        success: true,
        message: "Clinical note created successfully in OpenEHR",
        composition_uid: compositionUid,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating clinical note:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

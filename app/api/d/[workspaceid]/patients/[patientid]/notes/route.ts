import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// In-memory storage for clinical notes (dummy data)
// In production, this would be stored in EHRbase or a database

// Clinical Note (openEHR: EVALUATION.clinical_synopsis or OBSERVATION.progress_note)
interface ClinicalNote {
  composition_uid: string;
  recorded_time: string;
  
  // Note details (openEHR: Clinical synopsis)
  note_type: string; // progress_note, consultation_note, discharge_summary, clinical_synopsis
  note_title?: string;
  
  // Synopsis (openEHR: Synopsis)
  synopsis: string;
  
  // Subjective findings (SOAP format)
  subjective?: string;
  
  // Objective findings
  objective?: string;
  
  // Assessment
  assessment?: string;
  
  // Plan
  plan?: string;
  
  // Additional details
  clinical_context?: string;
  comment?: string;
  
  // Metadata
  author: string;
  author_role: string; // doctor, nurse, specialist
  status: string; // draft, final, amended
}

// Initialize with dummy data for demonstration
const clinicalNotesStore: Record<string, ClinicalNote[]> = {
  // Sample patient ID with dummy clinical notes
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "clinical-note-1731847200000-001",
      recorded_time: "2024-11-17T10:30:00.000Z",
      note_type: "progress_note",
      note_title: "Follow-up Visit - Hypertension Management",
      synopsis: "Patient presents for routine follow-up of hypertension. Blood pressure well-controlled on current medication regimen. No adverse effects reported. Continue current management plan.",
      subjective: "Patient reports feeling well with no symptoms. Compliant with medications (Lisinopril 10mg daily). Denies chest pain, shortness of breath, or dizziness. Following low-sodium diet and exercising 3 times per week.",
      objective: "BP: 128/82 mmHg, HR: 72 bpm, Weight: 78 kg (stable)\nGeneral: Alert and oriented, no acute distress\nCardiovascular: Regular rate and rhythm, no murmurs\nLungs: Clear to auscultation bilaterally",
      assessment: "1. Essential hypertension - well controlled\n2. Hyperlipidemia - on statin therapy\n3. Prediabetes - managed with lifestyle modifications",
      plan: "1. Continue Lisinopril 10mg daily\n2. Continue Atorvastatin 20mg at bedtime\n3. Repeat lipid panel in 3 months\n4. Follow-up in 3 months or sooner if symptoms develop\n5. Continue lifestyle modifications",
      clinical_context: "Routine follow-up visit. Patient has been stable on current regimen for 6 months.",
      comment: "Patient is motivated and compliant with treatment plan. Encouraged to continue current lifestyle modifications.",
      author: "Dr. Sarah Mitchell, MD",
      author_role: "doctor",
      status: "final"
    },
    {
      composition_uid: "clinical-note-1731674400000-002",
      recorded_time: "2024-11-15T14:15:00.000Z",
      note_type: "consultation_note",
      note_title: "Cardiology Consultation - Chest Pain Evaluation",
      synopsis: "Cardiology consultation for evaluation of atypical chest pain. Stress test negative for ischemia. Echocardiogram shows normal left ventricular function. Likely musculoskeletal etiology. No evidence of coronary artery disease at this time.",
      subjective: "Patient referred for evaluation of intermittent chest discomfort. Describes pain as sharp, localized to left chest wall, worse with movement and deep breathing. Duration 2-3 minutes, occurs 2-3 times per week. No radiation, no associated symptoms. Not related to exertion. Family history of CAD in father (MI at age 62).",
      objective: "BP: 132/85 mmHg, HR: 75 bpm\nCardiovascular exam: Regular rate and rhythm, S1 S2 normal, no murmurs or gallops\nChest wall: Tenderness to palpation at left 4th-5th intercostal space\nECG: Normal sinus rhythm, no ST-T changes\nStress Test: Negative for ischemia, achieved 95% max predicted HR\nEchocardiogram: LVEF 60%, no wall motion abnormalities, normal valves",
      assessment: "1. Atypical chest pain - likely musculoskeletal (costochondritis)\n2. No evidence of coronary artery disease\n3. Hyperlipidemia - continue statin therapy\n4. Family history of premature CAD - risk factor present",
      plan: "1. Reassurance - no evidence of cardiac etiology\n2. NSAIDs as needed for chest wall pain\n3. Continue aggressive lipid management with Atorvastatin\n4. Lifestyle modifications: diet, exercise, smoking cessation counseling\n5. Follow-up with PCP in 2 weeks\n6. Return to cardiology if symptoms change or worsen\n7. Repeat lipid panel in 3 months, target LDL <100 mg/dL",
      clinical_context: "Consultation requested by Dr. Mitchell for chest pain evaluation. Comprehensive cardiac workup completed.",
      comment: "Patient reassured about benign nature of symptoms. Discussed importance of cardiovascular risk factor modification given family history.",
      author: "Dr. Michael Chen, MD, FACC",
      author_role: "specialist",
      status: "final"
    },
    {
      composition_uid: "clinical-note-1731501600000-003",
      recorded_time: "2024-11-13T09:00:00.000Z",
      note_type: "progress_note",
      note_title: "Acute Visit - Upper Respiratory Infection",
      synopsis: "Patient presents with acute onset of cold symptoms. Diagnosed with viral upper respiratory infection. Symptomatic treatment recommended. No antibiotics indicated at this time.",
      subjective: "Patient reports 3 days of nasal congestion, rhinorrhea, sore throat, and mild cough. Denies fever, shortness of breath, or chest pain. No sick contacts. Symptoms gradually worsening. Taking over-the-counter decongestants with minimal relief.",
      objective: "Temp: 37.2°C, BP: 130/84 mmHg, HR: 78 bpm, RR: 16, SpO2: 98%\nGeneral: Mild distress due to nasal congestion\nENT: Nasal mucosa erythematous and edematous, clear rhinorrhea, pharynx mildly erythematous without exudate, no tonsillar enlargement\nNeck: No lymphadenopathy\nLungs: Clear to auscultation, no wheezes or crackles\nHeart: Regular rate and rhythm",
      assessment: "1. Acute viral upper respiratory infection (common cold)\n2. No evidence of bacterial sinusitis or streptococcal pharyngitis",
      plan: "1. Symptomatic treatment:\n   - Increase fluid intake\n   - Rest as needed\n   - Saline nasal spray\n   - Acetaminophen or ibuprofen for discomfort\n   - Throat lozenges for sore throat\n2. No antibiotics indicated\n3. Return if symptoms worsen, fever develops, or no improvement in 7-10 days\n4. Return to work/normal activities when feeling better",
      clinical_context: "Acute sick visit. Patient otherwise healthy with well-controlled chronic conditions.",
      comment: "Patient educated about viral nature of illness and expected course. Discussed red flag symptoms warranting return visit.",
      author: "Dr. James Rodriguez, MD",
      author_role: "doctor",
      status: "final"
    }
  ]
};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/notes
 * Retrieve clinical notes for a patient (from dummy data)
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

    // Check user role - doctors and nurses can view notes
    const userRole = membership.role?.toLowerCase();
    if (!["doctor", "nurse", "admin"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get notes for this patient
    const notes = clinicalNotesStore[patientid] || [];

    return NextResponse.json({ notes });
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
 * Create a new clinical note (dummy data storage)
 *
 * Follows openEHR Clinical synopsis concepts:
 * - note_type (progress_note, consultation_note, etc.)
 * - synopsis (summary of clinical encounter)
 * - SOAP format (Subjective, Objective, Assessment, Plan)
 * - author and status tracking
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

    // Only doctors can create notes
    const userRole = membership.role?.toLowerCase();
    if (!["doctor", "admin"].includes(userRole || "")) {
      return NextResponse.json(
        { error: "Only doctors can create clinical notes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { note } = body;

    // Create clinical note following openEHR structure
    const clinicalNote: ClinicalNote = {
      composition_uid: `clinical-note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      note_type: note.noteType || "progress_note",
      note_title: note.noteTitle,
      synopsis: note.synopsis,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
      clinical_context: note.clinicalContext,
      comment: note.comment,
      author: user.name || "Unknown Doctor",
      author_role: userRole || "doctor",
      status: note.status || "final"
    };

    // Store the note
    if (!clinicalNotesStore[patientid]) {
      clinicalNotesStore[patientid] = [];
    }
    clinicalNotesStore[patientid].unshift(clinicalNote); // Add to beginning

    return NextResponse.json({ note: clinicalNote }, { status: 201 });
  } catch (error) {
    console.error("Error creating clinical note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

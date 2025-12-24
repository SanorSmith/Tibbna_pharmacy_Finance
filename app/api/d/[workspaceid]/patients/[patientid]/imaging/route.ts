import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getOpenEHREHRBySubjectId,
  createRadiologyReport,
  listRadiologyReports,
  getRadiologyReport,
  type RadiologyReportComposition,
} from "@/lib/openehr";

// Imaging Request (openEHR: INSTRUCTION.imaging_exam_request)
interface ImagingRequest {
  composition_uid: string;
  recorded_time: string;
  
  // Request details (openEHR: Imaging exam request)
  request_name: string;
  description?: string;
  clinical_indication?: string;
  urgency: string; // routine, urgent, emergency
  supporting_doc_image?: string;
  patient_requirement?: string;
  comment?: string;
  
  // Target body site (openEHR: Structured body site)
  target_body_site?: string;
  structured_target_body_site?: string;
  
  // Contrast use
  contrast_use?: string; // yes, no, unknown
  
  // Metadata
  requested_by: string;
  request_status: string; // requested, scheduled, in-progress, completed, cancelled
}

// Imaging Result (openEHR: OBSERVATION.imaging_exam_result)
interface ImagingResult {
  composition_uid: string;
  recorded_time: string;
  request_uid?: string; // Link to request
  
  // Examination details
  examination_name: string;
  
  // Body site (openEHR: Body structure)
  body_structure?: string;
  body_site?: string;
  structured_body_site?: string;
  
  // Findings (openEHR: Imaging findings)
  imaging_findings?: string;
  additional_details?: string;
  
  // Interpretation (openEHR: Impression)
  impression?: string;
  
  // Comment
  comment?: string;
  
  // Metadata
  performed_by?: string;
  reported_by?: string;
  report_date: string;
  result_status: string; // preliminary, final, amended
}

// Dummy data for demonstration (will be replaced by openEHR data)
/* const imagingRequestStore: Record<string, ImagingRequest[]> = {
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "imaging-request-1731847200000-xray001",
      recorded_time: "2024-11-16T09:00:00.000Z",
      request_name: "Chest X-Ray (PA and Lateral)",
      description: "Two-view chest radiograph to evaluate respiratory symptoms",
      clinical_indication: "Patient presents with persistent cough for 3 weeks, fever, and shortness of breath. Rule out pneumonia or other pulmonary pathology.",
      urgency: "urgent",
      supporting_doc_image: "",
      patient_requirement: "Patient can stand for upright films",
      comment: "Please perform both PA and lateral views. Patient has difficulty taking deep breath.",
      target_body_site: "Chest",
      structured_target_body_site: "Thorax",
      contrast_use: "no",
      requested_by: "Dr. Sarah Mitchell, MD",
      request_status: "completed"
    },
    {
      composition_uid: "imaging-request-1731760800000-ct001",
      recorded_time: "2024-11-15T14:30:00.000Z",
      request_name: "CT Scan - Abdomen and Pelvis with Contrast",
      description: "Contrast-enhanced CT of abdomen and pelvis",
      clinical_indication: "Acute abdominal pain in right lower quadrant for 12 hours. Suspected appendicitis. Elevated WBC count (15,000). Rebound tenderness on examination.",
      urgency: "emergency",
      supporting_doc_image: "",
      patient_requirement: "NPO for 4 hours. IV access established.",
      comment: "STAT examination requested. Patient in ER. Creatinine normal (0.9 mg/dL). No contrast allergies.",
      target_body_site: "Abdomen and Pelvis",
      structured_target_body_site: "Abdominal cavity and pelvic cavity",
      contrast_use: "yes",
      requested_by: "Dr. James Rodriguez, MD",
      request_status: "completed"
    },
    {
      composition_uid: "imaging-request-1731674400000-mri001",
      recorded_time: "2024-11-14T10:15:00.000Z",
      request_name: "MRI Brain without Contrast",
      description: "Non-contrast MRI of brain to evaluate neurological symptoms",
      clinical_indication: "New onset headaches for 2 months, progressively worsening. Associated with visual disturbances and occasional dizziness. No history of head trauma.",
      urgency: "routine",
      supporting_doc_image: "",
      patient_requirement: "No metallic implants. Patient claustrophobic - may need sedation.",
      comment: "Patient reports metal allergy, hence no contrast. Consider sedation if needed.",
      target_body_site: "Brain",
      structured_target_body_site: "Cerebrum",
      contrast_use: "no",
      requested_by: "Dr. Emily Chen, MD",
      request_status: "in-progress"
    },
    {
      composition_uid: "imaging-request-1731588000000-us001",
      recorded_time: "2024-11-13T08:45:00.000Z",
      request_name: "Ultrasound - Thyroid",
      description: "Thyroid ultrasound with Doppler",
      clinical_indication: "Palpable thyroid nodule discovered on physical examination. TSH elevated at 8.5 mIU/L. Patient reports difficulty swallowing.",
      urgency: "routine",
      supporting_doc_image: "",
      patient_requirement: "None",
      comment: "Please evaluate size, characteristics, and vascularity of nodule. Consider FNA if suspicious features.",
      target_body_site: "Neck - Thyroid gland",
      structured_target_body_site: "Thyroid gland",
      contrast_use: "no",
      requested_by: "Dr. Amanda Foster, MD",
      request_status: "requested"
    }
  ]
};

const imagingResultStore: Record<string, ImagingResult[]> = {
  // Sample patient ID with dummy imaging results
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "imaging-result-1731847200000-xray001",
      recorded_time: "2024-11-16T10:30:00.000Z",
      request_uid: "imaging-request-1731847200000-xray001",
      examination_name: "Chest X-Ray (PA and Lateral)",
      body_structure: "Thorax",
      body_site: "Chest",
      structured_body_site: "Thoracic cavity",
      imaging_findings: `PA and lateral views of the chest were obtained.

LUNGS: There is a focal area of consolidation in the right lower lobe, measuring approximately 4 x 3 cm. The consolidation has air bronchograms within it. No pleural effusion is identified. The left lung is clear.

HEART: Heart size is normal. Cardiomediastinal silhouette is unremarkable.

BONES: No acute osseous abnormality. Degenerative changes noted in the thoracic spine.

SOFT TISSUES: Unremarkable.`,
      additional_details: "Comparison: No prior chest radiographs available for comparison.\n\nTechnique: PA and lateral chest radiographs obtained in the upright position. Adequate inspiration and penetration.",
      impression: `1. Right lower lobe pneumonia with air bronchograms.
2. No pleural effusion or pneumothorax.
3. Normal cardiac silhouette.

RECOMMENDATION: Clinical correlation recommended. Consider antibiotic therapy. Follow-up chest X-ray in 4-6 weeks to document resolution.`,
      comment: "Patient tolerated procedure well. Images are of diagnostic quality.",
      performed_by: "Radiologic Technologist: Mary Johnson, RT(R)",
      reported_by: "Dr. Robert Anderson, MD - Radiologist",
      report_date: "2024-11-16T10:30:00.000Z",
      result_status: "final"
    },
    {
      composition_uid: "imaging-result-1731760800000-ct001",
      recorded_time: "2024-11-15T15:45:00.000Z",
      request_uid: "imaging-request-1731760800000-ct001",
      examination_name: "CT Scan - Abdomen and Pelvis with IV Contrast",
      body_structure: "Abdomen and Pelvis",
      body_site: "Abdominal and pelvic cavities",
      structured_body_site: "Abdominal cavity and pelvic cavity",
      imaging_findings: `TECHNIQUE: Axial CT images of the abdomen and pelvis were obtained following administration of 100 mL of intravenous Omnipaque 350. Oral contrast was not administered due to emergent nature of examination.

ABDOMEN:
LIVER: Normal size and attenuation. No focal lesions.
GALLBLADDER: Unremarkable. No stones or wall thickening.
PANCREAS: Normal in size and attenuation.
SPLEEN: Normal size. No focal lesions.
KIDNEYS: Both kidneys enhance symmetrically. No hydronephrosis or stones.
ADRENALS: Normal.

APPENDIX: The appendix is dilated, measuring 12 mm in diameter. There is surrounding fat stranding and fluid. An appendicolith is present. The appendiceal wall is thickened and enhances with contrast.

BOWEL: Small and large bowel are unremarkable. No obstruction.

PELVIS:
BLADDER: Normal. Well-distended.
UTERUS/OVARIES (if applicable): Not applicable - male patient.
PROSTATE: Normal size.

LYMPH NODES: No pathologically enlarged lymph nodes.

VESSELS: Aorta and IVC are normal in caliber. No aneurysm.

BONES: No acute fracture or destructive lesion.`,
      additional_details: `COMPARISON: None available.

CONTRAST: 100 mL Omnipaque 350 IV. Patient tolerated contrast without adverse reaction.

RADIATION DOSE: DLP 850 mGy-cm, CTDIvol 12 mGy`,
      impression: `1. ACUTE APPENDICITIS with appendicolith and periappendiceal inflammation. Surgical consultation recommended.

2. No evidence of perforation or abscess formation at this time.

3. No other acute abdominal pathology identified.

CRITICAL RESULT: This finding was communicated to Dr. James Rodriguez in the Emergency Department at 3:50 PM on 11/15/2024 by Dr. Patricia Williams.`,
      comment: "STAT examination. Critical finding communicated to ordering physician.",
      performed_by: "CT Technologist: David Lee, RT(R)(CT)",
      reported_by: "Dr. Patricia Williams, MD - Radiologist",
      report_date: "2024-11-15T15:45:00.000Z",
      result_status: "final"
    },
    {
      composition_uid: "imaging-result-1731501600000-mri002",
      recorded_time: "2024-11-12T16:20:00.000Z",
      request_uid: "",
      examination_name: "MRI Lumbar Spine without Contrast",
      body_structure: "Lumbar spine",
      body_site: "Lower back",
      structured_body_site: "Lumbar vertebral column",
      imaging_findings: `TECHNIQUE: Multiplanar, multisequence MRI of the lumbar spine was performed without intravenous contrast.

ALIGNMENT: Normal lumbar lordosis. No spondylolisthesis.

VERTEBRAL BODIES: Normal marrow signal. No compression fractures. Normal vertebral body heights.

INTERVERTEBRAL DISCS:
L1-L2: Normal disc height and signal. No herniation.
L2-L3: Normal disc height and signal. No herniation.
L3-L4: Mild disc desiccation. Small central disc protrusion without significant canal stenosis.
L4-L5: Moderate disc desiccation. Large left paracentral disc extrusion measuring 8 mm, causing severe left lateral recess stenosis and impingement of the left L5 nerve root. Mild central canal stenosis.
L5-S1: Mild disc desiccation. Broad-based disc bulge without significant stenosis.

SPINAL CANAL: Patent except as noted above at L4-L5.

NEURAL FORAMINA: 
Bilateral neural foramina are patent at all levels except moderate left foraminal stenosis at L4-L5 due to disc extrusion.

CONUS MEDULLARIS: Normal position at L1. Normal signal.

PARASPINAL SOFT TISSUES: Unremarkable.`,
      additional_details: `COMPARISON: None available.

SEQUENCES: Sagittal T1, T2, and STIR. Axial T2 through the lumbar spine.`,
      impression: `1. Large left paracentral disc extrusion at L4-L5 with severe left lateral recess stenosis and impingement of the left L5 nerve root. This correlates with the patient's left lower extremity radiculopathy.

2. Moderate left neural foraminal stenosis at L4-L5.

3. Mild degenerative disc disease at L3-L4 and L5-S1 without significant stenosis.

RECOMMENDATION: Neurosurgical or spine surgery consultation for consideration of surgical intervention given the size of the disc extrusion and clinical symptoms.`,
      comment: "Patient completed examination without sedation. Good quality images obtained.",
      performed_by: "MRI Technologist: Jennifer Martinez, RT(R)(MR)",
      reported_by: "Dr. Michael Thompson, MD - Neuroradiologist",
      report_date: "2024-11-12T16:20:00.000Z",
      result_status: "final"
    },
    {
      composition_uid: "imaging-result-1731415200000-us001",
      recorded_time: "2024-11-11T11:30:00.000Z",
      request_uid: "",
      examination_name: "Ultrasound - Abdomen (Right Upper Quadrant)",
      body_structure: "Abdomen",
      body_site: "Right upper quadrant",
      structured_body_site: "Right upper abdominal quadrant",
      imaging_findings: `INDICATION: Right upper quadrant pain, elevated liver enzymes.

LIVER: The liver measures 16 cm in craniocaudal dimension (upper limit of normal). Echotexture is normal. No focal lesions identified. Portal vein is patent with normal hepatopetal flow.

GALLBLADDER: The gallbladder is distended and contains multiple small stones, the largest measuring 8 mm. The gallbladder wall measures 5 mm (thickened, normal <3 mm). Positive sonographic Murphy's sign elicited during examination. No pericholecystic fluid.

BILE DUCTS: Common bile duct measures 5 mm (normal). No intrahepatic biliary dilatation.

PANCREAS: Partially visualized due to overlying bowel gas. Visualized portions appear normal.

RIGHT KIDNEY: Measures 11 cm. Normal cortical thickness. No hydronephrosis or stones. No masses.

SPLEEN: Normal size and echotexture.`,
      additional_details: `TECHNIQUE: Real-time ultrasound examination of the right upper quadrant was performed using a curvilinear transducer.

COMPARISON: None available.`,
      impression: `1. ACUTE CHOLECYSTITIS - Gallbladder wall thickening, gallstones, and positive sonographic Murphy's sign.

2. Normal common bile duct caliber - no evidence of choledocholithiasis.

3. Mild hepatomegaly.

RECOMMENDATION: Surgical consultation for cholecystectomy. Clinical correlation with laboratory values recommended.`,
      comment: "Patient experienced significant tenderness during gallbladder examination (positive Murphy's sign).",
      performed_by: "Sonographer: Lisa Chen, RDMS",
      reported_by: "Dr. Kevin Park, MD - Radiologist",
      report_date: "2024-11-11T11:30:00.000Z",
      result_status: "final"
    },
    {
      composition_uid: "imaging-result-1731328800000-xray002",
      recorded_time: "2024-11-10T14:00:00.000Z",
      request_uid: "",
      examination_name: "X-Ray - Left Knee (AP, Lateral, Sunrise)",
      body_structure: "Left knee joint",
      body_site: "Left knee",
      structured_body_site: "Left knee joint",
      imaging_findings: `Three views of the left knee were obtained.

BONES: There is moderate narrowing of the medial compartment joint space. Subchondral sclerosis is present in the medial femoral condyle and medial tibial plateau. Multiple small osteophytes are noted at the joint margins, particularly at the medial femoral condyle and tibial spines.

JOINT SPACE: Medial compartment narrowing as described above. Lateral compartment and patellofemoral compartment are preserved.

SOFT TISSUES: Moderate joint effusion is present. No soft tissue calcifications.

PATELLA: Sunrise view shows normal patellar tracking. No patellar fracture or dislocation.

ALIGNMENT: Mild varus alignment of the knee.`,
      additional_details: `COMPARISON: Left knee radiographs from 2 years ago (November 2022) show progression of medial compartment narrowing and osteophyte formation.

TECHNIQUE: AP, lateral, and sunrise views of the left knee obtained.`,
      impression: `1. Moderate osteoarthritis of the left knee, predominantly affecting the medial compartment, with progression compared to prior examination.

2. Moderate joint effusion.

3. Mild varus deformity.

RECOMMENDATION: Clinical correlation. Consider orthopedic consultation for management options including physical therapy, intra-articular injections, or surgical intervention if conservative management fails.`,
      comment: "Weight-bearing AP view obtained as requested.",
      performed_by: "Radiologic Technologist: Thomas Wilson, RT(R)",
      reported_by: "Dr. Susan Martinez, MD - Musculoskeletal Radiologist",
      report_date: "2024-11-10T14:00:00.000Z",
      result_status: "final"
    }
  ]
}; */

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/imaging
 * Retrieve imaging requests and results for a patient from OpenEHR
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

    // Only doctors and nurses can view imaging
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
      return NextResponse.json({ 
        requests: [],
        results: []
      }, { status: 200 });
    }

    // Get radiology reports from openEHR
    const reportList = await listRadiologyReports(ehrId);

    const requests: ImagingRequest[] = [];
    const results: ImagingResult[] = [];

    // Fetch full details for each report and separate by status
    await Promise.all(
      reportList.map(async (item) => {
        const composition = await getRadiologyReport(ehrId, item.composition_uid);
        
        // Extract data from the composition
        const studyName = composition["template_radiology_report_v1/imaging_examination_result/any_event:0/study_name"] || "";
        const bodySite = composition["template_radiology_report_v1/imaging_examination_result/any_event:0/target_body_site"] || "";
        const findings = composition["template_radiology_report_v1/imaging_examination_result/any_event:0/imaging_findings"] || "";
        const impression = composition["template_radiology_report_v1/imaging_examination_result/any_event:0/overall_impression"] || "";
        const clinicalSummary = composition["template_radiology_report_v1/imaging_examination_result/any_event:0/clinical_summary"] || "";
        const clinicalIndication = composition["template_radiology_report_v1/imaging_examination_result/any_event:0/clinical_indication"] || "";
        const statusCode = composition["template_radiology_report_v1/imaging_examination_result/any_event:0/overall_result_status:0|code"] || "";
        const statusValue = composition["template_radiology_report_v1/imaging_examination_result/any_event:0/overall_result_status:0|value"] || "final";
        const comment = composition["template_radiology_report_v1/imaging_examination_result/any_event:0/comment:0"] || "";
        const urgency = composition["template_radiology_report_v1/context/status"] || "routine";

        // Separate requests (Registered status) from results (Final/Preliminary/etc)
        if (statusCode === "at0073") {
          // This is a request (Registered status)
          requests.push({
            composition_uid: item.composition_uid,
            recorded_time: item.start_time,
            request_name: studyName,
            description: clinicalSummary,
            clinical_indication: clinicalIndication,
            urgency: urgency,
            target_body_site: bodySite,
            comment: comment,
            requested_by: composition["template_radiology_report_v1/composer|name"] || "Unknown",
            request_status: "requested",
          });
        } else {
          // This is a result (Final, Preliminary, etc.)
          results.push({
            composition_uid: item.composition_uid,
            recorded_time: item.start_time,
            examination_name: studyName,
            body_site: bodySite,
            imaging_findings: findings,
            impression: impression,
            additional_details: clinicalSummary,
            comment: comment,
            reported_by: composition["template_radiology_report_v1/composer|name"] || "Unknown",
            report_date: item.start_time,
            result_status: statusValue.toLowerCase(),
          });
        }
      })
    );

    return NextResponse.json({ 
      requests,
      results
    });
  } catch (error) {
    console.error("Error fetching imaging data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/imaging
 * Create a new imaging request in OpenEHR as a radiology report
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

    // Only doctors can create imaging requests
    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { type, data } = body; // type: 'request' or 'result'

    if (type === 'request') {
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

      // Valid status codes from template_radiology_report_v1:
      // at0073 = Registered (request created, no result yet)
      // at0074 = Partial
      // at0075 = Preliminary
      // at0076 = Final
      // at0077 = Amended
      // at0078 = Corrected
      // at0079 = Appended
      // at0080 = Cancelled
      // at0090 = Entered in error

      // Create radiology report composition for the imaging request
      const composition: RadiologyReportComposition = {
        // Language / territory / composer
        "template_radiology_report_v1/language|code": "en",
        "template_radiology_report_v1/language|terminology": "ISO_639-1",
        "template_radiology_report_v1/territory|code": "US",
        "template_radiology_report_v1/territory|terminology": "ISO_3166-1",
        "template_radiology_report_v1/composer|name": user.name || user.email || "Unknown",

        // Category
        "template_radiology_report_v1/category|code": "433",
        "template_radiology_report_v1/category|terminology": "openehr",
        "template_radiology_report_v1/category|value": "event",

        // Context
        "template_radiology_report_v1/context/start_time": now,
        "template_radiology_report_v1/context/setting|value": "other care",
        "template_radiology_report_v1/context/setting|code": "238",
        "template_radiology_report_v1/context/setting|terminology": "openehr",
        "template_radiology_report_v1/context/status": data.urgency || "routine",
        "template_radiology_report_v1/context/report_id": `IMG-REQ-${Date.now()}`,

        // Imaging Examination Result - any_event:0
        "template_radiology_report_v1/imaging_examination_result/any_event:0/study_name": data.requestName,
        "template_radiology_report_v1/imaging_examination_result/any_event:0/target_body_site": data.targetBodySite || "",
        "template_radiology_report_v1/imaging_examination_result/any_event:0/clinical_indication": data.clinicalIndication || "",
        "template_radiology_report_v1/imaging_examination_result/any_event:0/clinical_summary": data.description || "",
        "template_radiology_report_v1/imaging_examination_result/any_event:0/comment:0": data.comment || "",
        "template_radiology_report_v1/imaging_examination_result/any_event:0/overall_result_status:0|code": "at0073",
        "template_radiology_report_v1/imaging_examination_result/any_event:0/overall_result_status:0|value": "Registered",
        "template_radiology_report_v1/imaging_examination_result/any_event:0/overall_result_status:0|terminology": "local",
        "template_radiology_report_v1/imaging_examination_result/any_event:0/status_timestamp": now,
        "template_radiology_report_v1/imaging_examination_result/any_event:0/time": now,

        // Study details
        "template_radiology_report_v1/imaging_examination_result/study_description": data.description || "",
        "template_radiology_report_v1/imaging_examination_result/report_identifier/identifier_value|id": `IMG-REQ-${Date.now()}`,

        // Language and Encoding
        "template_radiology_report_v1/imaging_examination_result/language|code": "en",
        "template_radiology_report_v1/imaging_examination_result/language|terminology": "ISO_639-1",
        "template_radiology_report_v1/imaging_examination_result/encoding|code": "UTF-8",
        "template_radiology_report_v1/imaging_examination_result/encoding|terminology": "IANA_character-sets",
      };

      const compositionUid = await createRadiologyReport(ehrId, composition);

      return NextResponse.json(
        { 
          success: true,
          message: "Imaging request created successfully in OpenEHR",
          composition_uid: compositionUid
        },
        { status: 201 }
      );
    } else if (type === 'result') {
      return NextResponse.json(
        { error: "Result creation not yet implemented. Use request type for now." },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'request' or 'result'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error creating imaging data:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

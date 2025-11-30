# Imaging Requests and Results Documentation

## Overview
The imaging system provides comprehensive management of diagnostic imaging requests and results, following openEHR standards. It supports the complete imaging workflow from request creation through result reporting, enabling seamless communication between clinicians and radiology departments.

## Features

### Core Functionality
- **Create Imaging Requests**: Order diagnostic imaging examinations
- **Track Request Status**: Monitor imaging requests from requested to completed
- **View Imaging Results**: Access detailed radiology reports with findings and impressions
- **Multiple Modalities**: Support for X-Ray, CT, MRI, Ultrasound, and other imaging types
- **Urgency Management**: Routine, urgent, and emergency prioritization
- **Clinical Context**: Include clinical indications and patient requirements

### Supported Imaging Modalities
- **X-Ray**: Plain radiography (chest, skeletal, abdominal)
- **CT Scan**: Computed tomography with or without contrast
- **MRI**: Magnetic resonance imaging
- **Ultrasound**: Sonography (abdominal, vascular, obstetric)
- **Fluoroscopy**: Real-time X-ray imaging
- **Nuclear Medicine**: PET, SPECT scans
- **Mammography**: Breast imaging

## openEHR Compliance

### Imaging Request Archetype
**Archetype**: `INSTRUCTION.imaging_exam_request`

The imaging request follows the openEHR imaging exam request instruction archetype, which defines the structure for ordering diagnostic imaging examinations.

### Imaging Result Archetype
**Archetype**: `OBSERVATION.imaging_exam_result`

The imaging result follows the openEHR imaging exam result observation archetype, which defines the structure for reporting imaging examination findings.

## User Interface

### Imaging Tab Layout
The Imaging tab is divided into two main sections:

1. **Imaging Requests Section**
   - List of all imaging requests
   - "+ New Imaging Request" button
   - Request details with status badges

2. **Imaging Results Section**
   - List of all imaging results
   - Detailed findings and impressions
   - Reported by information

### Imaging Request Display

Each imaging request shows:
- **Request Name**: Type of imaging examination
- **Description**: Brief description of the examination
- **Status Badge**: Current request status (color-coded)
- **Requested By**: Healthcare provider who ordered the exam
- **Request Date**: When the order was placed
- **Urgency**: Priority level (Routine/Urgent/Emergency)
- **Body Site**: Anatomical area to be imaged
- **Clinical Indication**: Reason for the examination

### Imaging Result Display

Each imaging result shows:
- **Examination Name**: Type of imaging performed
- **Body Site**: Anatomical area imaged
- **Status Badge**: Report status (Preliminary/Final/Amended)
- **Imaging Findings**: Detailed findings (blue-highlighted section)
- **Impression**: Radiologist's interpretation (purple-highlighted section)
- **Additional Details**: Technical information
- **Reported By**: Radiologist who interpreted the study
- **Report Date**: When the report was finalized

### Status Indicators

#### Request Status
| Status | Badge Color | Description |
|--------|-------------|-------------|
| Requested | Blue | Order placed, awaiting scheduling |
| Scheduled | Cyan | Appointment scheduled |
| In Progress | Yellow | Examination in progress |
| Completed | Green | Examination completed, report pending or available |
| Cancelled | Red | Request cancelled |

#### Result Status
| Status | Badge Color | Description |
|--------|-------------|-------------|
| Preliminary | Yellow | Initial interpretation, may be revised |
| Final | Green | Final report, no further changes expected |
| Amended | Blue | Report has been corrected or updated |

## Creating an Imaging Request

### Required Fields
1. **Request Name**: Type of imaging examination (e.g., "Chest X-Ray", "CT Abdomen")
2. **Urgency**: Priority level (Routine, Urgent, Emergency)

### Optional Fields
- **Description**: Brief description of the examination
- **Clinical Indication**: Medical reason for ordering the exam
- **Target Body Site**: Anatomical area to be imaged
- **Contrast Use**: Whether contrast agent is needed (Yes/No/Unknown)
- **Patient Requirement**: Special patient needs or preparations
- **Comment**: Additional notes or instructions

### Form Workflow

1. Click "+ New Imaging Request" button
2. Enter **Request Name** (required)
3. Provide **Description** of the examination
4. Enter **Clinical Indication** (reason for exam)
5. Select **Urgency** level (Routine/Urgent/Emergency)
6. Select **Contrast Use** (Yes/No/Unknown)
7. Enter **Target Body Site**
8. Add **Patient Requirement** if needed
9. Add **Comment** for additional instructions
10. Click "Create Request"

### Form Validation

The form validates:
- Request Name must be filled
- All other fields are optional but recommended for complete clinical documentation

## Data Model

### TypeScript Interfaces

#### Imaging Request
```typescript
interface ImagingRequest {
  composition_uid: string;        // Unique identifier
  recorded_time: string;          // ISO timestamp
  
  // Request details (openEHR: Imaging exam request)
  request_name: string;           // Type of examination
  description?: string;           // Brief description
  clinical_indication?: string;   // Medical reason
  urgency: string;                // routine, urgent, emergency
  supporting_doc_image?: string;  // Supporting documentation
  patient_requirement?: string;   // Special patient needs
  comment?: string;               // Additional notes
  
  // Target body site (openEHR: Structured body site)
  target_body_site?: string;      // Anatomical area
  structured_target_body_site?: string;  // Coded body site
  
  // Contrast use
  contrast_use?: string;          // yes, no, unknown
  
  // Metadata
  requested_by: string;           // Ordering provider
  request_status: string;         // Current status
}
```

#### Imaging Result
```typescript
interface ImagingResult {
  composition_uid: string;        // Unique identifier
  recorded_time: string;          // ISO timestamp
  request_uid?: string;           // Link to request
  
  // Examination details
  examination_name: string;       // Type of examination performed
  
  // Body site (openEHR: Body structure)
  body_structure?: string;        // Anatomical structure
  body_site?: string;             // Body site description
  structured_body_site?: string;  // Coded body site
  
  // Findings (openEHR: Imaging findings)
  imaging_findings?: string;      // Detailed findings
  additional_details?: string;    // Technical details
  
  // Interpretation (openEHR: Impression)
  impression?: string;            // Radiologist's interpretation
  
  // Comment
  comment?: string;               // Additional notes
  
  // Metadata
  performed_by?: string;          // Technologist
  reported_by?: string;           // Radiologist
  report_date: string;            // Report date
  result_status: string;          // preliminary, final, amended
}
```

### Field Descriptions

#### Imaging Request Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `composition_uid` | string | Unique request identifier | `imaging-request-1731847200000-xray001` |
| `recorded_time` | string | ISO 8601 timestamp | `2024-11-16T09:00:00.000Z` |
| `request_name` | string | Examination type | `Chest X-Ray (PA and Lateral)` |
| `description` | string? | Brief description | `Two-view chest radiograph` |
| `clinical_indication` | string? | Medical reason | `Persistent cough, rule out pneumonia` |
| `urgency` | string | Priority level | `routine`, `urgent`, `emergency` |
| `supporting_doc_image` | string? | Supporting docs | URL or reference |
| `patient_requirement` | string? | Special needs | `Patient can stand for upright films` |
| `comment` | string? | Additional notes | `Please perform both PA and lateral views` |
| `target_body_site` | string? | Anatomical area | `Chest` |
| `structured_target_body_site` | string? | Coded body site | `Thorax` |
| `contrast_use` | string? | Contrast needed | `yes`, `no`, `unknown` |
| `requested_by` | string | Ordering provider | `Dr. Sarah Mitchell, MD` |
| `request_status` | string | Current status | `requested`, `scheduled`, `in-progress`, `completed`, `cancelled` |

#### Imaging Result Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `composition_uid` | string | Unique result identifier | `imaging-result-1731847200000-xray001` |
| `recorded_time` | string | ISO 8601 timestamp | `2024-11-16T10:30:00.000Z` |
| `request_uid` | string? | Linked request ID | `imaging-request-1731847200000-xray001` |
| `examination_name` | string | Examination performed | `Chest X-Ray (PA and Lateral)` |
| `body_structure` | string? | Anatomical structure | `Thorax` |
| `body_site` | string? | Body site | `Chest` |
| `structured_body_site` | string? | Coded body site | `Thoracic cavity` |
| `imaging_findings` | string? | Detailed findings | Full radiology report text |
| `additional_details` | string? | Technical details | `Technique: PA and lateral views...` |
| `impression` | string? | Interpretation | `1. Right lower lobe pneumonia...` |
| `comment` | string? | Additional notes | `Patient tolerated procedure well` |
| `performed_by` | string? | Technologist | `Mary Johnson, RT(R)` |
| `reported_by` | string? | Radiologist | `Dr. Robert Anderson, MD` |
| `report_date` | string | Report date | `2024-11-16T10:30:00.000Z` |
| `result_status` | string | Report status | `preliminary`, `final`, `amended` |

## API Endpoints

### GET `/api/d/[workspaceid]/patients/[patientid]/imaging`

Retrieve all imaging requests and results for a patient.

**Authorization**: Doctor or Nurse role required

**Response**:
```json
{
  "requests": [
    {
      "composition_uid": "imaging-request-1731847200000-xray001",
      "recorded_time": "2024-11-16T09:00:00.000Z",
      "request_name": "Chest X-Ray (PA and Lateral)",
      "description": "Two-view chest radiograph",
      "clinical_indication": "Persistent cough, fever, SOB",
      "urgency": "urgent",
      "target_body_site": "Chest",
      "contrast_use": "no",
      "requested_by": "Dr. Sarah Mitchell, MD",
      "request_status": "completed"
    }
  ],
  "results": [
    {
      "composition_uid": "imaging-result-1731847200000-xray001",
      "recorded_time": "2024-11-16T10:30:00.000Z",
      "request_uid": "imaging-request-1731847200000-xray001",
      "examination_name": "Chest X-Ray (PA and Lateral)",
      "body_site": "Chest",
      "imaging_findings": "PA and lateral views...",
      "impression": "1. Right lower lobe pneumonia...",
      "reported_by": "Dr. Robert Anderson, MD",
      "report_date": "2024-11-16T10:30:00.000Z",
      "result_status": "final"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have required role or workspace access
- `500 Internal Server Error`: Server error

---

### POST `/api/d/[workspaceid]/patients/[patientid]/imaging`

Create a new imaging request or result.

**Authorization**: Doctor role required

**Request Body** (Imaging Request):
```json
{
  "type": "request",
  "data": {
    "requestName": "Chest X-Ray (PA and Lateral)",
    "description": "Two-view chest radiograph",
    "clinicalIndication": "Persistent cough, fever, SOB",
    "urgency": "urgent",
    "contrastUse": "no",
    "targetBodySite": "Chest",
    "patientRequirement": "Patient can stand",
    "comment": "Please perform both views"
  }
}
```

**Request Body** (Imaging Result):
```json
{
  "type": "result",
  "data": {
    "requestUid": "imaging-request-1731847200000-xray001",
    "examinationName": "Chest X-Ray (PA and Lateral)",
    "bodySite": "Chest",
    "imagingFindings": "PA and lateral views of the chest...",
    "impression": "1. Right lower lobe pneumonia...",
    "additionalDetails": "Technique: PA and lateral...",
    "comment": "Patient tolerated procedure well",
    "performedBy": "Mary Johnson, RT(R)",
    "resultStatus": "final"
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Imaging request created successfully",
  "record": {
    "composition_uid": "imaging-request-1731847200000-xray001",
    "recorded_time": "2024-11-16T09:00:00.000Z",
    "request_name": "Chest X-Ray (PA and Lateral)",
    "urgency": "urgent",
    "requested_by": "Dr. Sarah Mitchell, MD",
    "request_status": "requested"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid type (must be 'request' or 'result')
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User is not a doctor or lacks workspace access
- `500 Internal Server Error`: Server error

## Common Imaging Examinations

### X-Ray (Plain Radiography)
- Chest X-Ray (PA, Lateral, AP)
- Abdominal X-Ray (KUB, Upright, Decubitus)
- Skeletal X-Ray (Extremities, Spine, Pelvis)
- Dental X-Ray

### CT Scan (Computed Tomography)
- CT Head (with/without contrast)
- CT Chest (with/without contrast)
- CT Abdomen and Pelvis (with/without contrast)
- CT Angiography (CTA)
- CT Pulmonary Angiogram (CTPA)

### MRI (Magnetic Resonance Imaging)
- MRI Brain (with/without contrast)
- MRI Spine (Cervical, Thoracic, Lumbar)
- MRI Joints (Knee, Shoulder, Hip)
- MRI Abdomen and Pelvis
- MRA (MR Angiography)

### Ultrasound (Sonography)
- Abdominal Ultrasound (RUQ, Complete)
- Pelvic Ultrasound (Transabdominal, Transvaginal)
- Obstetric Ultrasound
- Vascular Ultrasound (Carotid, DVT)
- Echocardiography

### Nuclear Medicine
- PET/CT Scan
- Bone Scan
- Thyroid Scan
- Cardiac Nuclear Stress Test

### Interventional Radiology
- Fluoroscopy
- Angiography
- Myelography
- Arthrography

## Clinical Workflow

### Typical Imaging Workflow

1. **Clinical Assessment**
   - Doctor evaluates patient
   - Identifies need for diagnostic imaging
   - Determines appropriate modality and urgency

2. **Request Creation**
   - Doctor creates imaging request
   - Includes clinical indication
   - Specifies urgency and special requirements
   - System generates request with "requested" status

3. **Scheduling**
   - Radiology department receives request
   - Patient scheduled for examination
   - Status updated to "scheduled"

4. **Examination**
   - Patient arrives for imaging
   - Technologist performs examination
   - Status updated to "in-progress"

5. **Image Acquisition**
   - Images captured and stored in PACS
   - Quality check performed
   - Status updated to "completed"

6. **Interpretation**
   - Radiologist reviews images
   - Creates preliminary report
   - Result status: "preliminary"

7. **Final Report**
   - Radiologist finalizes interpretation
   - Includes findings and impression
   - Result status: "final"

8. **Clinical Review**
   - Ordering doctor reviews results
   - Determines next steps
   - May order additional imaging if needed

### Status Transitions

**Request Status Flow**:
```
requested → scheduled → in-progress → completed
    ↓
cancelled
```

**Result Status Flow**:
```
preliminary → final
    ↓
amended (if corrections needed)
```

## Authorization & Security

### Role-Based Access Control

| Role | Create Requests | View Requests | Create Results | View Results |
|------|-----------------|---------------|----------------|--------------|
| Doctor | ✓ | ✓ | ✓ | ✓ |
| Nurse | ✗ | ✓ | ✗ | ✓ |
| Radiologist | ✗ | ✓ | ✓ | ✓ |
| Technologist | ✗ | ✓ | ✗ | ✓ |
| Admin | ✗ | ✓ | ✗ | ✓ |

### Workspace Access
- Users must be members of the workspace
- Workspace membership is validated on every API call
- Cross-workspace access is prevented

### Audit Trail
- All requests record who created them (`requested_by`)
- All results record who reported them (`reported_by`)
- Timestamps are recorded (`recorded_time`, `report_date`)
- Future: Track status changes and modifications

## Radiology Report Structure

### Standard Report Format

A professional radiology report typically includes:

1. **Patient Information**
   - Name, age, medical record number
   - Examination date and time

2. **Clinical Indication**
   - Reason for examination
   - Relevant clinical history

3. **Technique**
   - Imaging modality used
   - Contrast administration (if applicable)
   - Technical parameters

4. **Comparison**
   - Prior studies for comparison
   - Dates of prior examinations

5. **Findings**
   - Systematic organ-by-organ review
   - Measurements and descriptions
   - Abnormalities identified

6. **Impression**
   - Summary of key findings
   - Diagnosis or differential diagnosis
   - Recommendations for follow-up

7. **Signature**
   - Radiologist name and credentials
   - Date and time of interpretation

### Example Report Structure

```
EXAMINATION: Chest X-Ray (PA and Lateral)
DATE: November 16, 2024

CLINICAL INDICATION: Persistent cough, fever, shortness of breath

TECHNIQUE: PA and lateral chest radiographs obtained in the 
upright position. Adequate inspiration and penetration.

COMPARISON: No prior chest radiographs available for comparison.

FINDINGS:
LUNGS: There is a focal area of consolidation in the right lower 
lobe, measuring approximately 4 x 3 cm. The consolidation has air 
bronchograms within it. No pleural effusion is identified. The 
left lung is clear.

HEART: Heart size is normal. Cardiomediastinal silhouette is 
unremarkable.

BONES: No acute osseous abnormality. Degenerative changes noted 
in the thoracic spine.

SOFT TISSUES: Unremarkable.

IMPRESSION:
1. Right lower lobe pneumonia with air bronchograms.
2. No pleural effusion or pneumothorax.
3. Normal cardiac silhouette.

RECOMMENDATION: Clinical correlation recommended. Consider 
antibiotic therapy. Follow-up chest X-ray in 4-6 weeks to 
document resolution.

Electronically signed by:
Dr. Robert Anderson, MD - Radiologist
November 16, 2024 10:30 AM
```

## Testing

### Manual Testing Checklist

**Request Creation**:
- [ ] Create imaging request with all required fields
- [ ] Create request with minimal fields (only required)
- [ ] Verify request appears in list
- [ ] Check status badge displays correctly
- [ ] Test urgency levels (routine, urgent, emergency)
- [ ] Test contrast use options (yes, no, unknown)
- [ ] Verify form reset on cancel
- [ ] Verify form reset after successful submission

**Request Display**:
- [ ] Verify all request details display correctly
- [ ] Check clinical indication displays when present
- [ ] Verify body site displays when present
- [ ] Test with no requests (empty state)
- [ ] Test loading state

**Result Display**:
- [ ] Verify examination name displays
- [ ] Check imaging findings section (blue)
- [ ] Check impression section (purple)
- [ ] Verify additional details display
- [ ] Check reported by and date
- [ ] Test with no results (empty state)
- [ ] Test loading state

**Authorization**:
- [ ] Verify doctor can create requests
- [ ] Verify nurse cannot create requests (403 error)
- [ ] Verify both doctor and nurse can view requests/results
- [ ] Verify workspace access validation

### Test Data Examples

**Example 1: Routine Chest X-Ray**
```json
{
  "type": "request",
  "data": {
    "requestName": "Chest X-Ray (PA and Lateral)",
    "description": "Two-view chest radiograph",
    "clinicalIndication": "Annual physical examination",
    "urgency": "routine",
    "contrastUse": "no",
    "targetBodySite": "Chest"
  }
}
```

**Example 2: Emergency CT Scan**
```json
{
  "type": "request",
  "data": {
    "requestName": "CT Scan - Head without Contrast",
    "description": "Non-contrast CT of head",
    "clinicalIndication": "Acute severe headache, rule out intracranial hemorrhage",
    "urgency": "emergency",
    "contrastUse": "no",
    "targetBodySite": "Head",
    "patientRequirement": "Patient stable for transport",
    "comment": "STAT examination requested"
  }
}
```

**Example 3: MRI with Special Requirements**
```json
{
  "type": "request",
  "data": {
    "requestName": "MRI Lumbar Spine without Contrast",
    "description": "Non-contrast MRI of lumbar spine",
    "clinicalIndication": "Chronic low back pain with left leg radiculopathy",
    "urgency": "routine",
    "contrastUse": "no",
    "targetBodySite": "Lumbar Spine",
    "patientRequirement": "Patient claustrophobic - sedation may be needed",
    "comment": "Patient has metal allergy, no contrast"
  }
}
```

## Troubleshooting

### Common Issues

**Issue**: Imaging request not appearing in list
- **Cause**: API call failed or data not refreshed
- **Solution**: Check browser console for errors, verify `loadImaging()` is called after creation

**Issue**: 403 Forbidden when creating request
- **Cause**: User doesn't have doctor role
- **Solution**: Verify user role in workspace membership

**Issue**: Form validation fails
- **Cause**: Required fields not filled
- **Solution**: Ensure Request Name is filled (only required field)

**Issue**: Results not linked to requests
- **Cause**: request_uid not set or incorrect
- **Solution**: Verify request_uid matches an existing request composition_uid

## Future Enhancements

### Phase 1: Enhanced Functionality
- [ ] Link results to requests automatically
- [ ] Status update capability for requests
- [ ] Request cancellation with reason
- [ ] Request modification/amendment

### Phase 2: PACS Integration
- [ ] Integration with Picture Archiving and Communication System (PACS)
- [ ] View images directly in EHR
- [ ] DICOM viewer integration
- [ ] Image thumbnails in result display

### Phase 3: Reporting Tools
- [ ] Structured reporting templates
- [ ] Voice recognition for dictation
- [ ] Report templates by modality
- [ ] Comparison with prior studies

### Phase 4: Advanced Features
- [ ] Critical result alerts and notifications
- [ ] Automatic result distribution
- [ ] Peer review and quality assurance
- [ ] Teaching file creation

### Phase 5: Analytics
- [ ] Turnaround time tracking
- [ ] Utilization statistics
- [ ] Appropriateness criteria checking
- [ ] Radiation dose monitoring
- [ ] Provider ordering patterns

## Database Schema (Future)

When migrating from in-memory to database storage:

```sql
CREATE TABLE imaging_requests (
  id SERIAL PRIMARY KEY,
  composition_uid VARCHAR(255) UNIQUE NOT NULL,
  patient_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  recorded_time TIMESTAMP NOT NULL,
  request_name VARCHAR(255) NOT NULL,
  description TEXT,
  clinical_indication TEXT,
  urgency VARCHAR(50) NOT NULL,
  supporting_doc_image TEXT,
  patient_requirement TEXT,
  comment TEXT,
  target_body_site VARCHAR(255),
  structured_target_body_site VARCHAR(255),
  contrast_use VARCHAR(50),
  requested_by VARCHAR(255) NOT NULL,
  requested_by_id UUID NOT NULL,
  request_status VARCHAR(50) NOT NULL DEFAULT 'requested',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (patient_id) REFERENCES patients(patientid),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspaceid),
  FOREIGN KEY (requested_by_id) REFERENCES users(userid)
);

CREATE TABLE imaging_results (
  id SERIAL PRIMARY KEY,
  composition_uid VARCHAR(255) UNIQUE NOT NULL,
  patient_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  request_id INTEGER,
  request_uid VARCHAR(255),
  recorded_time TIMESTAMP NOT NULL,
  examination_name VARCHAR(255) NOT NULL,
  body_structure VARCHAR(255),
  body_site VARCHAR(255),
  structured_body_site VARCHAR(255),
  imaging_findings TEXT,
  additional_details TEXT,
  impression TEXT,
  comment TEXT,
  performed_by VARCHAR(255),
  reported_by VARCHAR(255),
  reported_by_id UUID,
  report_date TIMESTAMP NOT NULL,
  result_status VARCHAR(50) NOT NULL DEFAULT 'preliminary',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (patient_id) REFERENCES patients(patientid),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspaceid),
  FOREIGN KEY (request_id) REFERENCES imaging_requests(id),
  FOREIGN KEY (reported_by_id) REFERENCES users(userid)
);

CREATE INDEX idx_imaging_requests_patient ON imaging_requests(patient_id);
CREATE INDEX idx_imaging_requests_workspace ON imaging_requests(workspace_id);
CREATE INDEX idx_imaging_requests_status ON imaging_requests(request_status);
CREATE INDEX idx_imaging_requests_recorded_time ON imaging_requests(recorded_time DESC);

CREATE INDEX idx_imaging_results_patient ON imaging_results(patient_id);
CREATE INDEX idx_imaging_results_workspace ON imaging_results(workspace_id);
CREATE INDEX idx_imaging_results_request ON imaging_results(request_id);
CREATE INDEX idx_imaging_results_status ON imaging_results(result_status);
CREATE INDEX idx_imaging_results_report_date ON imaging_results(report_date DESC);
```

## Best Practices

### For Developers
1. **Always validate input**: Check required fields before API calls
2. **Handle errors gracefully**: Provide clear error messages to users
3. **Maintain consistency**: Follow the same patterns as other features
4. **Log appropriately**: Use console.log for debugging, proper logging in production
5. **Test authorization**: Verify role-based access control works correctly
6. **Link requests to results**: Use request_uid to maintain relationships

### For Healthcare Providers
1. **Provide clinical indication**: Always include reason for examination
2. **Specify urgency appropriately**: Reserve emergency for true emergencies
3. **Include patient requirements**: Note special needs or contraindications
4. **Add relevant comments**: Include pertinent clinical information
5. **Review results promptly**: Check for critical findings requiring immediate action

### For Radiologists
1. **Use structured reporting**: Follow standard report format
2. **Be specific**: Include measurements and precise descriptions
3. **Provide clear impressions**: Summarize key findings
4. **Make recommendations**: Suggest follow-up or additional imaging if needed
5. **Communicate critical findings**: Notify ordering physician immediately

### For System Administrators
1. **Monitor turnaround times**: Track time from request to result
2. **Regular backups**: Ensure imaging data is backed up
3. **Audit access**: Review who is creating and viewing imaging data
4. **Update modality lists**: Keep examination types current
5. **Train users**: Ensure staff understand the system

## Support & Resources

### Documentation
- This document: Complete imaging feature documentation
- API documentation: See API Endpoints section above
- User guide: See User Interface section above

### Related Features
- **Test Orders**: Order laboratory tests
- **Lab Results**: View laboratory test results
- **Prescriptions**: Manage medication orders

### Standards & References
- openEHR Imaging Exam Request: `INSTRUCTION.imaging_exam_request`
- openEHR Imaging Exam Result: `OBSERVATION.imaging_exam_result`
- DICOM Standard: Digital Imaging and Communications in Medicine
- HL7 FHIR ImagingStudy Resource

## Change Log

### Version 1.0.0 (2025-11-17)
- Initial implementation of imaging requests and results
- Support for multiple imaging modalities
- Request creation with urgency levels
- Result display with findings and impressions
- Role-based authorization
- In-memory storage for development
- Comprehensive dummy data with realistic radiology reports

## Glossary

### Imaging Terms

- **Modality**: Type of imaging equipment or technique (X-Ray, CT, MRI, etc.)
- **Contrast**: Substance administered to enhance visibility of structures
- **PACS**: Picture Archiving and Communication System - stores medical images
- **DICOM**: Digital Imaging and Communications in Medicine - standard format
- **Radiologist**: Physician specialized in interpreting medical images
- **Technologist**: Healthcare professional who performs imaging examinations
- **Impression**: Radiologist's interpretation and diagnosis
- **Findings**: Detailed description of what is seen on images
- **Indication**: Medical reason for ordering the examination
- **Protocol**: Specific imaging technique or sequence used

### Clinical Terms

- **PA**: Posterior-Anterior (X-ray beam direction)
- **AP**: Anterior-Posterior (X-ray beam direction)
- **Lateral**: Side view
- **Axial**: Cross-sectional view
- **Sagittal**: Side-to-side plane
- **Coronal**: Front-to-back plane
- **Contrast-enhanced**: With contrast agent
- **Non-contrast**: Without contrast agent
- **STAT**: Immediately, highest priority
- **NPO**: Nothing by mouth (fasting)

### Status Terms

- **Requested**: Order placed, awaiting scheduling
- **Scheduled**: Appointment set
- **In-progress**: Examination being performed
- **Completed**: Examination finished
- **Preliminary**: Initial report, may be revised
- **Final**: Definitive report
- **Amended**: Corrected or updated report
- **Critical**: Urgent finding requiring immediate attention

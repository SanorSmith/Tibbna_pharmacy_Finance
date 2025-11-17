# Clinical Notes Documentation

## Overview

The Clinical Notes feature provides a comprehensive system for documenting patient encounters following the SOAP (Subjective, Objective, Assessment, Plan) format. This feature is fully compliant with openEHR standards and follows medical documentation best practices.

---

## Table of Contents

1. [Features](#features)
2. [openEHR Compliance](#openehr-compliance)
3. [SOAP Format](#soap-format)
4. [User Interface](#user-interface)
5. [Data Model](#data-model)
6. [API Endpoints](#api-endpoints)
7. [Authorization](#authorization)
8. [Note Types](#note-types)
9. [Dummy Data](#dummy-data)
10. [Usage Guide](#usage-guide)
11. [Best Practices](#best-practices)

---

## Features

### Core Functionality
- ✅ Create clinical notes with SOAP format
- ✅ Multiple note types (Progress, Consultation, Discharge, Synopsis)
- ✅ Role-based authorization (doctors create, doctors/nurses view)
- ✅ Status tracking (Draft, Final, Amended)
- ✅ Author attribution with role
- ✅ Timestamp tracking
- ✅ Synopsis (summary) for quick review
- ✅ Clinical context documentation
- ✅ Additional comments

### Display Features
- ✅ Card-based layout for easy scanning
- ✅ Color-coded synopsis section
- ✅ Clearly labeled SOAP sections
- ✅ Status badges
- ✅ Author and timestamp display
- ✅ Loading and empty states

---

## openEHR Compliance

### Archetype Reference
**Primary Archetype**: `EVALUATION.clinical_synopsis`
**Alternative**: `OBSERVATION.progress_note`

### Composition Structure
```typescript
interface ClinicalNote {
  // Composition metadata
  composition_uid: string;        // Unique identifier
  recorded_time: string;          // ISO 8601 timestamp
  
  // Note identification
  note_type: string;              // Type of clinical note
  note_title?: string;            // Optional descriptive title
  
  // Synopsis (openEHR: Clinical synopsis)
  synopsis: string;               // Brief summary (required)
  
  // SOAP Format (openEHR: Clinical description)
  subjective?: string;            // Patient's perspective
  objective?: string;             // Clinical findings
  assessment?: string;            // Clinical impression
  plan?: string;                  // Treatment plan
  
  // Additional context
  clinical_context?: string;      // Encounter context
  comment?: string;               // Additional observations
  
  // Metadata
  author: string;                 // Who created the note
  author_role: string;            // Role (doctor, nurse, specialist)
  status: string;                 // Draft, Final, Amended
}
```

### openEHR Principles Applied
1. **Composition-based**: Each note is a separate composition
2. **Archetype-compliant**: Follows clinical synopsis structure
3. **Terminology-ready**: Supports coded values for note types
4. **Versioning**: UIDs enable version tracking
5. **Audit trail**: Author and timestamp tracking
6. **Status management**: Draft → Final → Amended workflow

---

## SOAP Format

### What is SOAP?

SOAP is a standardized method for clinical documentation:

#### **S - Subjective**
Patient's perspective and reported symptoms:
- Chief complaint
- History of present illness
- Patient's description of symptoms
- Review of systems (patient-reported)

**Example**:
```
Patient reports feeling well with no symptoms. Compliant with medications 
(Lisinopril 10mg daily). Denies chest pain, shortness of breath, or dizziness. 
Following low-sodium diet and exercising 3 times per week.
```

#### **O - Objective**
Clinical findings and measurements:
- Vital signs
- Physical examination findings
- Laboratory results
- Imaging results
- Observed behaviors

**Example**:
```
BP: 128/82 mmHg, HR: 72 bpm, Weight: 78 kg (stable)
General: Alert and oriented, no acute distress
Cardiovascular: Regular rate and rhythm, no murmurs
Lungs: Clear to auscultation bilaterally
```

#### **A - Assessment**
Clinical impression and diagnosis:
- Primary diagnosis
- Differential diagnoses
- Problem list
- Clinical reasoning

**Example**:
```
1. Essential hypertension - well controlled
2. Hyperlipidemia - on statin therapy
3. Prediabetes - managed with lifestyle modifications
```

#### **P - Plan**
Treatment and follow-up:
- Medications (continue, start, stop, adjust)
- Diagnostic tests ordered
- Referrals
- Follow-up appointments
- Patient education
- Lifestyle modifications

**Example**:
```
1. Continue Lisinopril 10mg daily
2. Continue Atorvastatin 20mg at bedtime
3. Repeat lipid panel in 3 months
4. Follow-up in 3 months or sooner if symptoms develop
5. Continue lifestyle modifications
```

---

## User Interface

### Notes Tab Display

#### Note Card Structure
```
┌─────────────────────────────────────────────────────┐
│ Follow-up Visit - Hypertension Management    [FINAL]│
│ Nov 17, 2024, 10:30 AM • Dr. Sarah Mitchell (doctor)│
├─────────────────────────────────────────────────────┤
│ 📘 SYNOPSIS                                         │
│ Patient presents for routine follow-up of           │
│ hypertension. Blood pressure well-controlled...     │
├─────────────────────────────────────────────────────┤
│ SUBJECTIVE                                          │
│ Patient reports feeling well with no symptoms...    │
│                                                     │
│ OBJECTIVE                                           │
│ BP: 128/82 mmHg, HR: 72 bpm...                     │
│                                                     │
│ ASSESSMENT                                          │
│ 1. Essential hypertension - well controlled         │
│                                                     │
│ PLAN                                                │
│ 1. Continue Lisinopril 10mg daily...               │
├─────────────────────────────────────────────────────┤
│ Context: Routine follow-up visit                    │
│ Comment: Patient is motivated and compliant...      │
└─────────────────────────────────────────────────────┘
```

#### Status Badges
- **FINAL** (Green) - Completed and signed note
- **DRAFT** (Yellow) - Work in progress
- **AMENDED** (Blue) - Modified after finalization

#### Color Coding
- **Synopsis**: Blue background (`bg-blue-50`)
- **SOAP Sections**: Standard text with bold headers
- **Context/Comments**: Gray text with border separator

---

## Data Model

### Database Schema (Conceptual)

```sql
CREATE TABLE clinical_notes (
  composition_uid VARCHAR(255) PRIMARY KEY,
  recorded_time TIMESTAMP NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  
  -- Note identification
  note_type VARCHAR(50) NOT NULL,
  note_title VARCHAR(255),
  
  -- Synopsis
  synopsis TEXT NOT NULL,
  
  -- SOAP format
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  
  -- Additional context
  clinical_context TEXT,
  comment TEXT,
  
  -- Metadata
  author VARCHAR(255) NOT NULL,
  author_role VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  INDEX idx_patient_recorded (patient_id, recorded_time DESC),
  INDEX idx_status (status),
  INDEX idx_note_type (note_type)
);
```

### TypeScript Interface

```typescript
interface ClinicalNote {
  composition_uid: string;
  recorded_time: string;
  note_type: 'progress_note' | 'consultation_note' | 'discharge_summary' | 'clinical_synopsis';
  note_title?: string;
  synopsis: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  clinical_context?: string;
  comment?: string;
  author: string;
  author_role: 'doctor' | 'nurse' | 'specialist';
  status: 'draft' | 'final' | 'amended';
}
```

---

## API Endpoints

### Base URL
```
/api/d/[workspaceid]/patients/[patientid]/notes
```

### GET - Retrieve Clinical Notes

**Endpoint**: `GET /api/d/[workspaceid]/patients/[patientid]/notes`

**Authorization**: Doctors, Nurses, Admins

**Response**:
```json
{
  "notes": [
    {
      "composition_uid": "clinical-note-1731847200000-001",
      "recorded_time": "2024-11-17T10:30:00.000Z",
      "note_type": "progress_note",
      "note_title": "Follow-up Visit - Hypertension Management",
      "synopsis": "Patient presents for routine follow-up...",
      "subjective": "Patient reports feeling well...",
      "objective": "BP: 128/82 mmHg, HR: 72 bpm...",
      "assessment": "1. Essential hypertension - well controlled...",
      "plan": "1. Continue Lisinopril 10mg daily...",
      "clinical_context": "Routine follow-up visit",
      "comment": "Patient is motivated and compliant",
      "author": "Dr. Sarah Mitchell, MD",
      "author_role": "doctor",
      "status": "final"
    }
  ]
}
```

### POST - Create Clinical Note

**Endpoint**: `POST /api/d/[workspaceid]/patients/[patientid]/notes`

**Authorization**: Doctors, Admins only

**Request Body**:
```json
{
  "note": {
    "noteType": "progress_note",
    "noteTitle": "Follow-up Visit - Hypertension",
    "synopsis": "Patient presents for routine follow-up of hypertension",
    "subjective": "Patient reports feeling well...",
    "objective": "BP: 128/82 mmHg...",
    "assessment": "1. Essential hypertension - well controlled",
    "plan": "1. Continue current medications",
    "clinicalContext": "Routine follow-up",
    "comment": "Patient compliant with treatment",
    "status": "final"
  }
}
```

**Response** (201 Created):
```json
{
  "note": {
    "composition_uid": "clinical-note-1731847200000-abc123",
    "recorded_time": "2024-11-17T10:30:00.000Z",
    // ... full note object
  }
}
```

**Error Responses**:
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have permission (not a doctor)
- `500 Internal Server Error`: Server error

---

## Authorization

### Role-Based Access Control

| Role | View Notes | Create Notes | Edit Notes |
|------|-----------|--------------|------------|
| Doctor | ✅ | ✅ | ✅ |
| Nurse | ✅ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ |
| Patient | ❌ | ❌ | ❌ |

### Implementation

```typescript
// View authorization
const userRole = membership.role?.toLowerCase();
if (!["doctor", "nurse", "admin"].includes(userRole || "")) {
  return NextResponse.json(
    { error: "Insufficient permissions" },
    { status: 403 }
  );
}

// Create authorization
if (!["doctor", "admin"].includes(userRole || "")) {
  return NextResponse.json(
    { error: "Only doctors can create clinical notes" },
    { status: 403 }
  );
}
```

---

## Note Types

### 1. Progress Note
**Use Case**: Routine follow-up visits, ongoing care

**Typical Content**:
- Interval history since last visit
- Current symptoms and complaints
- Medication compliance
- Physical examination
- Assessment of chronic conditions
- Medication adjustments
- Follow-up plan

**Example Title**: "Follow-up Visit - Hypertension Management"

### 2. Consultation Note
**Use Case**: Specialist consultations, second opinions

**Typical Content**:
- Reason for consultation
- Detailed history relevant to specialty
- Specialized examination
- Diagnostic test results
- Specialist assessment
- Recommendations to referring physician
- Follow-up plan

**Example Title**: "Cardiology Consultation - Chest Pain Evaluation"

### 3. Discharge Summary
**Use Case**: Hospital discharge, procedure completion

**Typical Content**:
- Admission diagnosis
- Hospital course summary
- Procedures performed
- Medications at discharge
- Discharge instructions
- Follow-up appointments
- Patient education provided

**Example Title**: "Hospital Discharge Summary - Pneumonia Treatment"

### 4. Clinical Synopsis
**Use Case**: Brief encounter notes, quick updates

**Typical Content**:
- Brief encounter summary
- Key findings
- Immediate actions taken
- Short-term plan

**Example Title**: "Brief Encounter - Medication Refill"

---

## Dummy Data

### Note 1: Progress Note - Hypertension Follow-up

**Complete SOAP Documentation**:
- **Synopsis**: Routine follow-up, BP well-controlled
- **Subjective**: Patient feeling well, compliant with meds
- **Objective**: BP 128/82, HR 72, stable weight
- **Assessment**: HTN controlled, hyperlipidemia, prediabetes
- **Plan**: Continue current meds, repeat labs in 3 months

### Note 2: Consultation Note - Cardiology

**Specialist Evaluation**:
- **Synopsis**: Chest pain evaluation, negative cardiac workup
- **Subjective**: Atypical chest pain, not exertional
- **Objective**: Stress test negative, echo normal LVEF 60%
- **Assessment**: Musculoskeletal chest pain, no CAD
- **Plan**: Reassurance, NSAIDs, risk factor modification

### Note 3: Progress Note - Acute URI

**Acute Visit**:
- **Synopsis**: Acute cold symptoms, viral URI
- **Subjective**: 3 days of congestion, sore throat, cough
- **Objective**: Temp 37.2°C, pharynx erythematous, lungs clear
- **Assessment**: Viral upper respiratory infection
- **Plan**: Symptomatic treatment, return if worsens

---

## Usage Guide

### For Physicians

#### Creating a New Note

1. **Navigate to Notes Tab**
   - Click "Notes" tab (first tab in dashboard)
   - Click "+ New Note" button

2. **Select Note Type**
   - Choose from dropdown: Progress Note, Consultation Note, etc.
   - Add optional note title for clarity

3. **Write Synopsis** (Required)
   - Brief 1-2 sentence summary
   - Should capture the essence of the encounter

4. **Complete SOAP Sections** (Recommended)
   - **Subjective**: Patient's complaints and history
   - **Objective**: Your examination findings
   - **Assessment**: Your clinical impression
   - **Plan**: Treatment and follow-up

5. **Add Context and Comments**
   - Clinical context: Type of encounter
   - Comments: Additional observations

6. **Submit**
   - Click "Create Note"
   - Note automatically saved as "Final" status
   - Form clears for next note

#### Best Practices

✅ **Do**:
- Write synopsis first - it helps organize your thoughts
- Use complete SOAP format for comprehensive visits
- Be specific in assessment and plan
- Document patient education provided
- Include follow-up instructions

❌ **Don't**:
- Use abbreviations that aren't standard
- Leave synopsis empty
- Skip the plan section
- Forget to document allergies or alerts
- Use vague language ("patient doing okay")

---

## Best Practices

### Clinical Documentation Standards

#### 1. Timeliness
- Document encounters as soon as possible
- Complete notes within 24 hours
- Update status from draft to final promptly

#### 2. Completeness
- Include all SOAP sections for comprehensive visits
- Document negative findings when relevant
- Include patient education and instructions
- Note any changes to medications

#### 3. Clarity
- Use clear, professional language
- Avoid ambiguous terms
- Be specific with measurements and observations
- Use standard medical terminology

#### 4. Accuracy
- Double-check vital signs and measurements
- Verify medication names and dosages
- Ensure diagnosis codes are correct
- Review before finalizing

#### 5. Legal Considerations
- Document objective findings, not opinions
- Include rationale for clinical decisions
- Note informed consent when applicable
- Document patient non-compliance objectively

### SOAP Writing Tips

#### Subjective Section
```
Good: "Patient reports 3/10 chest pain, sharp, left-sided, 
       worse with deep breathing, started 2 days ago"

Avoid: "Patient has chest pain"
```

#### Objective Section
```
Good: "BP 128/82 mmHg, HR 72 bpm regular, Lungs: CTAB, 
       no wheezes or crackles"

Avoid: "Vitals okay, exam normal"
```

#### Assessment Section
```
Good: "1. Essential hypertension (I10) - well controlled on current regimen
       2. Hyperlipidemia (E78.5) - LDL 120 mg/dL, at goal"

Avoid: "Patient doing well"
```

#### Plan Section
```
Good: "1. Continue Lisinopril 10mg PO daily
       2. Repeat lipid panel in 3 months
       3. Follow-up appointment in 3 months
       4. Call if symptoms worsen"

Avoid: "Continue meds, follow up later"
```

---

## Integration with Dashboard

### Clinical Summary Display
Notes are featured prominently in the Clinical Summary section:
- **Last Visit**: Shows most recent note date and title
- **Quick Access**: Direct link to Notes tab
- **Recent Activity**: Displays in dashboard summary

### Tab Organization
Notes tab is positioned first in the clinical workflow:
1. **Notes** (Default tab) - Primary documentation
2. Vitals
3. History
4. Diagnoses
5. (Other tabs...)

---

## Future Enhancements

### Planned Features
- [ ] Note templates for common visit types
- [ ] Voice-to-text dictation
- [ ] Addendum functionality
- [ ] Co-signature workflow
- [ ] Note search and filtering
- [ ] Export to PDF
- [ ] Integration with billing codes
- [ ] Smart suggestions based on diagnosis

### Advanced Features
- [ ] Natural language processing for coding suggestions
- [ ] Quality metrics (note completeness score)
- [ ] Peer review workflow
- [ ] Teaching file annotations
- [ ] Research data extraction

---

## Troubleshooting

### Common Issues

**Issue**: "Only doctors can create clinical notes" error
**Solution**: Verify your user role is set to "doctor" or "admin"

**Issue**: Synopsis field shows error
**Solution**: Synopsis is required - cannot be empty

**Issue**: Notes not loading
**Solution**: Check network connection and API endpoint availability

**Issue**: Form doesn't clear after submission
**Solution**: This is a known issue - refresh the page as workaround

---

## References

### Standards & Guidelines
- openEHR Clinical Knowledge Manager: https://ckm.openehr.org/
- HL7 Clinical Document Architecture
- SOAP Note Format: https://www.aafp.org/
- Medical Documentation Best Practices

### Related Documentation
- [Patient Dashboard](./PATIENT_DASHBOARD.md)
- [openEHR Production Deployment](./OPENEHR_PRODUCTION_DEPLOYMENT.md)
- [API Documentation](./API.md)

---

## Support

For questions or issues:
- Review this documentation
- Check the troubleshooting section
- Consult the development team
- Review openEHR specifications

---

**Last Updated**: November 17, 2024
**Version**: 1.0.0
**Status**: Production Ready

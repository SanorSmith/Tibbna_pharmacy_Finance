# OpenEHR Integration for LIMS Validation Tab

## Overview

This document describes the integration between the LIMS validation workflow and OpenEHR using the `template_laboratory_report_v2` template. This allows lab technicians to submit validated test results directly to OpenEHR from the validation tab.

**Note:** We use the V2 template because it's simpler, more flexible, and fully compatible with the FLAT format. The V1 template is more complex and designed for comprehensive specimen tracking workflows.

## Architecture

### Components

1. **Service Layer** (`lib/openehr/laboratory.ts`)
   - Handles OpenEHR V2 template composition building
   - Provides API functions for creating laboratory reports
   - Maps LIMS data to OpenEHR V2 format

2. **API Endpoint** (`app/api/lims/submit-to-openehr/route.ts`)
   - Receives validated results from LIMS
   - Fetches patient and sample data
   - Creates OpenEHR composition using V2 template
   - Updates sample record with composition UID

3. **UI Component** (`WorklistValidationModal.tsx`)
   - "Submit to OpenEHR" button in validation modal
   - Dialog for setting report status and conclusion
   - Real-time validation and error handling

## Workflow

### Step-by-Step Process

1. **Lab Technician validates results** in the ValidationTab
   - Enter test results for each analyte
   - Review reference ranges and flags
   - Save results to LIMS database

2. **Submit to OpenEHR**
   - Click "Submit to OpenEHR" button
   - Dialog opens showing sample information
   - Select report status (Preliminary/Final/Amended)
   - Optionally add overall conclusion
   - Click "Submit to OpenEHR"

3. **Backend Processing**
   - API fetches sample and patient data
   - Validates patient has EHR ID
   - Maps LIMS results to V1 template format
   - Creates OpenEHR composition
   - Updates sample with composition UID

4. **Confirmation**
   - Success message with composition UID
   - Sample record updated with OpenEHR reference
   - Results now available in patient's EHR

## Data Mapping

### LIMS to OpenEHR V2 Template

```typescript
LIMS Sample → OpenEHR Specimen
├── sampletype → specimen.specimenType
├── samplenumber → specimen.specimenId
├── collectiondate → specimen.collectionDateTime
├── containertype → specimen.containerType
├── volume → specimen.volume
└── volumeunit → specimen.volumeUnit

LIMS Test Result → OpenEHR Analyte Result
├── testname → analyte.analyteName
├── testcode → analyte.analyteCode
├── resultvalue → analyte.result (quantity or text)
├── unit → analyte.resultUnit
├── referencerange → analyte.referenceRangeGuidance
├── flag (H/L/N) → analyte.interpretation
└── status → analyte.resultStatus
```

### Interpretation Mapping

| LIMS Flag | OpenEHR Interpretation |
|-----------|------------------------|
| N (Normal) | Normal (at0017) |
| H (High) | High (at0018) |
| L (Low) | Low (at0019) |
| Critical | Critical (at0020) |
| Abnormal | Abnormal (at0020) |

### Status Mapping

| Report Status | OpenEHR Code |
|---------------|--------------|
| Preliminary | at0008 |
| Final | at0009 |
| Amended | at0010 |

## Template Structure (template_laboratory_report_v2)

### Key Sections

1. **Context**
   - Report ID
   - Report date/time
   - Status

2. **Laboratory Test Result (OBSERVATION)**
   - Test name
   - Test method
   - Laboratory name
   - Specimen type

3. **Test Events** (Array)
   - Test name
   - Test status
   - Clinical information
   - Overall interpretation
   - Event time

4. **Test Results** (Array within each event)
   - Result name
   - Result value (quantity with magnitude and unit)
   - Reference range
   - Interpretation
   - Comments

## API Reference

### POST /api/lims/submit-to-openehr

Submit validated test results to OpenEHR.

**Request Body:**
```json
{
  "sampleId": "uuid",
  "workspaceId": "string",
  "results": [
    {
      "testCode": "string",
      "testName": "string",
      "resultValue": "string | number",
      "unit": "string",
      "referenceMin": "number",
      "referenceMax": "number",
      "referenceRange": "string",
      "flag": "N | H | L",
      "isAbnormal": "boolean",
      "isCritical": "boolean"
    }
  ],
  "overallStatus": "preliminary | final | amended",
  "conclusion": "string (optional)",
  "composerName": "string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "compositionUid": "uuid::domain::version",
  "message": "Laboratory report successfully submitted to OpenEHR",
  "ehrId": "uuid",
  "sampleNumber": "SMP-2026-0001"
}
```

**Response (Error):**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Prerequisites

### Patient Requirements

1. **Patient must have EHR ID**
   - Create EHR in OpenEHR before submitting results
   - EHR ID stored in `patients.ehrid` field

2. **Sample must be linked to patient**
   - `accessionSamples.patientid` must be set
   - Patient record must exist

### Template Requirements

1. **template_laboratory_report_v2 template must be uploaded to OpenEHR**
   - Use script: `openehr/scripts/2-upload-templates.sh`
   - Template file: `openehr/templates/template_laboratory_report_v2.opt`

2. **OpenEHR credentials configured**
   - `EHRBASE_URL` environment variable
   - `EHRBASE_API_KEY` environment variable
   - `EHRBASE_USER` environment variable
   - `EHRBASE_PASSWORD` environment variable

## Error Handling

### Common Errors

1. **"Patient does not have an OpenEHR EHR ID"**
   - **Solution:** Create EHR for patient first
   - Navigate to Admin → OpenEHR → EHRs
   - Create EHR for the patient

2. **"Sample not found"**
   - **Solution:** Verify sample ID is correct
   - Check sample exists in database

3. **"No results to submit"**
   - **Solution:** Enter test results before submitting
   - At least one result must have a value

4. **"Failed to submit to OpenEHR"**
   - **Solution:** Check OpenEHR connection
   - Verify template is uploaded
   - Check credentials are correct

## Usage Example

### Complete Workflow

```typescript
// 1. Lab tech enters results in validation tab
// Sample: SMP-2026-0001
// Patient: John Doe (has EHR ID)

// 2. Results entered:
// - Hemoglobin: 14.5 g/dL (Normal)
// - WBC: 7.2 ×10³/μL (Normal)
// - Platelets: 250 ×10³/μL (Normal)

// 3. Click "Submit to OpenEHR"
// 4. Select status: "Final"
// 5. Add conclusion: "Complete blood count within normal limits"
// 6. Submit

// 7. OpenEHR composition created:
// Composition UID: abc123::domain::1
// Template: laboratory_report_v1
// Status: Final
// Results: 3 analytes

// 8. Sample updated:
// openehrcompositionuid: abc123::domain::1
```

## Benefits

### For Lab Technicians
- ✅ Single-click submission to OpenEHR
- ✅ Automatic data mapping
- ✅ Real-time validation
- ✅ Error feedback

### For Clinicians
- ✅ Results available in patient EHR
- ✅ Standardized format (OpenEHR)
- ✅ Complete audit trail
- ✅ Interoperable with other systems

### For System
- ✅ Standards-compliant (OpenEHR)
- ✅ Full traceability
- ✅ Automated workflow
- ✅ Data integrity

## Future Enhancements

### Planned Features

1. **Batch Submission**
   - Submit multiple samples at once
   - Bulk operations for worklists

2. **Auto-submission**
   - Automatic submission on result release
   - Configurable triggers

3. **Result Amendments**
   - Update existing compositions
   - Version tracking

4. **Enhanced Specimen Tracking**
   - Full V1 template specimen workflow
   - Quality control data
   - Chain of custody

5. **Integration with Patient Dashboard**
   - Display submitted results
   - Link to original LIMS data

## Troubleshooting

### Debug Mode

Enable detailed logging:
```typescript
// In API endpoint
console.log("Sample data:", sample);
console.log("Mapped results:", mappedResults);
console.log("OpenEHR response:", response.data);
```

### Verify Template Upload

```bash
# Check if template exists in OpenEHR
curl -X GET "https://base.tibbna.com/ehrbase/rest/openehr/v1/definition/template/adl1.4/laboratory_report_v1" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Authorization: Basic BASE64_CREDENTIALS"
```

### Test Composition Creation

```bash
# Test creating a composition manually
curl -X POST "https://base.tibbna.com/ehrbase/rest/openehr/v1/ehr/EHR_ID/composition?format=FLAT&templateId=laboratory_report_v1" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Authorization: Basic BASE64_CREDENTIALS" \
  -H "Content-Type: application/json" \
  -d @test-composition.json
```

## Related Documentation

- [OpenEHR Template Guide](./OPENEHR_TEMPLATES.md)
- [LIMS Validation Workflow](./LIMS_VALIDATION.md)
- [Patient EHR Management](./PATIENT_EHR.md)

## Support

For issues or questions:
1. Check error messages in browser console
2. Review server logs for API errors
3. Verify OpenEHR connection and credentials
4. Ensure template is properly uploaded

# Test Reference Ranges Management System

## Overview

A comprehensive test reference data management system that allows lab administrators to manage reference ranges, units, and critical values for all laboratory tests with age group and sex-specific ranges.

## Features

✅ **Age Group Support**
- NEO (Neonatal: 0-28 days)
- PED (Pediatric: 1 month - 17 years)
- ADULT (≥18 years)
- ALL (All ages)

✅ **Sex-Specific Ranges**
- Male (M)
- Female (F)
- Any/Both (ANY)

✅ **Comprehensive Data Management**
- Reference ranges (numeric min/max or text)
- Panic/Critical values (low and high thresholds)
- Units of measurement
- Test categorization
- Notes and metadata

✅ **Full CRUD Operations**
- Create new test references
- Edit existing references
- Soft delete (deactivate)
- Search and filter

## Database Schema

**Table:** `test_reference_ranges`

```sql
CREATE TABLE test_reference_ranges (
  rangeid UUID PRIMARY KEY,
  workspaceid UUID NOT NULL,
  testcode VARCHAR(50) NOT NULL,
  testname VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(100) NOT NULL,
  agegroup VARCHAR(20) NOT NULL DEFAULT 'ALL',
  sex VARCHAR(10) NOT NULL DEFAULT 'ANY',
  referencemin NUMERIC(10,4),
  referencemax NUMERIC(10,4),
  referencetext TEXT,
  paniclow NUMERIC(10,4),
  panichigh NUMERIC(10,4),
  panictext TEXT,
  notes TEXT,
  isactive VARCHAR(1) NOT NULL DEFAULT 'Y',
  createdby UUID NOT NULL,
  createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedby UUID,
  updatedat TIMESTAMP WITH TIME ZONE
);
```

## Setup Instructions

### 1. Run Database Migration

First, generate and run the database migration to create the new table:

```bash
# Generate migration
npm run db:generate

# Push to database
npm run db:push
```

### 2. Seed Initial Data

Before running the seed script, update the following values in `scripts/seed-test-reference-ranges.ts`:

```typescript
const WORKSPACE_ID = "your-workspace-id-here";
const CREATED_BY = "your-admin-user-id-here";
```

Then run the seed script:

```bash
npx tsx scripts/seed-test-reference-ranges.ts
```

This will populate the database with comprehensive reference data for:
- **Hematology**: CBC components, coagulation, blood smear, anemia workup
- **Biochemistry**: Electrolytes, renal function, liver function, glucose & lipids
- **Immunology**: Infection/viral markers, autoimmune, TORCH panel, tumor markers
- **Microbiology**: Cultures and organism detection
- **Histopathology**: Biopsy, cytology, molecular tests
- **Endocrinology**: Thyroid function

## Usage

### Accessing the Management Interface

1. Navigate to: `/d/[workspaceid]/lab-management`
2. Click on the **"Test References"** tab
3. The interface will load with all existing test reference ranges

### Adding a New Test Reference

1. Click **"Add Test Reference"** button
2. Fill in the required fields:
   - **Test Code**: Unique identifier (e.g., HGB, WBC)
   - **Test Name**: Full test name
   - **Category**: Select from predefined categories
   - **Unit**: Unit of measurement
   - **Age Group**: Select target age group
   - **Sex**: Select sex specificity
3. Enter reference ranges:
   - **Numeric**: Enter min/max values
   - **Text**: For non-numeric ranges (e.g., "Negative", "Absent")
4. Enter panic/critical values:
   - **Numeric**: Enter low/high thresholds
   - **Text**: For non-numeric panic values
5. Add notes if needed
6. Click **"Create"**

### Editing a Test Reference

1. Find the test in the table
2. Click the **Edit** icon (pencil)
3. Modify the fields as needed
4. Click **"Update"**

### Deleting a Test Reference

1. Find the test in the table
2. Click the **Delete** icon (trash)
3. Confirm the deletion
4. The reference will be soft-deleted (marked as inactive)

### Searching and Filtering

- **Search**: Type test code or name in the search box
- **Category Filter**: Select a specific category
- **Age Group Filter**: Filter by age group
- **Clear Filters**: Reset all filters

## API Endpoints

### GET `/api/d/[workspaceid]/test-reference-ranges`

Fetch all reference ranges for a workspace.

**Query Parameters:**
- `testcode`: Filter by test code
- `category`: Filter by category
- `agegroup`: Filter by age group
- `sex`: Filter by sex
- `isactive`: Filter by active status (default: Y)

**Response:**
```json
{
  "ranges": [
    {
      "rangeid": "uuid",
      "testcode": "HGB",
      "testname": "Hemoglobin",
      "category": "Hematology",
      "unit": "g/dL",
      "agegroup": "ADULT",
      "sex": "M",
      "referencemin": "13.0",
      "referencemax": "17.0",
      "paniclow": "7.0",
      "panichigh": "20.0",
      ...
    }
  ]
}
```

### POST `/api/d/[workspaceid]/test-reference-ranges`

Create a new reference range.

**Request Body:**
```json
{
  "testcode": "HGB",
  "testname": "Hemoglobin",
  "category": "Hematology",
  "unit": "g/dL",
  "agegroup": "ADULT",
  "sex": "M",
  "referencemin": 13.0,
  "referencemax": 17.0,
  "paniclow": 7.0,
  "panichigh": 20.0
}
```

### PUT `/api/d/[workspaceid]/test-reference-ranges`

Update an existing reference range.

**Request Body:**
```json
{
  "rangeid": "uuid",
  "testname": "Updated Name",
  "referencemin": 14.0,
  ...
}
```

### DELETE `/api/d/[workspaceid]/test-reference-ranges?rangeid=uuid`

Soft delete a reference range (marks as inactive).

## Integration with Results Entry

The test reference data can be integrated with the results entry system to:

1. **Auto-populate** units and reference ranges when entering results
2. **Auto-flag** results as normal, abnormal, or critical based on reference ranges
3. **Validate** entered results against panic values
4. **Display** age and sex-specific ranges based on patient demographics

### Example Integration

```typescript
// Fetch reference data for a test
const response = await fetch(
  `/api/d/${workspaceid}/test-reference-ranges?testcode=HGB&agegroup=ADULT&sex=M`
);
const { ranges } = await response.json();

// Use the first matching range
const refData = ranges[0];

// Auto-populate fields
result.unit = refData.unit;
result.referencemin = parseFloat(refData.referencemin);
result.referencemax = parseFloat(refData.referencemax);

// Auto-flag based on value
if (resultValue < refData.paniclow) {
  result.flag = "LL"; // Critically Low
  result.iscritical = true;
} else if (resultValue < refData.referencemin) {
  result.flag = "L"; // Low
  result.isabormal = true;
} else if (resultValue > refData.panichigh) {
  result.flag = "HH"; // Critically High
  result.iscritical = true;
} else if (resultValue > refData.referencemax) {
  result.flag = "H"; // High
  result.isabormal = true;
} else {
  result.flag = "normal";
}
```

## Data Categories

### Hematology
- CBC Components (HGB, WBC, PLT, HCT, RBC, ESR, RETIC)
- Coagulation (PT, INR, APTT, BT, CT)
- Blood Smear (BLAST, SICKLE, PARA, MALARIA, MICROF)
- Anemia Workup (FERR, IRON, B12, FOLATE)

### Biochemistry
- Electrolytes (NA, K, CA, CL, HCO3)
- Renal Function (CREAT, UREA, EGFR)
- Liver Function (ALT, AST, ALP, GGT, BILI, ALB, LDH)
- Glucose & Lipids (GLU, FPG, OGTT, HBA1C, TRIG, HDL, LDL)

### Immunology
- Infection/Viral (HBSAG, ANTI-HCV, HIV, COVID-PCR, VDRL)
- Autoimmune (ANA, DSDNA, ANCA, CRP)
- TORCH (TOXO, RUBELLA, CMV, HERPES)
- Tumor Markers (CEA, CA125, CA199)

### Microbiology
- Cultures (BACT, CSF-CULT, UTI)
- Organism Detection (PARA-ST, C-DIFF, TB-PCR)

### Histopathology
- Tissue Analysis (BIOPSY, FNAC, PAP, CYTO)
- Molecular (FISH, SEQ)

### Endocrinology
- Thyroid Function (TSH)

## Maintenance

### Adding New Tests

1. Use the admin interface to add new test references
2. Ensure test codes are unique and uppercase
3. Provide complete reference data for all applicable age groups and sexes

### Updating Reference Ranges

Reference ranges may need updates based on:
- New clinical guidelines
- Laboratory method changes
- Population-specific data
- Quality control findings

### Audit Trail

All changes are tracked with:
- `createdby` / `createdat`: Initial creation
- `updatedby` / `updatedat`: Last modification
- `isactive`: Soft delete status

## Troubleshooting

### Issue: Reference ranges not appearing in results entry

**Solution:**
1. Verify test codes match exactly (case-sensitive)
2. Check that ranges are marked as active (`isactive = 'Y'`)
3. Ensure workspace ID matches
4. Verify age group and sex filters are correct

### Issue: Panic values not triggering alerts

**Solution:**
1. Check that panic values are properly set in the reference data
2. Verify the flagging logic in the results entry component
3. Ensure numeric values are being compared correctly

### Issue: Seed script fails

**Solution:**
1. Verify database connection
2. Check that WORKSPACE_ID and CREATED_BY are valid UUIDs
3. Ensure the table exists (run migration first)
4. Check for duplicate entries if re-running

## Future Enhancements

- [ ] Import/Export functionality for bulk updates
- [ ] Version history for reference range changes
- [ ] Multi-language support for test names
- [ ] Pediatric age sub-groups (infant, child, adolescent)
- [ ] Pregnancy-specific reference ranges
- [ ] Method-specific reference ranges
- [ ] Automatic range selection based on patient demographics
- [ ] Reference range validation rules
- [ ] Bulk edit functionality
- [ ] Audit log viewer

## Support

For issues or questions:
1. Check this documentation
2. Review the API endpoint responses
3. Check browser console for errors
4. Verify database schema matches expected structure

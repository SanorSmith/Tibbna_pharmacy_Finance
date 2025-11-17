# Prescription Form Documentation

## Overview
The prescription form implements the openEHR Medication Order archetype, providing a standardized way to create medication orders that comply with international healthcare interoperability standards.

## openEHR Compliance

### Archetype Reference
- **Archetype**: openEHR-EHR-INSTRUCTION.medication_order.v3
- **Standard**: openEHR Release 1.0.2
- **Reference**: https://ckm.openehr.org/ckm/archetypes/1013.1.3124

### Core Elements Implemented

| Form Field | openEHR Element | Required | Description |
|------------|----------------|----------|-------------|
| Medication Name | Medication item | Yes | Name of the medication or active ingredient |
| Dose Amount | Dose amount | Yes | Numeric value of the dose |
| Dose Unit | Dose unit | Yes | Unit of measurement (mg, g, tablet, etc.) |
| Route | Route | Yes | Administration route (Oral, IV, IM, etc.) |
| Frequency | Timing - daily | Yes | How often to administer (e.g., "Three times daily") |
| Duration | Direction duration | No | How long to continue (e.g., "7 days") |
| PRN | As required | No | Whether medication is given as needed |
| PRN Criterion | As required criterion | No | Condition for PRN administration |
| Instructions | Additional instruction | No | Additional instructions for administration |
| Clinical Indication | Clinical indication | No | Reason for prescribing |

## Form Structure

### Essential Fields Section
The form presents only the most critical fields needed for a prescription:

```
┌─────────────────────────────────────┐
│ Medication Name *                   │
│ [Text Input]                        │
│ openEHR: Medication item            │
├─────────────────────────────────────┤
│ Dose Amount * │ Unit * │ Route *    │
│ [Input]       │ [Select]│ [Select]  │
├─────────────────────────────────────┤
│ Frequency *   │ Duration            │
│ [Input]       │ [Input]             │
│ openEHR: Timing - daily             │
├─────────────────────────────────────┤
│ ☐ As Required (PRN)                 │
│   [PRN Criterion if checked]        │
├─────────────────────────────────────┤
│ Instructions                        │
│ [Textarea]                          │
│ openEHR: Additional instruction     │
├─────────────────────────────────────┤
│ Clinical Indication                 │
│ [Input]                             │
│ openEHR: Clinical indication        │
└─────────────────────────────────────┘
```

## Data Model

### Frontend State (TypeScript)
```typescript
interface PrescriptionForm {
  // Medication Item
  medicationItem: string;
  medicationItemCode?: string;
  medicationItemTerminology?: string;
  
  // Dose Direction
  doseAmount: string;
  doseUnit: string;
  doseFormula?: string;
  
  // Route
  route: string;
  routeCode?: string;
  
  // Site (optional)
  bodySite?: string;
  bodySiteCode?: string;
  
  // Administration
  administrationMethod?: string;
  administrationMethodCode?: string;
  
  // Timing
  timingDirections: string;
  frequency?: string;
  interval?: string;
  asRequired: boolean;
  asRequiredCriterion?: string;
  directionDuration?: string;
  
  // Safety
  medicationSafety?: string;
  maximumDoseAmount?: string;
  maximumDoseUnit?: string;
  maximumDosePeriod?: string;
  
  // Instructions
  additionalInstruction?: string;
  patientInstruction?: string;
  
  // Clinical Indication
  clinicalIndication?: string;
  clinicalIndicationCode?: string;
  clinicalIndicationTerminology?: string;
  
  // Order Details
  orderType?: string;
  comment?: string;
}
```

### Backend Storage (API)
```typescript
interface PrescriptionRecord {
  composition_uid: string;
  recorded_time: string;
  
  // Medication Item
  medication_item: string;
  medication_item_code?: string;
  medication_item_terminology?: string;
  
  // Order Type
  order_type?: string;
  
  // Dose Direction
  dose_amount?: string;
  dose_unit?: string;
  dose_formula?: string;
  
  // Route
  route: string;
  route_code?: string;
  
  // Site
  body_site?: string;
  body_site_code?: string;
  
  // Administration Method
  administration_method?: string;
  administration_method_code?: string;
  
  // Timing
  timing_directions: string;
  frequency?: string;
  interval?: string;
  as_required?: boolean;
  as_required_criterion?: string;
  direction_duration?: string;
  
  // Medication Safety
  medication_safety?: string;
  maximum_dose_amount?: string;
  maximum_dose_unit?: string;
  maximum_dose_period?: string;
  
  // Instructions
  additional_instruction?: string;
  patient_instruction?: string;
  
  // Clinical Indication
  clinical_indication?: string;
  clinical_indication_code?: string;
  clinical_indication_terminology?: string;
  
  // Overall Description
  comment?: string;
  
  // Metadata
  prescribed_by: string;
  status: string;
}
```

## Terminology Support

### Medication Coding
The system supports multiple medication terminologies:
- **SNOMED CT**: International standard for clinical terms
- **RxNorm**: US-specific medication terminology
- **dm+d**: UK Dictionary of Medicines and Devices
- **AMT**: Australian Medicines Terminology

### Clinical Indication Coding
- **ICD-10**: International Classification of Diseases
- **SNOMED CT**: Clinical terms for diagnoses

### Route Coding
- **SNOMED CT**: Standardized route codes (e.g., 26643006 for Oral route)

## API Endpoints

### GET /api/d/[workspaceid]/patients/[patientid]/prescriptions
Retrieve all prescriptions for a patient.

**Authorization**: Doctor role required

**Response**:
```json
{
  "prescriptions": [
    {
      "composition_uid": "prescription-1234567890-abc123",
      "recorded_time": "2025-11-17T11:30:00.000Z",
      "medication_item": "Amoxicillin",
      "dose_amount": "500",
      "dose_unit": "mg",
      "route": "Oral",
      "timing_directions": "Three times daily",
      "direction_duration": "7 days",
      "additional_instruction": "Take with food",
      "clinical_indication": "Bacterial infection",
      "prescribed_by": "Dr. Smith",
      "status": "active"
    }
  ]
}
```

### POST /api/d/[workspaceid]/patients/[patientid]/prescriptions
Create a new prescription.

**Authorization**: Doctor role required

**Request Body**:
```json
{
  "prescription": {
    "medicationItem": "Amoxicillin",
    "doseAmount": "500",
    "doseUnit": "mg",
    "route": "Oral",
    "timingDirections": "Three times daily",
    "directionDuration": "7 days",
    "additionalInstruction": "Take with food",
    "clinicalIndication": "Bacterial infection"
  }
}
```

**Response**:
```json
{
  "message": "Prescription created successfully",
  "prescription": { /* PrescriptionRecord */ }
}
```

## Validation Rules

### Required Fields
1. **Medication Name**: Must not be empty
2. **Dose Amount**: Must not be empty
3. **Dose Unit**: Must be selected from dropdown
4. **Route**: Must be selected from dropdown
5. **Frequency**: Must not be empty (timing_directions)

### Optional Fields
- All other fields are optional but recommended for complete clinical documentation

### PRN Logic
- If "As Required (PRN)" is checked, the PRN Criterion field becomes visible
- PRN medications should have clear criteria for administration

## User Interface

### Form Layout
- **Width**: max-w-2xl (672px)
- **Spacing**: space-y-4 between sections
- **Input Style**: Consistent border, rounded corners, adequate padding
- **Labels**: Clear, bold, with openEHR references where applicable

### Accessibility
- All inputs have associated labels
- Required fields marked with asterisk (*)
- Placeholder text provides examples
- Helper text explains openEHR mappings

### Responsive Design
- Grid layouts adjust for smaller screens
- 3-column grid (Dose/Unit/Route) collapses on mobile
- 2-column grid (Frequency/Duration) stacks on mobile

## Integration with EHRbase

### Future Enhancement
When integrated with EHRbase (openEHR Clinical Data Repository):

1. **Composition Creation**: Each prescription creates an openEHR Composition
2. **Template Binding**: Uses the Medication Order template
3. **Terminology Binding**: Codes are validated against terminology servers
4. **Versioning**: All changes are versioned in EHRbase
5. **Querying**: AQL (Archetype Query Language) can retrieve prescriptions

### Example AQL Query
```sql
SELECT
    c/uid/value as composition_uid,
    i/activities[at0001]/description[at0002]/items[at0070]/value/value as medication_item,
    i/activities[at0001]/description[at0002]/items[at0091]/items[at0144]/value/magnitude as dose_amount,
    i/activities[at0001]/description[at0002]/items[at0091]/items[at0144]/value/units as dose_unit
FROM EHR e
CONTAINS COMPOSITION c
CONTAINS INSTRUCTION i[openEHR-EHR-INSTRUCTION.medication_order.v3]
WHERE e/ehr_id/value = $ehr_id
```

## Testing

### Manual Testing Checklist
- [ ] Create prescription with all required fields
- [ ] Create prescription with optional fields
- [ ] Create PRN prescription
- [ ] Verify prescription appears in list
- [ ] Verify dose amount and unit display correctly
- [ ] Test form validation (empty required fields)
- [ ] Test form reset on cancel
- [ ] Test form reset after successful save

### Test Data Examples

**Example 1: Simple Oral Medication**
```
Medication: Metformin
Dose: 500 mg
Route: Oral
Frequency: Twice daily
Duration: Ongoing
Indication: Type 2 Diabetes
```

**Example 2: PRN Medication**
```
Medication: Paracetamol
Dose: 500 mg
Route: Oral
Frequency: Every 4-6 hours
PRN: Yes
PRN Criterion: for pain or fever
Duration: As needed
```

**Example 3: Injectable Medication**
```
Medication: Insulin Aspart
Dose: 10 units
Route: Subcutaneous
Frequency: Before meals
Duration: Ongoing
Indication: Type 1 Diabetes
```

## Troubleshooting

### Common Issues

**Issue**: 403 Forbidden when accessing prescriptions
- **Cause**: User doesn't have doctor role or workspace access
- **Solution**: Verify user role and workspace membership

**Issue**: Prescription not appearing in list
- **Cause**: API call failed or data not refreshed
- **Solution**: Check browser console, verify loadPrescriptions() is called

**Issue**: Dose not displaying correctly
- **Cause**: Old data using `dosage` field instead of `dose_amount` + `dose_unit`
- **Solution**: Clear old data or migrate to new structure

## Future Enhancements

### Phase 1: Terminology Integration
- [ ] SNOMED CT browser integration
- [ ] ICD-10 code lookup
- [ ] RxNorm medication search
- [ ] Auto-complete for medication names

### Phase 2: Clinical Decision Support
- [ ] Drug interaction checking
- [ ] Allergy alerts
- [ ] Dosage range validation
- [ ] Duplicate therapy detection

### Phase 3: Advanced Features
- [ ] Prescription templates
- [ ] Favorite medications
- [ ] Prescription history review
- [ ] Electronic signature
- [ ] Print prescription

### Phase 4: EHRbase Integration
- [ ] Connect to EHRbase instance
- [ ] Create openEHR Compositions
- [ ] Query with AQL
- [ ] Version management
- [ ] Audit trail

## References

1. **openEHR Specifications**: https://specifications.openehr.org/
2. **Medication Order Archetype**: https://ckm.openehr.org/ckm/archetypes/1013.1.3124
3. **SNOMED CT**: https://www.snomed.org/
4. **ICD-10**: https://www.who.int/standards/classifications/classification-of-diseases
5. **RxNorm**: https://www.nlm.nih.gov/research/umls/rxnorm/
6. **EHRbase**: https://ehrbase.org/

## Change Log

### Version 1.0.0 (2025-11-17)
- Initial implementation of openEHR-compliant prescription form
- Support for essential medication order fields
- API endpoints for GET and POST operations
- Simplified UI focusing on core fields
- Full data model with optional terminology support

## Support

For questions or issues related to the prescription form:
1. Check this documentation
2. Review openEHR specifications
3. Consult the development team
4. Refer to EHRbase documentation for integration questions

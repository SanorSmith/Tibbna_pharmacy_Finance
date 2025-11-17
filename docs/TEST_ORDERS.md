# Laboratory Test Orders Documentation

## Overview
The laboratory test orders feature allows healthcare providers to order diagnostic tests for patients. The system supports various laboratory types and test configurations, following clinical workflow patterns.

## Features

### Core Functionality
- **Create Test Orders**: Order individual tests or test packages
- **Multiple Lab Types**: Support for different laboratory departments
- **Priority Management**: Routine, Urgent, and STAT orders
- **Status Tracking**: Monitor order progress from pending to completed
- **Clinical Context**: Include clinical indication and special instructions

### Supported Laboratory Types
1. **Clinic Chemistry**: Biochemical tests (glucose, electrolytes, liver function, etc.)
2. **Haematology**: Blood cell counts and coagulation studies
3. **Microbiology**: Culture and sensitivity tests
4. **Immunology**: Antibody and antigen tests
5. **X-Ray**: Radiological imaging orders

## User Interface

### Test Orders Tab
Located in the patient dashboard under the "Test Orders" tab.

**Components**:
- Test order list with status indicators
- "+ New Test Order" button to create orders
- Order details display with expandable information

### Order List Display

Each test order shows:
- **Test Name/Package**: What was ordered
- **Lab Type**: Which laboratory department
- **Status Badge**: Current order status (color-coded)
- **Ordered By**: Healthcare provider who created the order
- **Order Date**: When the order was placed
- **Priority**: Fasting status (Routine/Urgent)
- **Order Type**: Processing priority (Routine/Urgent/STAT)
- **Clinical Indication**: Reason for the test (if provided)
- **Specimen Request**: Required specimen type (if specified)
- **Comment**: Additional notes (if provided)

### Status Indicators

| Status | Badge Color | Description |
|--------|-------------|-------------|
| Pending | Blue | Order created, awaiting processing |
| In Progress | Yellow | Specimen collected, test in progress |
| Completed | Green | Results available |
| Cancelled | Gray | Order cancelled |

## Creating a Test Order

### Required Fields
1. **Lab Type**: Select the appropriate laboratory department
2. **Test Selection**: Choose between Test Name or Test Package
3. **Test Name OR Test Package**: Enter the specific test or package
4. **Fasting Status**: Select Routine or Urgent
5. **Order Type**: Select Routine, Urgent, or STAT

### Optional Fields
- **Specimen Request**: Specify required specimen (e.g., "Blood sample", "Urine sample")
- **Clinical Indication**: Provide reason for ordering the test
- **Billing Guidance**: Add billing-related information
- **Comment**: Include any additional notes or instructions

### Form Workflow

1. Click "+ New Test Order" button
2. Select **Lab Type** from dropdown
3. Choose **Test Select** option:
   - **Test Name**: For individual tests
   - **Test Package**: For test panels/packages
4. Enter the test name or package name
5. Set **Fasting Status** (Routine/Urgent)
6. Set **Order Type** (Routine/Urgent/STAT)
7. Fill optional fields as needed
8. Click "Create Test Order"

### Form Validation

The form validates:
- Lab Type must be selected
- Either Test Name or Test Package must be filled (based on selection)
- All required fields must have values before submission

## Data Model

### TypeScript Interface

```typescript
interface TestOrderRecord {
  composition_uid: string;        // Unique identifier
  recorded_time: string;          // ISO timestamp
  lab_type: string;               // Laboratory department
  test_select: string;            // "test_name" or "test_package"
  test_name?: string;             // Individual test name
  test_package?: string;          // Test package/panel name
  fasting_status: string;         // "Routine" or "Urgent"
  order_type: string;             // "Routine", "Urgent", or "STAT"
  specimen_request?: string;      // Required specimen type
  clinical_indication?: string;   // Reason for test
  billing_guidance?: string;      // Billing information
  comment?: string;               // Additional notes
  ordered_by: string;             // Provider name/email
  status: string;                 // Order status
}
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `composition_uid` | string | Unique order identifier | `test-order-1731847200000-abc123` |
| `recorded_time` | string | ISO 8601 timestamp | `2025-11-17T12:00:00.000Z` |
| `lab_type` | string | Laboratory department | `Haematology` |
| `test_select` | string | Selection type | `test_name` or `test_package` |
| `test_name` | string? | Individual test | `Complete Blood Count` |
| `test_package` | string? | Test panel | `Lipid Panel` |
| `fasting_status` | string | Priority level | `Routine` or `Urgent` |
| `order_type` | string | Processing priority | `Routine`, `Urgent`, `STAT` |
| `specimen_request` | string? | Specimen type | `Blood sample - EDTA tube` |
| `clinical_indication` | string? | Test reason | `Suspected anemia` |
| `billing_guidance` | string? | Billing info | `Insurance code: 85025` |
| `comment` | string? | Additional notes | `Patient is on anticoagulants` |
| `ordered_by` | string | Provider | `Dr. John Smith` |
| `status` | string | Current status | `pending`, `in-progress`, `completed`, `cancelled` |

## API Endpoints

### GET `/api/d/[workspaceid]/patients/[patientid]/test-orders`

Retrieve all test orders for a patient.

**Authorization**: Doctor or Nurse role required

**Response**:
```json
{
  "testOrders": [
    {
      "composition_uid": "test-order-1731847200000-abc123",
      "recorded_time": "2025-11-17T12:00:00.000Z",
      "lab_type": "Haematology",
      "test_select": "test_name",
      "test_name": "Complete Blood Count",
      "fasting_status": "Routine",
      "order_type": "Routine",
      "specimen_request": "Blood sample - EDTA tube",
      "clinical_indication": "Routine checkup",
      "ordered_by": "Dr. Smith",
      "status": "pending"
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User doesn't have required role or workspace access
- `500 Internal Server Error`: Server error

---

### POST `/api/d/[workspaceid]/patients/[patientid]/test-orders`

Create a new test order.

**Authorization**: Doctor role required

**Request Body**:
```json
{
  "testOrder": {
    "labType": "Haematology",
    "testSelect": "test_name",
    "testName": "Complete Blood Count",
    "fastingStatus": "Routine",
    "orderType": "Routine",
    "specimenRequest": "Blood sample - EDTA tube",
    "clinicalIndication": "Routine checkup",
    "billingGuidance": "",
    "comment": ""
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Test order created successfully",
  "record": {
    "composition_uid": "test-order-1731847200000-abc123",
    "recorded_time": "2025-11-17T12:00:00.000Z",
    "lab_type": "Haematology",
    "test_select": "test_name",
    "test_name": "Complete Blood Count",
    "fasting_status": "Routine",
    "order_type": "Routine",
    "specimen_request": "Blood sample - EDTA tube",
    "clinical_indication": "Routine checkup",
    "ordered_by": "Dr. Smith",
    "status": "pending"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: User not authenticated
- `403 Forbidden`: User is not a doctor or lacks workspace access
- `500 Internal Server Error`: Server error

## Common Test Examples

### Haematology Tests
- Complete Blood Count (CBC)
- Differential Count
- Platelet Count
- Prothrombin Time (PT)
- Activated Partial Thromboplastin Time (aPTT)
- International Normalized Ratio (INR)

### Clinic Chemistry Tests
- Basic Metabolic Panel (BMP)
- Comprehensive Metabolic Panel (CMP)
- Lipid Panel
- Liver Function Tests (LFTs)
- Renal Function Tests
- HbA1c (Glycated Hemoglobin)
- Glucose (Fasting/Random)
- Electrolytes

### Microbiology Tests
- Blood Culture
- Urine Culture
- Throat Swab Culture
- Wound Culture
- Stool Culture
- Sensitivity Testing

### Immunology Tests
- Thyroid Function Tests (TSH, T3, T4)
- Vitamin D
- Vitamin B12
- Ferritin
- C-Reactive Protein (CRP)
- Rheumatoid Factor
- Antinuclear Antibody (ANA)

### X-Ray Orders
- Chest X-Ray
- Abdominal X-Ray
- Skeletal X-Ray
- Joint X-Ray

## Test Packages/Panels

Common test packages that include multiple tests:

### Lipid Panel
- Total Cholesterol
- HDL Cholesterol
- LDL Cholesterol
- Triglycerides
- VLDL Cholesterol

### Basic Metabolic Panel (BMP)
- Glucose
- Calcium
- Sodium
- Potassium
- CO2
- Chloride
- BUN
- Creatinine

### Liver Function Tests (LFTs)
- ALT (Alanine Aminotransferase)
- AST (Aspartate Aminotransferase)
- ALP (Alkaline Phosphatase)
- Bilirubin (Total and Direct)
- Albumin
- Total Protein

## Workflow Integration

### Typical Order Workflow

1. **Order Creation**
   - Doctor reviews patient
   - Identifies need for diagnostic test
   - Creates test order with clinical indication
   - System generates order with "pending" status

2. **Order Processing**
   - Laboratory receives order
   - Status updated to "in-progress"
   - Specimen collected from patient
   - Test performed

3. **Results**
   - Test completed
   - Status updated to "completed"
   - Results entered into system
   - Doctor reviews results in Lab Results tab

4. **Follow-up**
   - Doctor interprets results
   - Determines next steps
   - May order additional tests if needed

### Status Transitions

```
pending → in-progress → completed
   ↓
cancelled
```

## Authorization & Security

### Role-Based Access Control

| Role | Create Orders | View Orders | Update Status |
|------|---------------|-------------|---------------|
| Doctor | ✓ | ✓ | ✓ |
| Nurse | ✗ | ✓ | ✓ |
| Admin | ✗ | ✓ | ✗ |
| Patient | ✗ | ✗ | ✗ |

### Workspace Access
- Users must be members of the workspace
- Workspace membership is validated on every API call
- Cross-workspace access is prevented

### Audit Trail
- All orders record who created them (`ordered_by`)
- Timestamps are recorded (`recorded_time`)
- Future: Track status changes and modifications

## Testing

### Manual Testing Checklist

**Form Testing**:
- [ ] Create order with test name
- [ ] Create order with test package
- [ ] Verify lab type dropdown shows all options
- [ ] Test radio button toggle (test name ↔ test package)
- [ ] Verify required field validation
- [ ] Test optional fields (specimen, indication, billing, comment)
- [ ] Verify form reset on cancel
- [ ] Verify form reset after successful submission

**Display Testing**:
- [ ] Verify orders appear in list after creation
- [ ] Check status badge colors
- [ ] Verify all order details display correctly
- [ ] Test with no orders (empty state)
- [ ] Test loading state

**Authorization Testing**:
- [ ] Verify doctor can create orders
- [ ] Verify nurse cannot create orders (403 error)
- [ ] Verify both doctor and nurse can view orders
- [ ] Verify workspace access validation

### Test Data Examples

**Example 1: Routine CBC**
```json
{
  "labType": "Haematology",
  "testSelect": "test_name",
  "testName": "Complete Blood Count",
  "fastingStatus": "Routine",
  "orderType": "Routine",
  "specimenRequest": "Blood sample - EDTA tube",
  "clinicalIndication": "Annual physical examination"
}
```

**Example 2: Urgent Lipid Panel**
```json
{
  "labType": "Clinic chemistry",
  "testSelect": "test_package",
  "testPackage": "Lipid Panel",
  "fastingStatus": "Urgent",
  "orderType": "Urgent",
  "specimenRequest": "Fasting blood sample",
  "clinicalIndication": "Suspected hyperlipidemia",
  "comment": "Patient fasting for 12 hours"
}
```

**Example 3: STAT Blood Culture**
```json
{
  "labType": "Microbiology",
  "testSelect": "test_name",
  "testName": "Blood Culture",
  "fastingStatus": "Urgent",
  "orderType": "STAT",
  "specimenRequest": "Blood sample - aerobic and anaerobic bottles",
  "clinicalIndication": "Suspected sepsis - fever 39.5°C",
  "comment": "Patient on broad-spectrum antibiotics"
}
```

## Troubleshooting

### Common Issues

**Issue**: Test order not appearing in list
- **Cause**: API call failed or data not refreshed
- **Solution**: Check browser console for errors, verify `loadTestOrders()` is called after creation

**Issue**: 403 Forbidden when creating order
- **Cause**: User doesn't have doctor role
- **Solution**: Verify user role in workspace membership

**Issue**: Form validation fails
- **Cause**: Required fields not filled
- **Solution**: Ensure Lab Type and either Test Name or Test Package is filled

**Issue**: Cannot select test name/package
- **Cause**: Radio button not working
- **Solution**: Verify testSelect state is updating correctly

## Future Enhancements

### Phase 1: Enhanced Functionality
- [ ] Status update capability (pending → in-progress → completed)
- [ ] Order cancellation with reason
- [ ] Order modification/amendment
- [ ] Duplicate order detection

### Phase 2: Integration
- [ ] Link orders to lab results
- [ ] Automatic result notification
- [ ] Integration with laboratory information system (LIS)
- [ ] Electronic specimen tracking

### Phase 3: Clinical Decision Support
- [ ] Test recommendation based on diagnosis
- [ ] Duplicate test warnings
- [ ] Cost information display
- [ ] Insurance coverage checking

### Phase 4: Advanced Features
- [ ] Recurring test orders
- [ ] Order sets/protocols
- [ ] Batch ordering
- [ ] Print requisition forms
- [ ] Barcode generation for specimens
- [ ] Mobile specimen collection app

### Phase 5: Analytics
- [ ] Order volume statistics
- [ ] Turnaround time tracking
- [ ] Cost analysis
- [ ] Provider ordering patterns
- [ ] Most common tests dashboard

## Database Schema (Future)

When migrating from in-memory to database storage:

```sql
CREATE TABLE test_orders (
  id SERIAL PRIMARY KEY,
  composition_uid VARCHAR(255) UNIQUE NOT NULL,
  patient_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  recorded_time TIMESTAMP NOT NULL,
  lab_type VARCHAR(100) NOT NULL,
  test_select VARCHAR(50) NOT NULL,
  test_name VARCHAR(255),
  test_package VARCHAR(255),
  fasting_status VARCHAR(50) NOT NULL,
  order_type VARCHAR(50) NOT NULL,
  specimen_request TEXT,
  clinical_indication TEXT,
  billing_guidance TEXT,
  comment TEXT,
  ordered_by VARCHAR(255) NOT NULL,
  ordered_by_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (patient_id) REFERENCES patients(patientid),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(workspaceid),
  FOREIGN KEY (ordered_by_id) REFERENCES users(userid)
);

CREATE INDEX idx_test_orders_patient ON test_orders(patient_id);
CREATE INDEX idx_test_orders_workspace ON test_orders(workspace_id);
CREATE INDEX idx_test_orders_status ON test_orders(status);
CREATE INDEX idx_test_orders_recorded_time ON test_orders(recorded_time DESC);
```

## Best Practices

### For Developers
1. **Always validate input**: Check required fields before API calls
2. **Handle errors gracefully**: Provide clear error messages to users
3. **Maintain consistency**: Follow the same patterns as vital signs and prescriptions
4. **Log appropriately**: Use console.log for debugging, proper logging in production
5. **Test authorization**: Verify role-based access control works correctly

### For Healthcare Providers
1. **Provide clinical indication**: Always include reason for test
2. **Specify specimen requirements**: Help laboratory prepare correctly
3. **Use appropriate priority**: Reserve STAT for true emergencies
4. **Add relevant comments**: Include patient-specific considerations
5. **Review before submitting**: Double-check test selection and patient

### For System Administrators
1. **Monitor order volume**: Track system usage and performance
2. **Regular backups**: Ensure test order data is backed up
3. **Audit access**: Review who is creating and viewing orders
4. **Update test catalogs**: Keep test names and packages current
5. **Train users**: Ensure staff understand the system

## Support & Resources

### Documentation
- This document: Complete test orders feature documentation
- API documentation: See API Endpoints section above
- User guide: See User Interface section above

### Related Features
- **Lab Results**: View completed test results
- **Vital Signs**: Record patient vital signs
- **Prescriptions**: Manage medication orders

### Contact
For technical support or questions:
1. Check this documentation
2. Review the code comments
3. Consult the development team
4. Refer to related feature documentation

## Change Log

### Version 1.0.0 (2025-11-17)
- Initial implementation of test orders feature
- Support for 5 laboratory types
- Test name and test package selection
- Priority and order type management
- Clinical indication and specimen request fields
- Role-based authorization
- In-memory storage for development

## Appendix

### Laboratory Type Descriptions

**Clinic Chemistry**
- Analyzes chemical components in blood and body fluids
- Tests for metabolic disorders, organ function, drug levels
- Common tests: glucose, electrolytes, enzymes, hormones

**Haematology**
- Studies blood cells and coagulation
- Diagnoses blood disorders, anemia, clotting problems
- Common tests: CBC, differential, PT/INR, platelets

**Microbiology**
- Identifies infectious organisms
- Culture and sensitivity testing
- Common tests: blood culture, urine culture, wound swab

**Immunology**
- Studies immune system function
- Antibody and antigen testing
- Common tests: thyroid function, autoimmune markers, allergen testing

**X-Ray**
- Radiological imaging
- Visualizes bones, organs, tissues
- Common orders: chest X-ray, skeletal imaging, abdominal films

### Glossary

- **STAT**: Immediate priority, results needed urgently
- **Fasting**: Patient should not eat/drink before test
- **Specimen**: Sample collected for testing (blood, urine, etc.)
- **Panel**: Group of related tests ordered together
- **Requisition**: Official order form for laboratory test
- **Turnaround Time**: Time from order to result availability
- **LIS**: Laboratory Information System
- **EDTA**: Anticoagulant used in blood collection tubes

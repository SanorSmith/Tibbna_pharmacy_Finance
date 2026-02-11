# LIMS (Laboratory Information Management System) - Comprehensive Workflow Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Workflows](#core-workflows)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Module Breakdown](#module-breakdown)
5. [Data Flow Architecture](#data-flow-architecture)
6. [Integration Points](#integration-points)
7. [Quality Control & Validation](#quality-control--validation)
8. [Reporting & Analytics](#reporting--analytics)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Best Practices](#best-practices)

---

## System Overview

The LIMS module is a comprehensive laboratory information management system that handles the complete lifecycle of laboratory testing from order entry to result reporting. It integrates with OpenEHR for patient data management and provides end-to-end tracking of samples, tests, and results.

### Key Features
- **Multi-laboratory support** with different departments (Hematology, Biochemistry, Microbiology, etc.)
- **Test catalog management** with configurable test packages and individual tests
- **Sample tracking** from collection to disposal
- **Quality control** and validation workflows
- **Automated result calculations** and reference range checking
- **Comprehensive reporting** and audit trails

---

## Core Workflows

### 1. Test Order Entry Workflow

#### Patient Ordering (Clinical Side)
```
Patient Dashboard → Enhanced Orders Tab → Order Laboratory Tests
```

**Steps:**
1. **Select Laboratory** - Choose department (Hematology, Biochemistry, etc.)
2. **Select Test Groups** - Choose packages or individual tests
   - Search functionality for test groups and individual tests
   - Multi-select capability with Select All/Deselect All
3. **Review Tests** - Verify selected tests and customize if needed
4. **Clinical Information** - Add indication, urgency, and notes
5. **Submit Order** - Creates order in both LIMS and OpenEHR

#### Direct LIMS Order Entry
```
Lab Tech Dashboard → Orders Tab → New Order
```

**Features:**
- Bulk order entry
- Template-based ordering
- Standing orders management

### 2. Sample Collection Workflow

#### Sample Accessioning
```
Orders → Sample Collection → Accession Samples → Generate Barcodes
```

**Process:**
1. **Order Selection** - View pending orders
2. **Sample Details** - Verify sample type, container, volume
3. **Barcode Generation** - Unique sample identification
4. **Collection Status** - Update order status to "COLLECTED"

#### Sample Storage Management
```
Sample Storage → Location Management → Storage Assignment
```

### 3. Laboratory Testing Workflow

#### Worklist Management
```
Worklist → Sample Processing → Test Assignment → Result Entry
```

**Stages:**
1. **Sample Reception** - Verify sample integrity
2. **Test Allocation** - Assign to appropriate analyzers/technicians
3. **Quality Control** - Run QC samples
4. **Result Entry** - Input test results
5. **Validation** - Technical and medical validation
6. **Release** - Make results available to clinicians

#### Validation Chain
```
Draft → Technical Validation → Medical Validation → Release
```

- **Technical Validation**: Verify analytical quality
- **Medical Validation**: Clinical relevance check
- **Final Release**: Results available for reporting

### 4. Result Reporting Workflow

#### Result Distribution
```
Validated Results → Report Generation → Clinician Notification
```

**Channels:**
- Patient dashboard integration
- Email notifications
- PDF report generation
- API integration with EHR systems

---

## User Roles & Permissions

### 1. Laboratory Technician
- **Permissions**: Sample accessioning, result entry, basic validation
- **Access**: Worklist, sample processing, QC management
- **Limitations**: Cannot release results without validation

### 2. Lab Manager/Supervisor
- **Permissions**: Full workflow control, user management, QC oversight
- **Access**: All modules, configuration settings, reports
- **Responsibilities**: Quality assurance, staff training, inventory

### 3. Medical Technologist
- **Permissions**: Advanced validation, complex test interpretation
- **Access**: Validation modules, reference range management
- **Specializations**: Department-specific expertise

### 4. Pathologist/Medical Director
- **Permissions**: Final medical validation, policy setting
- **Access**: All modules, administrative functions
- **Responsibilities**: Clinical governance, result interpretation

---

## Module Breakdown

### 1. Order Entry Module
**Location**: `/app/d/[workspaceid]/lab-tech/components/OrdersTab.tsx`

**Features:**
- Multi-step order form with search functionality
- Test catalog integration
- OpenEHR synchronization
- Sample requirement recommendations

**Key Components:**
- `EnhancedLabOrderFormMultiple` - Main order form
- Test catalog management
- Sample type recommendations

### 2. Sample Accessioning Module
**Location**: `/app/d/[workspaceid]/lab-tech/components/SampleAccessioning.tsx`

**Features:**
- Barcode generation
- Sample tracking
- Storage location assignment
- Collection status updates

### 3. Validation Module
**Location**: `/app/d/[workspaceid]/lab-tech/validation/[sampleid]/page.tsx`

**Features:**
- Multi-stage validation chain
- QC integration
- Automated reference range checking
- Comment and annotation support

**Validation Stages:**
1. **Draft** - Initial result entry
2. **Technical Validation** - Analytical quality check
3. **Medical Validation** - Clinical relevance
4. **Release** - Final approval

### 4. Worklist Management
**Location**: `/app/d/[workspaceid]/lab-tech/components/WorklistTab.tsx`

**Features:**
- Dynamic worklist generation
- Priority sorting
- Status tracking
- Bulk operations

### 5. Quality Control Module
**Location**: `/app/d/[workspaceid]/lab-tech/components/QCTab.tsx`

**Features:**
- QC sample management
- Levy-Jennings charts
- Westgard rules implementation
- Trend analysis

---

## Data Flow Architecture

### Order Flow
```
Patient Order → OpenEHR Composition → LIMS Order → Sample Collection → Testing → Results → Validation → Report
```

### Data Synchronization
- **OpenEHR Integration**: Bidirectional sync for patient data and orders
- **Test Catalog**: Centralized test definitions
- **Reference Ranges**: Dynamic range management
- **Audit Trail**: Complete activity logging

### Database Schema
**Key Tables:**
- `orders` - Test orders and status
- `samples` - Sample tracking and storage
- `test_results` - Individual test results
- `quality_control` - QC data and trends
- `users` - User roles and permissions

---

## Integration Points

### 1. OpenEHR Integration
**Location**: `/lib/openehr/openehr.ts`

**Features:**
- Patient data retrieval
- Order composition creation
- Result reporting back to EHR
- Status synchronization

**Key Functions:**
- `getOpenEHRTestOrders()` - Retrieve orders from OpenEHR
- `createTestOrderComposition()` - Create new orders
- `updateTestResult()` - Report results back

### 2. Test Catalog Integration
**Location**: `/lib/lims/test-recommendations.ts`

**Features:**
- Test definitions and requirements
- Sample type recommendations
- Container specifications
- Reference range management

### 3. External Lab Integration
**API Endpoints:**
- `/api/lims/orders/external` - External lab orders
- `/api/lims/results/import` - Result import
- `/api/lims/interface/[lab-id]` - Lab-specific interfaces

---

## Quality Control & Validation

### QC Workflow
1. **Daily QC** - Run control samples at start of shift
2. **Trend Monitoring** - Track QC performance over time
3. **Westgard Rules** - Automated rule violation detection
4. **Corrective Actions** - Document and track interventions

### Validation Rules
- **Reference Range Checking** - Automatic flagging of abnormal results
- **Delta Checks** - Compare with previous results
- **Critical Values** - Immediate notification for critical results
- **Validation Comments** - Required for out-of-range results

### Audit Trail
- Complete logging of all user actions
- Result modification tracking
- Validation chain documentation
- Compliance reporting

---

## Reporting & Analytics

### Standard Reports
- **Daily Worklist** - Current pending tests
- **Test Volumes** - Departmental statistics
- **Turnaround Times** - Performance metrics
- **QC Summaries** - Quality performance

### Management Reports
- **Revenue Analysis** - Test profitability
- **Resource Utilization** - Equipment and staff efficiency
- **Trend Analysis** - Long-term performance indicators
- **Compliance Reports** - Regulatory requirements

### Custom Reports
- Ad-hoc query builder
- Scheduled report generation
- Export capabilities (PDF, Excel, CSV)
- Dashboard integration

---

## Troubleshooting Guide

### Common Issues

#### 1. Order Not Appearing in Worklist
**Causes:**
- Sample not accessioned
- Incorrect status in OpenEHR
- Synchronization delay

**Solutions:**
- Verify sample collection status
- Check OpenEHR composition
- Refresh worklist or restart sync

#### 2. Validation Chain Stuck
**Causes:**
- Missing required fields
- QC failures
- User permission issues

**Solutions:**
- Complete required validations
- Address QC failures
- Verify user permissions

#### 3. Reference Range Errors
**Causes:**
- Missing age/sex parameters
- Incorrect reference data
- Calculation errors

**Solutions:**
- Update patient demographics
- Verify reference range tables
- Check calculation formulas

### Performance Issues
- **Slow Worklist Loading**: Optimize database queries
- **Memory Issues**: Clear cache, restart services
- **Sync Failures**: Check network connectivity

---

## Best Practices

### 1. Order Management
- Always verify patient identification before ordering
- Use standardized test panels when possible
- Include complete clinical information
- Verify sample requirements before collection

### 2. Sample Handling
- Follow proper collection protocols
- Ensure correct sample type and container
- Label samples immediately after collection
- Store samples at recommended temperatures

### 3. Quality Assurance
- Run QC samples at recommended frequency
- Document all deviations and corrective actions
- Participate in external quality assessment
- Regular equipment maintenance and calibration

### 4. Result Validation
- Review all results before release
- Verify critical value notifications
- Add clinical comments when appropriate
- Follow validation chain requirements

### 5. System Maintenance
- Regular database backups
- Software updates and patches
- User training and competency assessment
- Documentation updates

---

## Configuration & Customization

### Test Catalog Management
```typescript
// Adding new tests
const newTest = {
  id: "test-id",
  name: "Test Name",
  code: "TEST001",
  category: "Biochemistry",
  sampleType: "Serum",
  container: "Red Top",
  volume: 5,
  referenceRanges: {
    adult: { min: 0, max: 100 },
    pediatric: { min: 0, max: 80 }
  }
};
```

### Validation Rules
```typescript
// Custom validation logic
const validateResult = (result, test, patient) => {
  // Reference range check
  if (result < test.reference.min || result > test.reference.max) {
    return { valid: false, flag: "ABNORMAL" };
  }
  
  // Delta check
  const previousResult = getPreviousResult(test.id, patient.id);
  if (Math.abs(result - previousResult) > test.deltaThreshold) {
    return { valid: false, flag: "DELTA_CHECK" };
  }
  
  return { valid: true };
};
```

### Workflow Customization
- Modify validation chain steps
- Add custom notification rules
- Configure department-specific workflows
- Create specialized report templates

---

## Security & Compliance

### Data Protection
- HIPAA compliance measures
- Patient data encryption
- Access control mechanisms
- Audit trail maintenance

### Regulatory Compliance
- CLIA requirements
- ISO 15189 standards
- CAP accreditation requirements
- Local regulatory adherence

### User Access Management
- Role-based permissions
- Two-factor authentication
- Session management
- Password policies

---

## Future Enhancements

### Planned Features
- **Mobile Application** - Phlebotomy and point-of-care
- **AI Integration** - Automated result interpretation
- **Instrument Interface** - Direct analyzer connectivity
- **Telepathology** - Remote consultation capabilities

### Scalability Improvements
- Cloud deployment options
- Load balancing optimization
- Database performance tuning
- Caching strategies

---

## Support & Documentation

### Technical Support
- System administrator contact
- Vendor support information
- Emergency procedures
- Disaster recovery plan

### Training Resources
- User manuals
- Video tutorials
- Competency assessments
- Continuing education materials

### Documentation Maintenance
- Regular review schedule
- Version control
- Change management process
- User feedback incorporation

---

## Quick Reference

### Common Keyboard Shortcuts
- `Ctrl+N` - New order
- `Ctrl+S` - Save/Submit
- `F5` - Refresh worklist
- `Ctrl+P` - Print report

### Important URLs
- LIMS Dashboard: `/d/[workspaceid]/lab-tech`
- Orders: `/d/[workspaceid]/lab-tech#orders`
- Worklist: `/d/[workspaceid]/lab-tech#worklist`
- Validation: `/d/[workspaceid]/lab-tech/validation/[sampleid]`

### Contact Information
- Lab Manager: [Contact Details]
- IT Support: [Contact Details]
- System Administrator: [Contact Details]

---

*This document is maintained by the LIMS development team and updated regularly to reflect system changes and user feedback.*

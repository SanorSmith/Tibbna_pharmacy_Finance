# Sample Accessioning (Registration) Module - LIMS

## Overview

The Sample Accessioning module provides comprehensive laboratory sample registration capabilities with full traceability, barcode/QR code generation, and openEHR integration.

## Architecture

### Data Separation

**LIMS Database (Operational Data)**
- Sample registration and tracking
- Status and location management
- Workflow state
- Barcode/QR code data
- Audit trail

**openEHR (Clinical Record)**
- Specimen composition
- Collection context
- Clinical observations
- Long-term archival

## Database Schema

### Tables

#### 1. `accession_samples`
Primary table for registered samples.

**Key Fields:**
- `sampleid` (UUID) - Primary identifier
- `samplenumber` (TEXT) - Human-readable ID (e.g., SMP-2025-0001)
- `sampletype` - Type of specimen (blood, urine, tissue, etc.)
- `containertype` - Container used for collection
- `volume` / `volumeunit` - Specimen volume
- `collectiondate` - When sample was collected
- `collectorid` / `collectorname` - Who collected the sample
- `orderid` - Reference to lab order
- `patientid` / `ehrid` - Patient/subject reference
- `barcode` / `qrcode` - Generated identifiers
- `currentstatus` - Current sample status (RECEIVED, IN_STORAGE, etc.)
- `currentlocation` - Physical location in lab
- `accessionedby` - User who registered the sample
- `openehrcompositionuid` - Link to openEHR composition

**Immutability:**
- Core accessioning data is immutable after creation
- Corrections tracked via `correctedat`, `correctedby`, `correctionreason`

#### 2. `sample_status_history`
Tracks all status and location changes.

**Key Fields:**
- `sampleid` - Reference to sample
- `previousstatus` / `newstatus` - Status transition
- `previouslocation` / `newlocation` - Location change
- `changedby` - User who made the change
- `changedat` - Timestamp
- `changereason` - Reason for change

#### 3. `sample_accession_audit_log`
Complete audit trail for compliance.

**Key Fields:**
- `sampleid` - Reference to sample
- `action` - Action performed (SAMPLE_ACCESSIONED, STATUS_CHANGED, etc.)
- `userid` / `userrole` - Who performed the action
- `previousdata` / `newdata` - JSON snapshots
- `reason` - Reason for action
- `metadata` - Additional context

## Sample ID Generation

### Format
`SMP-YYYY-XXXX`

**Example:** `SMP-2025-0001`

### Algorithm
1. Get current year
2. Query last sample number for the year
3. Increment sequence number
4. Pad to 4 digits
5. Combine: `SMP-{year}-{padded_number}`

## Barcode & QR Code

### Barcode
- Uses sample UUID
- Formatted for Code 128 standard
- Printable for label attachment

### QR Code Payload
JSON structure containing:
```json
{
  "sampleId": "uuid",
  "sampleNumber": "SMP-2025-0001",
  "collectionDate": "ISO 8601 timestamp",
  "sampleType": "blood",
  "url": "https://app.com/d/{workspace}/lab-tech/samples/{sampleId}",
  "timestamp": "ISO 8601 timestamp"
}
```

## openEHR Integration

### Composition Structure

**Template:** `openEHR-EHR-COMPOSITION.sample.v1`

```json
{
  "_type": "COMPOSITION",
  "name": {
    "_type": "DV_TEXT",
    "value": "Laboratory Sample Registration"
  },
  "archetype_details": {
    "archetype_id": {
      "value": "openEHR-EHR-COMPOSITION.sample.v1"
    }
  },
  "language": {
    "terminology_id": {
      "value": "ISO_639-1"
    },
    "code_string": "en"
  },
  "territory": {
    "terminology_id": {
      "value": "ISO_3166-1"
    },
    "code_string": "US"
  },
  "category": {
    "value": "event",
    "defining_code": {
      "terminology_id": {
        "value": "openehr"
      },
      "code_string": "433"
    }
  },
  "composer": {
    "_type": "PARTY_IDENTIFIED",
    "name": "Lab Technician Name"
  },
  "context": {
    "_type": "EVENT_CONTEXT",
    "start_time": {
      "_type": "DV_DATE_TIME",
      "value": "2025-12-31T00:00:00Z"
    },
    "setting": {
      "value": "laboratory",
      "defining_code": {
        "terminology_id": {
          "value": "openehr"
        },
        "code_string": "234"
      }
    }
  },
  "content": [
    {
      "_type": "OBSERVATION",
      "name": {
        "_type": "DV_TEXT",
        "value": "Specimen"
      },
      "archetype_details": {
        "archetype_id": {
          "value": "openEHR-EHR-CLUSTER.specimen.v1"
        }
      },
      "data": {
        "_type": "HISTORY",
        "events": [
          {
            "_type": "POINT_EVENT",
            "time": {
              "_type": "DV_DATE_TIME",
              "value": "2025-12-31T00:00:00Z"
            },
            "data": {
              "_type": "ITEM_TREE",
              "items": [
                {
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Specimen ID"
                  },
                  "value": {
                    "_type": "DV_IDENTIFIER",
                    "id": "SMP-2025-0001",
                    "type": "Sample Number"
                  }
                },
                {
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Specimen type"
                  },
                  "value": {
                    "_type": "DV_CODED_TEXT",
                    "value": "Blood",
                    "defining_code": {
                      "terminology_id": {
                        "value": "SNOMED-CT"
                      },
                      "code_string": "119297000"
                    }
                  }
                },
                {
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Collection date/time"
                  },
                  "value": {
                    "_type": "DV_DATE_TIME",
                    "value": "2025-12-31T08:30:00Z"
                  }
                },
                {
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Container type"
                  },
                  "value": {
                    "_type": "DV_TEXT",
                    "value": "Vacutainer (EDTA)"
                  }
                },
                {
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Volume"
                  },
                  "value": {
                    "_type": "DV_QUANTITY",
                    "magnitude": 5.0,
                    "units": "mL"
                  }
                },
                {
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Collector"
                  },
                  "value": {
                    "_type": "DV_TEXT",
                    "value": "Collector Name"
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

### Integration Flow

1. **Sample Accessioned in LIMS**
   - Create record in `accession_samples`
   - Generate sample number, barcode, QR code
   - Create initial status history
   - Create audit log entry

2. **Create openEHR Composition** (Asynchronous)
   - Build composition JSON from sample data
   - POST to openEHR REST API: `/ehr/{ehrId}/composition`
   - Receive composition UID
   - Update `openehrcompositionuid` in LIMS

3. **Link Maintained**
   - LIMS stores composition UID
   - openEHR composition references LIMS sample number
   - Bidirectional traceability

## API Endpoints

### POST /api/lims/accession
Register a new sample.

**Request Body:**
```json
{
  "sampleType": "blood",
  "containerType": "vacutainer_edta",
  "volume": "5",
  "volumeUnit": "mL",
  "collectionDate": "2025-12-31T08:30:00Z",
  "collectorName": "John Doe",
  "orderId": "ORD-2025-001",
  "patientId": "PAT-001",
  "ehrId": "ehr-uuid",
  "workspaceId": "workspace-uuid",
  "currentLocation": "Accessioning Desk"
}
```

**Response:**
```json
{
  "success": true,
  "sample": {
    "sampleId": "uuid",
    "sampleNumber": "SMP-2025-0001",
    "barcode": "BARCODE123",
    "qrcode": "{json-payload}",
    "status": "RECEIVED",
    "accessionedAt": "2025-12-31T09:00:00Z"
  }
}
```

### GET /api/lims/accession
List accessioned samples.

**Query Parameters:**
- `workspaceid` (required)
- `status` (optional)
- `limit` (default: 50)
- `offset` (default: 0)

## Validation Rules

### Required Fields
- Sample type
- Container type
- Collection date
- Order ID
- Patient ID or EHR ID (at least one)

### Business Rules
1. Collection date cannot be in the future
2. Collection date warning if > 30 days ago
3. Volume must be > 0 if specified
4. Volume unit required if volume specified
5. Sample number must be unique
6. Barcode must be unique

## Sample Status Workflow

```
RECEIVED → IN_STORAGE → IN_PROCESS → ANALYZED → DISPOSED
                ↓
            REJECTED
```

**Status Descriptions:**
- `RECEIVED` - Sample registered and received
- `IN_STORAGE` - Stored in appropriate conditions
- `IN_PROCESS` - Being processed/analyzed
- `ANALYZED` - Analysis complete
- `DISPOSED` - Properly disposed per protocol
- `REJECTED` - Rejected (e.g., insufficient volume, contamination)

## UI Components

### AccessioningTab
Main interface for sample registration.

**Features:**
- Sample registration form
- List of accessioned samples
- Statistics dashboard
- Barcode/QR code printing
- Search and filter capabilities

**Form Sections:**
1. Sample Information (type, container, volume)
2. Collection Information (date, time, collector)
3. Order & Patient Information (order ID, patient ID, EHR ID)
4. Location (current location in lab)
5. Notes (additional observations)

## Audit Trail

Every action is logged with:
- User ID and role
- Timestamp
- Action type
- Before/after data snapshots
- Reason for change
- IP address and session ID

**Audit Actions:**
- `SAMPLE_ACCESSIONED` - Initial registration
- `STATUS_CHANGED` - Status transition
- `LOCATION_CHANGED` - Physical location change
- `CORRECTED` - Data correction
- `BARCODE_PRINTED` - Barcode label printed
- `QR_SCANNED` - QR code scanned

## Security & Compliance

### Immutability
- Core accessioning data cannot be modified
- Corrections tracked separately with full audit trail
- Original data preserved

### Access Control
- Role-based access (Lab Technician, Lab Manager, etc.)
- Workspace isolation (multi-tenancy)
- User authentication required

### Traceability
- Complete chain of custody
- All status changes tracked
- All user actions logged
- Timestamps for all events

## Future Enhancements

1. **Barcode Scanning**
   - Mobile app for barcode scanning
   - Integration with barcode printers
   - Batch scanning capabilities

2. **Sample Tracking**
   - Real-time location tracking
   - Temperature monitoring
   - Chain of custody reports

3. **Integration**
   - HL7 FHIR support
   - LIS system integration
   - Automated analyzer integration

4. **Analytics**
   - Sample turnaround time
   - Rejection rate analysis
   - Collector performance metrics

## Technical Notes

### Database Indexes
- Workspace ID (for multi-tenancy)
- Status (for filtering)
- Order ID (for lookups)
- Patient ID (for patient history)
- Barcode (for scanning)

### Performance Considerations
- Sample number generation uses database sequence
- Indexes on frequently queried fields
- Pagination for large result sets
- Async openEHR composition creation

### Error Handling
- Validation errors returned with field-level details
- Database constraint violations handled gracefully
- openEHR integration failures logged and retried
- User-friendly error messages

## Testing Checklist

- [ ] Sample registration with all fields
- [ ] Sample registration with minimal fields
- [ ] Duplicate sample number prevention
- [ ] Duplicate barcode prevention
- [ ] Collection date validation (future date)
- [ ] Collection date warning (old date)
- [ ] Volume validation
- [ ] Patient/EHR ID requirement
- [ ] Status history tracking
- [ ] Audit log creation
- [ ] Barcode generation
- [ ] QR code generation
- [ ] Sample listing and filtering
- [ ] openEHR composition creation
- [ ] Multi-workspace isolation
- [ ] User authentication
- [ ] Role-based access control

# openEHR Production Deployment Guide

## Overview

This document provides a comprehensive guide for migrating the current in-memory implementation to a production-ready openEHR-compliant EHRbase deployment. It covers architecture changes, data model enhancements, integration requirements, and best practices.

---

## Table of Contents

1. [Current State vs. Production Requirements](#current-state-vs-production-requirements)
2. [EHRbase Architecture](#ehrbase-architecture)
3. [Data Model Enhancements](#data-model-enhancements)
4. [Archetype Implementation](#archetype-implementation)
5. [Composition Structure](#composition-structure)
6. [Terminology Integration](#terminology-integration)
7. [API Integration](#api-integration)
8. [Migration Strategy](#migration-strategy)
9. [Security & Compliance](#security--compliance)
10. [Testing & Validation](#testing--validation)

---

## Current State vs. Production Requirements

### Current Implementation

**Strengths**:
- ✅ Follows openEHR archetype principles
- ✅ Uses proper data structures
- ✅ Includes composition UIDs and timestamps
- ✅ Supports terminology codes (SNOMED CT, ICD-10, LOINC)
- ✅ Role-based authorization
- ✅ In-memory storage for development

**Limitations**:
- ❌ No actual EHRbase integration
- ❌ Missing full composition wrapping
- ❌ Incomplete archetype metadata
- ❌ No archetype validation
- ❌ Limited terminology binding
- ❌ No audit trail persistence
- ❌ No versioning support

### Production Requirements

**Must Have**:
1. EHRbase server integration
2. Full openEHR composition structure
3. Archetype validation
4. Complete terminology binding
5. Persistent storage
6. Audit trail
7. Version control
8. Security compliance (HIPAA, GDPR)

---

## EHRbase Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│                  Patient Dashboard UI                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API Layer (Next.js API)                 │
│  - Authentication & Authorization                            │
│  - Business Logic                                            │
│  - Data Transformation                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ openEHR REST API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    EHRbase Server                            │
│  - Composition Management                                    │
│  - Archetype Validation                                      │
│  - Query Engine (AQL)                                        │
│  - Version Control                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                             │
│  - EHR Records                                               │
│  - Compositions                                              │
│  - Audit Trail                                               │
└─────────────────────────────────────────────────────────────┘
```

### EHRbase Setup

**Installation Options**:

1. **Docker Deployment** (Recommended for Development)
```bash
docker-compose up -d
```

2. **Kubernetes Deployment** (Recommended for Production)
```yaml
# See deployment/kubernetes/ehrbase-deployment.yaml
```

3. **Manual Installation**
- Java 11+
- PostgreSQL 12+
- EHRbase WAR file

**Configuration**:
```yaml
# application.yml
ehrbase:
  server:
    port: 8080
  db:
    url: jdbc:postgresql://localhost:5432/ehrbase
    username: ehrbase
    password: ${DB_PASSWORD}
  security:
    authType: BASIC
    oauth2:
      enabled: true
```

---

## Data Model Enhancements

### 1. Prescriptions

**Current Structure**:
```typescript
interface PrescriptionRecord {
  composition_uid: string;
  recorded_time: string;
  medication_item: string;
  // ... other fields
}
```

**Production Structure**:
```typescript
interface PrescriptionComposition {
  // Composition metadata
  _type: "COMPOSITION";
  name: {
    _type: "DV_TEXT";
    value: "Medication Order";
  };
  archetype_node_id: "openEHR-EHR-COMPOSITION.medication_order.v1";
  archetype_details: {
    archetype_id: {
      value: "openEHR-EHR-COMPOSITION.medication_order.v1";
    };
    template_id: {
      value: "Medication Order Template";
    };
    rm_version: "1.0.4";
  };
  
  // Composition context
  context: {
    start_time: {
      _type: "DV_DATE_TIME";
      value: "2024-11-17T10:00:00Z";
    };
    setting: {
      _type: "DV_CODED_TEXT";
      value: "primary medical care";
      defining_code: {
        terminology_id: "openehr";
        code_string: "228";
      };
    };
  };
  
  // Content - Medication instruction
  content: [{
    _type: "INSTRUCTION";
    name: {
      _type: "DV_TEXT";
      value: "Medication instruction";
    };
    archetype_node_id: "openEHR-EHR-INSTRUCTION.medication_order.v3";
    
    // Activities
    activities: [{
      _type: "ACTIVITY";
      name: {
        _type: "DV_TEXT";
        value: "Order";
      };
      description: {
        _type: "ITEM_TREE";
        items: [
          {
            _type: "ELEMENT";
            name: {
              _type: "DV_TEXT";
              value: "Medication item";
            };
            value: {
              _type: "DV_CODED_TEXT";
              value: "Metformin 500mg tablet";
              defining_code: {
                terminology_id: "SNOMED-CT";
                code_string: "109081006";
              };
            };
          },
          {
            _type: "CLUSTER";
            name: {
              _type: "DV_TEXT";
              value: "Dose direction";
            };
            items: [
              {
                _type: "ELEMENT";
                name: {
                  _type: "DV_TEXT";
                  value: "Dose amount";
                };
                value: {
                  _type: "DV_QUANTITY";
                  magnitude: 500;
                  units: "mg";
                };
              }
            ];
          }
          // ... more elements
        ];
      };
    }];
  }];
  
  // Composer
  composer: {
    _type: "PARTY_IDENTIFIED";
    name: "Dr. Sarah Mitchell";
    external_ref: {
      id: {
        _type: "GENERIC_ID";
        value: "doctor-12345";
        scheme: "HOSPITAL_ID";
      };
      namespace: "HOSPITAL";
      type: "PERSON";
    };
  };
}
```

### 2. Lab Results

**Production Structure with Full Archetype**:
```typescript
interface LabResultComposition {
  _type: "COMPOSITION";
  name: {
    _type: "DV_TEXT";
    value: "Laboratory Test Result";
  };
  archetype_node_id: "openEHR-EHR-COMPOSITION.report-result.v1";
  
  content: [{
    _type: "OBSERVATION";
    name: {
      _type: "DV_TEXT";
      value: "Laboratory test result";
    };
    archetype_node_id: "openEHR-EHR-OBSERVATION.laboratory_test_result.v1";
    
    data: {
      _type: "HISTORY";
      origin: {
        _type: "DV_DATE_TIME";
        value: "2024-11-17T08:00:00Z";
      };
      events: [{
        _type: "POINT_EVENT";
        time: {
          _type: "DV_DATE_TIME";
          value: "2024-11-17T08:00:00Z";
        };
        data: {
          _type: "ITEM_TREE";
          items: [
            {
              _type: "ELEMENT";
              name: {
                _type: "DV_TEXT";
                value: "Test name";
              };
              value: {
                _type: "DV_CODED_TEXT";
                value: "Complete Blood Count";
                defining_code: {
                  terminology_id: "LOINC";
                  code_string: "58410-2";
                };
              };
            },
            {
              _type: "CLUSTER";
              name: {
                _type: "DV_TEXT";
                value: "Laboratory analyte result";
              };
              archetype_node_id: "openEHR-EHR-CLUSTER.laboratory_test_analyte.v1";
              items: [
                {
                  _type: "ELEMENT";
                  name: {
                    _type: "DV_TEXT";
                    value: "Analyte name";
                  };
                  value: {
                    _type: "DV_CODED_TEXT";
                    value: "Hemoglobin";
                    defining_code: {
                      terminology_id: "LOINC";
                      code_string: "718-7";
                    };
                  };
                },
                {
                  _type: "ELEMENT";
                  name: {
                    _type: "DV_TEXT";
                    value: "Analyte result";
                  };
                  value: {
                    _type: "DV_QUANTITY";
                    magnitude: 14.5;
                    units: "g/dL";
                  };
                },
                {
                  _type: "ELEMENT";
                  name: {
                    _type: "DV_TEXT";
                    value: "Reference range";
                  };
                  value: {
                    _type: "DV_INTERVAL<DV_QUANTITY>";
                    lower: {
                      magnitude: 13.0;
                      units: "g/dL";
                    };
                    upper: {
                      magnitude: 17.0;
                      units: "g/dL";
                    };
                  };
                }
              ];
            }
          ];
        };
      }];
    };
    
    protocol: {
      _type: "ITEM_TREE";
      items: [{
        _type: "CLUSTER";
        name: {
          _type: "DV_TEXT";
          value: "Test request details";
        };
        items: [
          {
            _type: "ELEMENT";
            name: {
              _type: "DV_TEXT";
              value: "Requester";
            };
            value: {
              _type: "DV_TEXT";
              value: "Dr. James Rodriguez";
            };
          }
        ];
      }];
    };
  }];
}
```

---

## Archetype Implementation

### Required Archetypes

Download and register these archetypes in EHRbase:

1. **Prescriptions**:
   - `openEHR-EHR-COMPOSITION.medication_order.v1`
   - `openEHR-EHR-INSTRUCTION.medication_order.v3`
   - `openEHR-EHR-CLUSTER.dosage.v2`

2. **Lab Results**:
   - `openEHR-EHR-COMPOSITION.report-result.v1`
   - `openEHR-EHR-OBSERVATION.laboratory_test_result.v1`
   - `openEHR-EHR-CLUSTER.laboratory_test_analyte.v1`
   - `openEHR-EHR-CLUSTER.specimen.v1`

3. **Imaging**:
   - `openEHR-EHR-INSTRUCTION.imaging_exam_request.v1`
   - `openEHR-EHR-OBSERVATION.imaging_exam_result.v1`
   - `openEHR-EHR-CLUSTER.imaging_finding.v1`

4. **Medical History**:
   - `openEHR-EHR-EVALUATION.problem_diagnosis.v1`
   - `openEHR-EHR-OBSERVATION.story.v1`

5. **Care Plans**:
   - `openEHR-EHR-INSTRUCTION.care_plan.v1`
   - `openEHR-EHR-ACTION.care_plan.v1`

6. **Vital Signs**:
   - `openEHR-EHR-OBSERVATION.blood_pressure.v2`
   - `openEHR-EHR-OBSERVATION.pulse.v2`
   - `openEHR-EHR-OBSERVATION.body_temperature.v2`

### Archetype Registration

```bash
# Upload archetypes to EHRbase
curl -X POST "http://ehrbase-server:8080/ehrbase/rest/openehr/v1/definition/archetype" \
  -H "Content-Type: application/xml" \
  -d @archetypes/openEHR-EHR-INSTRUCTION.medication_order.v3.xml
```

### Template Creation

Create operational templates (OPT) for each clinical data type:

```xml
<!-- medication_order_template.opt -->
<template xmlns="http://schemas.openehr.org/v1">
  <template_id>
    <value>Medication Order Template</value>
  </template_id>
  <concept>Medication Order</concept>
  <definition>
    <rm_type_name>COMPOSITION</rm_type_name>
    <archetype_id>openEHR-EHR-COMPOSITION.medication_order.v1</archetype_id>
    <!-- ... template definition -->
  </definition>
</template>
```

---

## Composition Structure

### EHR Creation

Before storing compositions, create an EHR for each patient:

```typescript
async function createEHR(patientId: string) {
  const response = await fetch(`${EHRBASE_URL}/rest/openehr/v1/ehr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      _type: 'EHR_STATUS',
      subject: {
        external_ref: {
          id: {
            _type: 'GENERIC_ID',
            value: patientId,
            scheme: 'HOSPITAL_ID'
          },
          namespace: 'HOSPITAL',
          type: 'PERSON'
        }
      },
      is_modifiable: true,
      is_queryable: true
    })
  });
  
  const data = await response.json();
  return data.ehr_id.value; // Store this EHR ID
}
```

### Composition Submission

```typescript
async function submitComposition(
  ehrId: string,
  composition: any,
  templateId: string
) {
  const response = await fetch(
    `${EHRBASE_URL}/rest/openehr/v1/ehr/${ehrId}/composition`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'openEHR-TEMPLATE_ID': templateId,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(composition)
    }
  );
  
  return await response.json();
}
```

---

## Terminology Integration

### Terminology Services

Integrate with terminology servers:

1. **SNOMED CT Browser**:
   - URL: `https://browser.ihtsdotools.org/`
   - API: SNOMED CT API

2. **LOINC**:
   - URL: `https://loinc.org/`
   - API: FHIR Terminology Service

3. **ICD-10**:
   - WHO ICD API

### Terminology Binding

```typescript
interface TerminologyService {
  async searchConcepts(
    terminology: 'SNOMED-CT' | 'LOINC' | 'ICD-10',
    searchTerm: string
  ): Promise<Concept[]>;
  
  async validateCode(
    terminology: string,
    code: string
  ): Promise<boolean>;
  
  async getConceptDetails(
    terminology: string,
    code: string
  ): Promise<ConceptDetails>;
}

// Example usage
const concepts = await terminologyService.searchConcepts(
  'SNOMED-CT',
  'diabetes'
);
// Returns: [
//   { code: '73211009', display: 'Diabetes mellitus' },
//   { code: '44054006', display: 'Type 2 diabetes mellitus' },
//   ...
// ]
```

### Value Sets

Define value sets for common fields:

```json
{
  "valueSet": {
    "id": "medication-routes",
    "name": "Medication Routes",
    "status": "active",
    "compose": {
      "include": [{
        "system": "http://snomed.info/sct",
        "concept": [
          { "code": "26643006", "display": "Oral route" },
          { "code": "47625008", "display": "Intravenous route" },
          { "code": "78421000", "display": "Intramuscular route" }
        ]
      }]
    }
  }
}
```

---

## API Integration

### EHRbase REST API Endpoints

**Base URL**: `http://ehrbase-server:8080/ehrbase/rest/openehr/v1`

#### 1. EHR Management
```typescript
// Create EHR
POST /ehr

// Get EHR
GET /ehr/{ehr_id}

// Get EHR by subject ID
GET /ehr?subject_id={subject_id}&subject_namespace={namespace}
```

#### 2. Composition Management
```typescript
// Create composition
POST /ehr/{ehr_id}/composition

// Get composition
GET /ehr/{ehr_id}/composition/{version_uid}

// Update composition
PUT /ehr/{ehr_id}/composition/{preceding_version_uid}

// Delete composition
DELETE /ehr/{ehr_id}/composition/{preceding_version_uid}
```

#### 3. Query (AQL)
```typescript
// Execute AQL query
POST /query/aql
Body: {
  "q": "SELECT c FROM COMPOSITION c WHERE c/name/value = 'Medication Order'"
}
```

### Integration Layer

Create an abstraction layer:

```typescript
// lib/ehrbase/client.ts
export class EHRbaseClient {
  private baseUrl: string;
  private token: string;
  
  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }
  
  async createEHR(patientId: string): Promise<string> {
    // Implementation
  }
  
  async submitPrescription(
    ehrId: string,
    prescription: PrescriptionData
  ): Promise<CompositionResponse> {
    const composition = this.transformToComposition(prescription);
    return await this.submitComposition(
      ehrId,
      composition,
      'Medication Order Template'
    );
  }
  
  async queryPrescriptions(
    ehrId: string
  ): Promise<PrescriptionData[]> {
    const aql = `
      SELECT
        c/uid/value as composition_id,
        c/content[openEHR-EHR-INSTRUCTION.medication_order.v3]/activities[at0001]/description[at0002]/items[at0070]/value/value as medication_name
      FROM COMPOSITION c
      WHERE c/archetype_details/template_id/value = 'Medication Order Template'
        AND c/ehr_id/value = '${ehrId}'
    `;
    
    const results = await this.executeAQL(aql);
    return this.transformFromAQL(results);
  }
  
  private transformToComposition(data: any): Composition {
    // Transform application data to openEHR composition
  }
  
  private transformFromAQL(results: any): any[] {
    // Transform AQL results to application data
  }
}
```

---

## Migration Strategy

### Phase 1: Preparation (Weeks 1-2)

1. **Setup EHRbase**:
   - Install EHRbase server
   - Configure PostgreSQL
   - Setup authentication

2. **Register Archetypes**:
   - Download required archetypes
   - Create operational templates
   - Upload to EHRbase

3. **Create Integration Layer**:
   - Build EHRbase client
   - Implement data transformers
   - Create abstraction layer

### Phase 2: Parallel Running (Weeks 3-6)

1. **Dual Write**:
   - Write to both in-memory and EHRbase
   - Compare results
   - Log discrepancies

2. **Testing**:
   - Unit tests for transformers
   - Integration tests for EHRbase
   - Performance testing

3. **Monitoring**:
   - Track success rates
   - Monitor response times
   - Identify issues

### Phase 3: Migration (Weeks 7-8)

1. **Data Migration**:
   - Export existing data
   - Transform to compositions
   - Import to EHRbase

2. **Validation**:
   - Verify all data migrated
   - Check data integrity
   - Validate queries

3. **Cutover**:
   - Switch reads to EHRbase
   - Disable in-memory storage
   - Monitor production

### Phase 4: Optimization (Weeks 9-12)

1. **Performance Tuning**:
   - Optimize AQL queries
   - Add caching layer
   - Implement connection pooling

2. **Feature Enhancement**:
   - Add versioning UI
   - Implement audit trail viewer
   - Add advanced search

---

## Security & Compliance

### Authentication & Authorization

```typescript
// Implement OAuth2 with EHRbase
const ehrbaseAuth = {
  tokenEndpoint: 'https://auth-server/oauth/token',
  clientId: process.env.EHRBASE_CLIENT_ID,
  clientSecret: process.env.EHRBASE_CLIENT_SECRET,
  scope: 'openehr:read openehr:write'
};

async function getEHRbaseToken(): Promise<string> {
  const response = await fetch(ehrbaseAuth.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ehrbaseAuth.clientId,
      client_secret: ehrbaseAuth.clientSecret,
      scope: ehrbaseAuth.scope
    })
  });
  
  const data = await response.json();
  return data.access_token;
}
```

### Audit Trail

All operations are automatically audited by EHRbase:

```typescript
// Query audit trail
const auditAQL = `
  SELECT
    a/time_committed/value as timestamp,
    a/committer/name as user,
    a/change_type/value as action,
    a/description/value as description
  FROM AUDIT_DETAILS a
  WHERE a/system_id = '${ehrId}'
  ORDER BY a/time_committed/value DESC
`;
```

### GDPR Compliance

```typescript
// Right to be forgotten
async function deletePatientData(ehrId: string) {
  // Mark EHR as deleted (soft delete)
  await ehrbaseClient.updateEHRStatus(ehrId, {
    is_queryable: false,
    is_modifiable: false
  });
  
  // Or hard delete (if legally required)
  await ehrbaseClient.deleteEHR(ehrId);
}

// Data export (right to data portability)
async function exportPatientData(ehrId: string): Promise<Bundle> {
  const compositions = await ehrbaseClient.getAllCompositions(ehrId);
  return {
    type: 'collection',
    entry: compositions.map(c => ({
      resource: c,
      fullUrl: `${EHRBASE_URL}/ehr/${ehrId}/composition/${c.uid}`
    }))
  };
}
```

---

## Testing & Validation

### Unit Tests

```typescript
describe('EHRbase Integration', () => {
  it('should create prescription composition', async () => {
    const prescription = {
      medicationItem: 'Metformin 500mg',
      doseAmount: '500',
      doseUnit: 'mg',
      route: 'Oral'
    };
    
    const composition = transformToComposition(prescription);
    
    expect(composition._type).toBe('COMPOSITION');
    expect(composition.archetype_node_id).toBe(
      'openEHR-EHR-COMPOSITION.medication_order.v1'
    );
  });
  
  it('should validate against archetype', async () => {
    const composition = createTestComposition();
    const isValid = await ehrbaseClient.validate(composition);
    expect(isValid).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('EHRbase API', () => {
  let ehrId: string;
  
  beforeAll(async () => {
    ehrId = await ehrbaseClient.createEHR('test-patient-001');
  });
  
  it('should submit and retrieve composition', async () => {
    const prescription = createTestPrescription();
    const submitted = await ehrbaseClient.submitPrescription(
      ehrId,
      prescription
    );
    
    const retrieved = await ehrbaseClient.getComposition(
      ehrId,
      submitted.uid
    );
    
    expect(retrieved).toMatchObject(submitted);
  });
  
  afterAll(async () => {
    await ehrbaseClient.deleteEHR(ehrId);
  });
});
```

### Validation Checklist

- [ ] All archetypes registered
- [ ] All templates created
- [ ] Data transformation correct
- [ ] Terminology codes valid
- [ ] Compositions validate
- [ ] Queries return correct data
- [ ] Performance acceptable
- [ ] Security implemented
- [ ] Audit trail working
- [ ] Backup/restore tested

---

## Performance Considerations

### Caching Strategy

```typescript
// Implement Redis caching
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379
});

async function getCachedComposition(
  ehrId: string,
  compositionId: string
): Promise<Composition | null> {
  const cached = await redis.get(`comp:${ehrId}:${compositionId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const composition = await ehrbaseClient.getComposition(
    ehrId,
    compositionId
  );
  
  await redis.setex(
    `comp:${ehrId}:${compositionId}`,
    3600, // 1 hour TTL
    JSON.stringify(composition)
  );
  
  return composition;
}
```

### Query Optimization

```typescript
// Use indexed fields in AQL
const optimizedAQL = `
  SELECT
    c/uid/value,
    c/content[openEHR-EHR-INSTRUCTION.medication_order.v3]/activities[at0001]/description[at0002]/items[at0070]/value/value
  FROM COMPOSITION c[openEHR-EHR-COMPOSITION.medication_order.v1]
  WHERE c/ehr_id/value = '${ehrId}'
    AND c/context/start_time/value >= '2024-01-01'
  ORDER BY c/context/start_time/value DESC
  LIMIT 50
`;
```

---

## Monitoring & Maintenance

### Health Checks

```typescript
// Monitor EHRbase health
async function checkEHRbaseHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${EHRBASE_URL}/rest/openehr/v1/status`);
    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Metrics

Track key metrics:
- Composition submission rate
- Query response time
- Error rate
- Cache hit rate
- Database size
- Active EHRs

---

## Conclusion

This guide provides a comprehensive roadmap for migrating to production-ready openEHR-compliant EHRbase deployment. Follow the phased approach, implement proper testing, and ensure security compliance throughout the migration process.

For questions or support, refer to:
- EHRbase Documentation: https://ehrbase.readthedocs.io/
- openEHR Specifications: https://specifications.openehr.org/
- Clinical Knowledge Manager: https://ckm.openehr.org/

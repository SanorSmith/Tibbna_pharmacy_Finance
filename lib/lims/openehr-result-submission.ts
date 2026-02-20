/**
 * OpenEHR Result Submission Service
 * 
 * Automatically submits LIMS test results back to OpenEHR when results are released
 * Generates FHIR DiagnosticReport and submits to patient's EHR
 * Supports HL7 ORU message generation for external systems
 */

import { db } from "@/lib/db";
import { accessionSamples, testResults, limsOrders, patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface TestResultData {
  testCode: string;
  testName: string;
  resultValue: string;
  unit: string | null;
  referenceMin: string | null;
  referenceMax: string | null;
  referenceRange: string | null;
  flag: string;
  isAbnormal: boolean;
  isCritical: boolean;
  interpretation: string | null;
  comment: string | null;
  analyzedDate: Date;
  releasedDate: Date | null;
  releasedBy: string | null;
}

interface DiagnosticReportData {
  ehrId: string;
  patientId: string;
  patientName: string;
  sampleId: string;
  sampleNumber: string;
  sampleType: string;
  collectionDate: Date;
  results: TestResultData[];
  overallStatus: "preliminary" | "final" | "corrected" | "cancelled";
  conclusion?: string;
  composerName: string;
  composerId?: string;
}

interface HL7ORUMessage {
  messageType: "ORU^R01";
  messageControlId: string;
  sendingApplication: string;
  sendingFacility: string;
  receivingApplication: string;
  receivingFacility: string;
  timestamp: string;
  patientId: string;
  patientName: string;
  orderNumber: string;
  observations: Array<{
    observationId: string;
    observationCode: string;
    observationName: string;
    value: string;
    units: string;
    referenceRange: string;
    abnormalFlags: string;
    observationDateTime: string;
    observationStatus: string;
  }>;
}

export class OpenEHRResultSubmissionService {
  /**
   * Submit test results to OpenEHR for a specific sample
   */
  static async submitResultsToOpenEHR(params: {
    sampleid: string;
    userid?: string;
    overrideStatus?: "preliminary" | "final" | "corrected";
  }): Promise<{ success: boolean; compositionUid?: string | null; error?: string }> {
    const { sampleid, userid, overrideStatus } = params;

    try {
      // Fetch sample details
      const sample = await db.query.accessionSamples.findFirst({
        where: eq(accessionSamples.sampleid, sampleid),
      });

      if (!sample) {
        return { success: false, error: "Sample not found" };
      }

      // Fetch patient details
      let patient;
      if (sample.patientid) {
        patient = await db.query.patients.findFirst({
          where: eq(patients.patientid, sample.patientid),
        });
      }

      if (!patient) {
        return { success: false, error: "Patient not found for sample" };
      }

      if (!patient.ehrid) {
        return { success: false, error: "Patient does not have an EHR ID" };
      }

      // Fetch test results for this sample
      const results = await db.query.testResults.findMany({
        where: eq(testResults.sampleid, sampleid),
      });

      if (results.length === 0) {
        return { success: false, error: "No test results found for sample" };
      }

      // Prepare diagnostic report data
      const reportData: DiagnosticReportData = {
        ehrId: patient.ehrid,
        patientId: patient.patientid,
        patientName: `${patient.firstname} ${patient.lastname}`,
        sampleId: sample.sampleid,
        sampleNumber: sample.samplenumber,
        sampleType: sample.sampletype,
        collectionDate: sample.collectiondate,
        results: results.map((r) => ({
          testCode: r.testcode,
          testName: r.testname,
          resultValue: r.resultvalue,
          unit: r.unit,
          referenceMin: r.referencemin?.toString() || null,
          referenceMax: r.referencemax?.toString() || null,
          referenceRange: r.referencerange,
          flag: r.flag,
          isAbnormal: r.isabormal,
          isCritical: r.iscritical,
          interpretation: r.interpretation,
          comment: r.comment,
          analyzedDate: r.analyzeddate,
          releasedDate: r.releaseddate,
          releasedBy: r.releasedby,
        })),
        overallStatus: overrideStatus || "final",
        conclusion: this.generateConclusion(results),
        composerName: userid ? "LIMS User" : "LIMS System",
        composerId: userid,
      };

      // Generate FHIR DiagnosticReport
      const fhirReport = this.generateFHIRDiagnosticReport(reportData);

      // Submit to OpenEHR
      const compositionUid = await this.submitToOpenEHRServer(
        reportData.ehrId,
        fhirReport
      );

      // Update sample with composition UID
      if (compositionUid) {
        await db
          .update(accessionSamples)
          .set({
            openehrcompositionuid: compositionUid,
            updatedat: new Date(),
          })
          .where(eq(accessionSamples.sampleid, sampleid));
      }

      return { success: true, compositionUid };
    } catch (error) {
      console.error("[OpenEHR Submission] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate FHIR DiagnosticReport from LIMS data
   */
  private static generateFHIRDiagnosticReport(data: DiagnosticReportData): any {
    const report = {
      resourceType: "DiagnosticReport",
      id: data.sampleId,
      meta: {
        profile: [
          "http://hl7.org/fhir/StructureDefinition/DiagnosticReport",
        ],
      },
      status: data.overallStatus,
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v2-0074",
              code: "LAB",
              display: "Laboratory",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "11502-2",
            display: "Laboratory report",
          },
        ],
        text: `Laboratory Report - ${data.sampleType}`,
      },
      subject: {
        reference: `Patient/${data.patientId}`,
        display: data.patientName,
      },
      effectiveDateTime: data.collectionDate.toISOString(),
      issued: new Date().toISOString(),
      performer: [
        {
          display: data.composerName,
        },
      ],
      specimen: [
        {
          reference: `Specimen/${data.sampleId}`,
          display: `${data.sampleNumber} - ${data.sampleType}`,
        },
      ],
      result: data.results.map((r, index) => ({
        reference: `Observation/${data.sampleId}-${index}`,
        display: r.testName,
      })),
      conclusion: data.conclusion,
      conclusionCode: this.generateConclusionCodes(data.results),
    };

    return report;
  }

  /**
   * Generate FHIR Observations for each test result
   */
  private static generateFHIRObservations(
    data: DiagnosticReportData
  ): any[] {
    return data.results.map((result, index) => ({
      resourceType: "Observation",
      id: `${data.sampleId}-${index}`,
      status: data.overallStatus === "preliminary" ? "preliminary" : "final",
      category: [
        {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "laboratory",
              display: "Laboratory",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: result.testCode,
            display: result.testName,
          },
        ],
        text: result.testName,
      },
      subject: {
        reference: `Patient/${data.patientId}`,
        display: data.patientName,
      },
      effectiveDateTime: result.analyzedDate.toISOString(),
      issued: result.releasedDate?.toISOString() || new Date().toISOString(),
      valueQuantity: result.unit
        ? {
            value: parseFloat(result.resultValue) || undefined,
            unit: result.unit,
            system: "http://unitsofmeasure.org",
            code: result.unit,
          }
        : undefined,
      valueString: !result.unit ? result.resultValue : undefined,
      interpretation: result.isAbnormal
        ? [
            {
              coding: [
                {
                  system:
                    "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                  code: result.isCritical ? "HH" : "H",
                  display: result.isCritical ? "Critical high" : "High",
                },
              ],
            },
          ]
        : undefined,
      referenceRange: result.referenceRange
        ? [
            {
              text: result.referenceRange,
              low: result.referenceMin
                ? {
                    value: parseFloat(result.referenceMin),
                    unit: result.unit || undefined,
                  }
                : undefined,
              high: result.referenceMax
                ? {
                    value: parseFloat(result.referenceMax),
                    unit: result.unit || undefined,
                  }
                : undefined,
            },
          ]
        : undefined,
      note: result.comment
        ? [
            {
              text: result.comment,
            },
          ]
        : undefined,
    }));
  }

  /**
   * Submit FHIR DiagnosticReport to OpenEHR server
   */
  private static async submitToOpenEHRServer(
    ehrId: string,
    fhirReport: any
  ): Promise<string | null> {
    try {
      const openEhrUrl = process.env.OPENEHR_BASE_URL || "http://localhost:8080/ehrbase";
      const username = process.env.OPENEHR_USERNAME || "ehrbase-user";
      const password = process.env.OPENEHR_PASSWORD || "SuperSecretPassword";

      // Create composition from FHIR DiagnosticReport
      const composition = this.convertFHIRToOpenEHRComposition(fhirReport);

      const response = await fetch(
        `${openEhrUrl}/rest/openehr/v1/ehr/${ehrId}/composition`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          },
          body: JSON.stringify(composition),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[OpenEHR] Submission failed:", errorText);
        return null;
      }

      const result = await response.json();
      console.log("[OpenEHR] Successfully submitted composition:", result.uid?.value);
      return result.uid?.value || null;
    } catch (error) {
      console.error("[OpenEHR] Submission error:", error);
      return null;
    }
  }

  /**
   * Convert FHIR DiagnosticReport to OpenEHR Composition
   */
  private static convertFHIRToOpenEHRComposition(fhirReport: any): any {
    // This is a simplified conversion - in production, use proper FHIR to OpenEHR mapping
    return {
      _type: "COMPOSITION",
      name: {
        _type: "DV_TEXT",
        value: "Laboratory Report",
      },
      archetype_details: {
        archetype_id: {
          value: "openEHR-EHR-COMPOSITION.report-result.v1",
        },
        template_id: {
          value: "laboratory_report_v1",
        },
        rm_version: "1.0.4",
      },
      language: {
        _type: "CODE_PHRASE",
        terminology_id: {
          value: "ISO_639-1",
        },
        code_string: "en",
      },
      territory: {
        _type: "CODE_PHRASE",
        terminology_id: {
          value: "ISO_3166-1",
        },
        code_string: "US",
      },
      category: {
        _type: "DV_CODED_TEXT",
        value: "event",
        defining_code: {
          terminology_id: {
            value: "openehr",
          },
          code_string: "433",
        },
      },
      composer: {
        _type: "PARTY_IDENTIFIED",
        name: fhirReport.performer?.[0]?.display || "LIMS System",
      },
      context: {
        start_time: {
          _type: "DV_DATE_TIME",
          value: fhirReport.effectiveDateTime,
        },
        setting: {
          _type: "DV_CODED_TEXT",
          value: "other care",
          defining_code: {
            terminology_id: {
              value: "openehr",
            },
            code_string: "238",
          },
        },
      },
      content: [
        {
          _type: "OBSERVATION",
          name: {
            _type: "DV_TEXT",
            value: "Laboratory test result",
          },
          archetype_node_id: "openEHR-EHR-OBSERVATION.laboratory_test_result.v1",
          data: {
            name: {
              _type: "DV_TEXT",
              value: "Event Series",
            },
            events: [
              {
                _type: "POINT_EVENT",
                name: {
                  _type: "DV_TEXT",
                  value: "Any event",
                },
                time: {
                  _type: "DV_DATE_TIME",
                  value: fhirReport.issued,
                },
                data: {
                  name: {
                    _type: "DV_TEXT",
                    value: "Tree",
                  },
                  items: this.convertFHIRObservationsToOpenEHR(fhirReport),
                },
              },
            ],
          },
        },
      ],
    };
  }

  /**
   * Convert FHIR observations to OpenEHR items
   */
  private static convertFHIRObservationsToOpenEHR(fhirReport: any): any[] {
    const items = [];

    // Add test name
    items.push({
      _type: "ELEMENT",
      name: {
        _type: "DV_TEXT",
        value: "Test name",
      },
      value: {
        _type: "DV_TEXT",
        value: fhirReport.code?.text || "Laboratory Report",
      },
    });

    // Add overall status
    items.push({
      _type: "ELEMENT",
      name: {
        _type: "DV_TEXT",
        value: "Overall test status",
      },
      value: {
        _type: "DV_CODED_TEXT",
        value: fhirReport.status,
        defining_code: {
          terminology_id: {
            value: "local",
          },
          code_string: fhirReport.status,
        },
      },
    });

    // Add conclusion if present
    if (fhirReport.conclusion) {
      items.push({
        _type: "ELEMENT",
        name: {
          _type: "DV_TEXT",
          value: "Conclusion",
        },
        value: {
          _type: "DV_TEXT",
          value: fhirReport.conclusion,
        },
      });
    }

    return items;
  }

  /**
   * Generate HL7 ORU^R01 message for external systems
   */
  static generateHL7ORUMessage(params: {
    sampleid: string;
    sendingApplication?: string;
    sendingFacility?: string;
    receivingApplication?: string;
    receivingFacility?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    return new Promise(async (resolve) => {
      try {
        const { sampleid } = params;

        // Fetch sample and results
        const sample = await db.query.accessionSamples.findFirst({
          where: eq(accessionSamples.sampleid, sampleid),
        });

        if (!sample) {
          return resolve({ success: false, error: "Sample not found" });
        }

        const results = await db.query.testResults.findMany({
          where: eq(testResults.sampleid, sampleid),
        });

        if (results.length === 0) {
          return resolve({ success: false, error: "No results found" });
        }

        // Fetch patient
        let patient;
        if (sample.patientid) {
          patient = await db.query.patients.findFirst({
            where: eq(patients.patientid, sample.patientid),
          });
        }

        if (!patient) {
          return resolve({ success: false, error: "Patient not found" });
        }

        // Generate HL7 message
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d+/, "");
        const messageControlId = `${Date.now()}`;

        const hl7Message = this.buildHL7ORUMessage({
          messageControlId,
          sendingApplication: params.sendingApplication || "LIMS",
          sendingFacility: params.sendingFacility || "LAB",
          receivingApplication: params.receivingApplication || "HIS",
          receivingFacility: params.receivingFacility || "HOSPITAL",
          timestamp,
          patientId: patient.patientid,
          patientName: `${patient.lastname}^${patient.firstname}`,
          orderNumber: sample.samplenumber,
          observations: results.map((r) => ({
            observationId: r.resultid,
            observationCode: r.testcode,
            observationName: r.testname,
            value: r.resultvalue,
            units: r.unit || "",
            referenceRange: r.referencerange || "",
            abnormalFlags: r.isabormal ? (r.iscritical ? "HH" : "H") : "",
            observationDateTime: r.analyzeddate.toISOString(),
            observationStatus: r.status === "released" ? "F" : "P",
          })),
        });

        resolve({ success: true, message: hl7Message });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }

  /**
   * Build HL7 ORU^R01 message string
   */
  private static buildHL7ORUMessage(data: {
    messageControlId: string;
    sendingApplication: string;
    sendingFacility: string;
    receivingApplication: string;
    receivingFacility: string;
    timestamp: string;
    patientId: string;
    patientName: string;
    orderNumber: string;
    observations: Array<{
      observationId: string;
      observationCode: string;
      observationName: string;
      value: string;
      units: string;
      referenceRange: string;
      abnormalFlags: string;
      observationDateTime: string;
      observationStatus: string;
    }>;
  }): string {
    const segments: string[] = [];

    // MSH - Message Header
    segments.push(
      `MSH|^~\\&|${data.sendingApplication}|${data.sendingFacility}|${data.receivingApplication}|${data.receivingFacility}|${data.timestamp}||ORU^R01|${data.messageControlId}|P|2.5`
    );

    // PID - Patient Identification
    segments.push(
      `PID|1||${data.patientId}||${data.patientName}||||||||||||||||||||||`
    );

    // OBR - Observation Request
    segments.push(
      `OBR|1|${data.orderNumber}||LAB^Laboratory Report|||${data.timestamp}|||||||||||||||${data.timestamp}|||F`
    );

    // OBX - Observation/Result segments
    data.observations.forEach((obs, index) => {
      const obxSegment = [
        "OBX",
        (index + 1).toString(),
        "NM", // Value type (NM = Numeric, ST = String)
        obs.observationCode,
        obs.observationName,
        obs.value,
        obs.units,
        obs.referenceRange,
        obs.abnormalFlags,
        "",
        obs.observationStatus,
        "",
        "",
        obs.observationDateTime,
      ].join("|");
      segments.push(obxSegment);
    });

    return segments.join("\r");
  }

  /**
   * Generate conclusion text from results
   */
  private static generateConclusion(results: any[]): string {
    const abnormalCount = results.filter((r) => r.isabormal).length;
    const criticalCount = results.filter((r) => r.iscritical).length;

    if (criticalCount > 0) {
      return `${criticalCount} critical result(s) detected. Immediate attention required.`;
    } else if (abnormalCount > 0) {
      return `${abnormalCount} abnormal result(s) detected. Review recommended.`;
    } else {
      return "All results within normal limits.";
    }
  }

  /**
   * Generate conclusion codes from results
   */
  private static generateConclusionCodes(results: TestResultData[]): any[] {
    const codes = [];

    const hasCritical = results.some((r) => r.isCritical);
    const hasAbnormal = results.some((r) => r.isAbnormal);

    if (hasCritical) {
      codes.push({
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "281302008",
            display: "Critical result",
          },
        ],
      });
    } else if (hasAbnormal) {
      codes.push({
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "263654008",
            display: "Abnormal",
          },
        ],
      });
    } else {
      codes.push({
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "17621005",
            display: "Normal",
          },
        ],
      });
    }

    return codes;
  }
}

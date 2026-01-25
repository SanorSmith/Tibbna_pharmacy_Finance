import {
  createLaboratoryReport,
  buildLaboratoryReport,
  TestStatusCodes,
  InterpretationCodes,
  AdequacyForTestingCodes
} from "@/lib/openehr";

const report = buildLaboratoryReport({
  startTime: new Date().toISOString(),
  composerName: "Dr. Smith",
  laboratory: "Main Hospital Lab",
  testEvents: [
    {
      testName: "Complete Blood Count",
      testStatus: TestStatusCodes.Final,
      time: new Date().toISOString(),
      testResults: [
        {
          resultName: "Hemoglobin",
          resultValue: { magnitude: 14.5, unit: "g/dL" },
          referenceRange: "12.0-16.0 g/dL",
          interpretation: InterpretationCodes.Normal,
        },
        {
          resultName: "WBC",
          resultValue: { magnitude: 11.2, unit: "10^9/L" },
          referenceRange: "4.0-10.0",
          interpretation: InterpretationCodes.High,
        },
      ],
    },
  ],
  specimen: {
    specimenType: "Venous blood",
    collectionDateTime: new Date().toISOString(),
    adequacyForTesting: AdequacyForTestingCodes.Satisfactory,
  },
});

// Create directly with structured data
const ehrId = "123";
await createLaboratoryReport(ehrId, report);

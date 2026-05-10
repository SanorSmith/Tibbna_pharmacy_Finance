/**
 * Seed Data Function for LIMS Validation Module
 * Creates sample data for testing the validation workflow
 * 
 * This can be called from an API route or directly if DATABASE_URL is available
 */

import { db } from "./index";
import { samples, testResults, validationStates } from "./schema";

// NOTE: This seed file is deprecated and references the old 'samples' table
// It has been replaced by the accession_samples workflow
// Keeping for reference only - DO NOT USE

async function seedValidationData() {
  console.log("🌱 Seeding LIMS validation data...");
  console.warn("⚠️ This seed function is deprecated. Use accession_samples workflow instead.");
  return;

  try {
    // Get first patient from the database to use as test patient
    const existingPatients = await db.query.patients.findMany({
      limit: 3,
    });

    if (existingPatients.length === 0) {
      console.error("❌ No patients found in database. Please create patients first.");
      return;
    }

    console.log(`✓ Found ${existingPatients.length} patients to use for samples`);

    // Get workspace from first patient
    const workspaceid = existingPatients[0].workspaceid;

    // Sample test configurations
    interface TestConfig {
      testcode: string;
      testname: string;
      unit: string;
      referencemin: string;
      referencemax: string;
      normalRange: number[];
      criticalLow?: number;
      criticalHigh?: number;
    }

    const testConfigs: { hematology: TestConfig[]; biochemistry: TestConfig[] } = {
      hematology: [
        {
          testcode: "WBC",
          testname: "White Blood Cell Count",
          unit: "10^9/L",
          referencemin: "4.0",
          referencemax: "11.0",
          normalRange: [4.5, 10.5],
        },
        {
          testcode: "RBC",
          testname: "Red Blood Cell Count",
          unit: "10^12/L",
          referencemin: "4.5",
          referencemax: "5.9",
          normalRange: [4.6, 5.8],
        },
        {
          testcode: "HGB",
          testname: "Hemoglobin",
          unit: "g/dL",
          referencemin: "13.5",
          referencemax: "17.5",
          normalRange: [13.8, 17.2],
        },
        {
          testcode: "PLT",
          testname: "Platelet Count",
          unit: "10^9/L",
          referencemin: "150",
          referencemax: "400",
          normalRange: [160, 390],
        },
      ],
      biochemistry: [
        {
          testcode: "GLU",
          testname: "Glucose",
          unit: "mg/dL",
          referencemin: "70",
          referencemax: "100",
          normalRange: [75, 95],
          criticalLow: 50,
          criticalHigh: 400,
        },
        {
          testcode: "CREA",
          testname: "Creatinine",
          unit: "mg/dL",
          referencemin: "0.7",
          referencemax: "1.3",
          normalRange: [0.8, 1.2],
        },
        {
          testcode: "ALT",
          testname: "Alanine Aminotransferase",
          unit: "U/L",
          referencemin: "7",
          referencemax: "56",
          normalRange: [10, 50],
        },
        {
          testcode: "K",
          testname: "Potassium",
          unit: "mmol/L",
          referencemin: "3.5",
          referencemax: "5.1",
          normalRange: [3.6, 5.0],
          criticalLow: 2.5,
          criticalHigh: 6.5,
        },
      ],
    };

    // Create samples with different scenarios
    const sampleScenarios = [
      {
        patient: existingPatients[0],
        testgroup: "hematology",
        priority: "routine",
        analyzer: "sysmex",
        state: "ANALYZED",
        description: "Normal hematology panel",
        resultModifier: (value: number) => value, // Normal values
      },
      {
        patient: existingPatients[1] || existingPatients[0],
        testgroup: "biochemistry",
        priority: "urgent",
        analyzer: "cobas",
        state: "ANALYZED",
        description: "Biochemistry with critical glucose",
        resultModifier: (value: number, test: TestConfig) => {
          if (test.testcode === "GLU") return 450; // Critical high
          if (test.testcode === "K") return 6.8; // Critical high
          return value;
        },
      },
      {
        patient: existingPatients[2] || existingPatients[0],
        testgroup: "hematology",
        priority: "stat",
        analyzer: "sysmex",
        state: "TECH_VALIDATED",
        description: "Abnormal CBC - low hemoglobin",
        resultModifier: (value: number, test: TestConfig) => {
          if (test.testcode === "HGB") return 10.2; // Low
          if (test.testcode === "RBC") return 3.8; // Low
          return value;
        },
      },
    ];

    for (const scenario of sampleScenarios) {
      console.log(`\n📋 Creating sample: ${scenario.description}`);

      // Create sample
      const collectionDate = new Date();
      collectionDate.setHours(collectionDate.getHours() - Math.random() * 48); // Random time in last 48 hours

      const receivedDate = new Date(collectionDate);
      receivedDate.setMinutes(receivedDate.getMinutes() + 30); // 30 min after collection

      const [sample] = await db
        .insert(samples)
        .values({
          patientid: scenario.patient.patientid,
          workspaceid,
          orderid: `ORD-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          sampletype: scenario.testgroup === "hematology" ? "Whole Blood" : "Serum",
          collectiondate: collectionDate,
          receiveddate: receivedDate,
          analyzer: scenario.analyzer,
          testgroup: scenario.testgroup,
          priority: scenario.priority,
          status: "ANALYZED",
          metadata: {
            collectedBy: "Lab Tech",
            location: "Main Lab",
          },
        })
        .returning();

      console.log(`  ✓ Sample created: ${sample.sampleid.substring(0, 8)}`);

      // Create test results
      const tests =
        scenario.testgroup === "hematology"
          ? testConfigs.hematology
          : testConfigs.biochemistry;

      for (const test of tests) {
        // Generate result value
        const [min, max] = test.normalRange;
        let resultValue = min + Math.random() * (max - min);
        resultValue = scenario.resultModifier(resultValue, test);

        // Determine flag and critical status
        let flag = "normal";
        let isCritical = false;

        const numericMin = parseFloat(test.referencemin);
        const numericMax = parseFloat(test.referencemax);

        if (resultValue < numericMin) {
          flag = "low";
          if (test.criticalLow !== undefined && resultValue < test.criticalLow!) {
            isCritical = true;
            flag = "critical_low";
          }
        } else if (resultValue > numericMax) {
          flag = "high";
          if (test.criticalHigh !== undefined && resultValue > test.criticalHigh!) {
            isCritical = true;
            flag = "critical_high";
          }
        }

        // Create test result
        await db.insert(testResults).values({
          workspaceid,
          sampleid: sample.sampleid,
          testcode: test.testcode,
          testname: test.testname,
          resultvalue: resultValue.toFixed(1),
          unit: test.unit,
          referencemin: test.referencemin,
          referencemax: test.referencemax,
          referencerange: `${test.referencemin} - ${test.referencemax} ${test.unit}`,
          flag,
          iscritical: isCritical,
          previousvalue: Math.random() > 0.5 ? (resultValue * 0.95).toFixed(1) : null,
          previousdate:
            Math.random() > 0.5
              ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              : null,
          analyzerresult: resultValue.toFixed(1),
          analyzeddate: new Date(),
        });

        console.log(
          `    ✓ ${test.testname}: ${resultValue.toFixed(1)} ${test.unit} [${flag}${
            isCritical ? " - CRITICAL" : ""
          }]`
        );
      }

      // Create validation state
      await db.insert(validationStates).values({
        sampleid: sample.sampleid,
        currentstate: scenario.state,
        previousstate: null,
      });

      console.log(`  ✓ Validation state: ${scenario.state}`);
    }

    console.log("\n✅ Seed data created successfully!");
    console.log("\nSummary:");
    console.log(`  - ${sampleScenarios.length} samples created`);
    console.log(`  - Test results with normal, abnormal, and critical values`);
    console.log(`  - Different validation states (ANALYZED, TECH_VALIDATED)`);
    console.log(`  - Various priorities (routine, urgent, stat)`);
    console.log("\n💡 You can now test the validation workflow in the UI");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}

// Export the seed function for use in API routes or scripts
export { seedValidationData };

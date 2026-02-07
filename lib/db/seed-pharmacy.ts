/**
 * Seed script for Pharmacy MVP
 *
 * Usage: npx tsx lib/db/seed-pharmacy.ts
 *
 * Seeds drugs, batches, stock locations, stock levels, insurance companies,
 * and a sample pharmacy order for the first workspace found.
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { workspaces } from "./tables/workspace";
import { patients } from "./tables/patient";
import { drugs, drugBatches } from "./tables/pharmacy-drugs";
import { stockLocations, stockLevels } from "./tables/pharmacy-stock";
import { pharmacyOrders, pharmacyOrderItems } from "./tables/pharmacy-orders";
import { insuranceCompanies } from "./tables/pharmacy-insurance";

const client = postgres(`${process.env.DATABASE_URL}?sslmode=require`);
const db = drizzle(client);

async function seed() {
  console.log("🏥 Seeding pharmacy data...");

  // Get first workspace
  const [ws] = await db.select().from(workspaces).limit(1);
  if (!ws) {
    console.error("No workspace found. Seed a workspace first.");
    process.exit(1);
  }
  const wid = ws.workspaceid;
  console.log(`  Using workspace: ${ws.name} (${wid})`);

  // ── 1. Drugs ──────────────────────────────────────────────────────
  const drugData = [
    { name: "Amoxicillin 500mg Capsule", genericname: "Amoxicillin", atccode: "J01CA04", form: "capsule", strength: "500 mg", unit: "capsule", barcode: "DRG-AMX500", manufacturer: "Teva Pharmaceuticals" },
    { name: "Paracetamol 500mg Tablet", genericname: "Paracetamol", atccode: "N02BE01", form: "tablet", strength: "500 mg", unit: "tablet", barcode: "DRG-PCM500", manufacturer: "GSK" },
    { name: "Ibuprofen 400mg Tablet", genericname: "Ibuprofen", atccode: "M01AE01", form: "tablet", strength: "400 mg", unit: "tablet", barcode: "DRG-IBU400", manufacturer: "Pfizer" },
    { name: "Metformin 850mg Tablet", genericname: "Metformin", atccode: "A10BA02", form: "tablet", strength: "850 mg", unit: "tablet", barcode: "DRG-MET850", manufacturer: "Merck" },
    { name: "Omeprazole 20mg Capsule", genericname: "Omeprazole", atccode: "A02BC01", form: "capsule", strength: "20 mg", unit: "capsule", barcode: "DRG-OMP20", manufacturer: "AstraZeneca" },
    { name: "Lisinopril 10mg Tablet", genericname: "Lisinopril", atccode: "C09AA03", form: "tablet", strength: "10 mg", unit: "tablet", barcode: "DRG-LIS10", manufacturer: "Lupin" },
    { name: "Atorvastatin 20mg Tablet", genericname: "Atorvastatin", atccode: "C10AA05", form: "tablet", strength: "20 mg", unit: "tablet", barcode: "DRG-ATV20", manufacturer: "Pfizer" },
    { name: "Cetirizine 10mg Tablet", genericname: "Cetirizine", atccode: "R06AE07", form: "tablet", strength: "10 mg", unit: "tablet", barcode: "DRG-CET10", manufacturer: "UCB" },
    { name: "Azithromycin 250mg Tablet", genericname: "Azithromycin", atccode: "J01FA10", form: "tablet", strength: "250 mg", unit: "tablet", barcode: "DRG-AZI250", manufacturer: "Pfizer" },
    { name: "Salbutamol 100mcg Inhaler", genericname: "Salbutamol", atccode: "R03AC02", form: "inhaler", strength: "100 mcg/puff", unit: "puff", barcode: "DRG-SAL100", manufacturer: "GSK" },
  ];

  const insertedDrugs = await db
    .insert(drugs)
    .values(drugData.map((d) => ({ ...d, workspaceid: wid })))
    .returning();
  console.log(`  ✅ Inserted ${insertedDrugs.length} drugs`);

  // ── 2. Drug batches ───────────────────────────────────────────────
  const batchRows: any[] = [];
  for (const drug of insertedDrugs) {
    batchRows.push({
      drugid: drug.drugid,
      lotnumber: `LOT-${drug.barcode}-A`,
      expirydate: "2027-06-30",
      purchaseprice: (Math.random() * 20 + 2).toFixed(2),
      sellingprice: (Math.random() * 30 + 5).toFixed(2),
      barcode: `${drug.barcode}-A`,
    });
  }
  const insertedBatches = await db
    .insert(drugBatches)
    .values(batchRows)
    .returning();
  console.log(`  ✅ Inserted ${insertedBatches.length} drug batches`);

  // ── 3. Stock locations ────────────────────────────────────────────
  const locations = [
    { name: "Shelf A-1", type: "shelf", description: "Main dispensing shelf" },
    { name: "Shelf B-2", type: "shelf", description: "Antibiotics section" },
    { name: "Fridge 1", type: "fridge", description: "Cold-chain medications" },
    { name: "Controlled Cabinet", type: "vault", description: "Controlled substances vault" },
  ];
  const insertedLocations = await db
    .insert(stockLocations)
    .values(locations.map((l) => ({ ...l, workspaceid: wid })))
    .returning();
  console.log(`  ✅ Inserted ${insertedLocations.length} stock locations`);

  // ── 4. Stock levels ───────────────────────────────────────────────
  const levelRows: any[] = [];
  for (let i = 0; i < insertedDrugs.length; i++) {
    levelRows.push({
      drugid: insertedDrugs[i].drugid,
      batchid: insertedBatches[i].batchid,
      locationid: insertedLocations[i % insertedLocations.length].locationid,
      quantity: Math.floor(Math.random() * 200) + 50,
    });
  }
  await db.insert(stockLevels).values(levelRows);
  console.log(`  ✅ Inserted ${levelRows.length} stock levels`);

  // ── 5. Insurance companies ────────────────────────────────────────
  const insurers = [
    { name: "National Health Insurance", code: "NHI", coveragepercent: "90.00" },
    { name: "BlueCross BlueShield", code: "BCBS", coveragepercent: "80.00" },
    { name: "MedLife Insurance", code: "MLI", coveragepercent: "70.00" },
  ];
  await db
    .insert(insuranceCompanies)
    .values(insurers.map((i) => ({ ...i, workspaceid: wid })));
  console.log(`  ✅ Inserted ${insurers.length} insurance companies`);

  // ── 6. Sample pharmacy order (if patients exist) ──────────────────
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.workspaceid, wid))
    .limit(1);

  if (patient) {
    const [order] = await db
      .insert(pharmacyOrders)
      .values({
        workspaceid: wid,
        patientid: patient.patientid,
        status: "PENDING",
        source: "manual",
        priority: "routine",
        notes: "Seeded sample order",
      })
      .returning();

    await db.insert(pharmacyOrderItems).values([
      {
        orderid: order.orderid,
        drugid: insertedDrugs[0].drugid,
        drugname: insertedDrugs[0].name,
        dosage: "500 mg three times daily for 7 days",
        quantity: 21,
        unitprice: insertedBatches[0].sellingprice,
        status: "PENDING",
      },
      {
        orderid: order.orderid,
        drugid: insertedDrugs[1].drugid,
        drugname: insertedDrugs[1].name,
        dosage: "500 mg as needed, max 4 times daily",
        quantity: 20,
        unitprice: insertedBatches[1].sellingprice,
        status: "PENDING",
      },
    ]);
    console.log(`  ✅ Inserted sample order for patient ${patient.firstname} ${patient.lastname}`);
  } else {
    console.log("  ⚠ No patients found — skipping sample order");
  }

  console.log("✅ Pharmacy seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

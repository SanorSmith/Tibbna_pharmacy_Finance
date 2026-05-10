import { db } from "./index";
import { departments } from "./schema";

const defaultDepartments = [
  { name: "Cardiology", phone: null, email: null, address: null },
  { name: "Neurology", phone: null, email: null, address: null },
  { name: "Orthopedics", phone: null, email: null, address: null },
  { name: "Pediatrics", phone: null, email: null, address: null },
  { name: "Radiology", phone: null, email: null, address: null },
  { name: "Emergency Medicine", phone: null, email: null, address: null },
  { name: "Internal Medicine", phone: null, email: null, address: null },
  { name: "Surgery", phone: null, email: null, address: null },
  { name: "Oncology", phone: null, email: null, address: null },
  { name: "Dermatology", phone: null, email: null, address: null },
  { name: "Psychiatry", phone: null, email: null, address: null },
  { name: "Ophthalmology", phone: null, email: null, address: null },
  { name: "ENT (Ear, Nose, Throat)", phone: null, email: null, address: null },
  { name: "Gastroenterology", phone: null, email: null, address: null },
  { name: "Pulmonology", phone: null, email: null, address: null },
  { name: "Nephrology", phone: null, email: null, address: null },
  { name: "Endocrinology", phone: null, email: null, address: null },
  { name: "Rheumatology", phone: null, email: null, address: null },
  { name: "Urology", phone: null, email: null, address: null },
  { name: "Obstetrics & Gynecology", phone: null, email: null, address: null },
];

export async function seedDepartments(workspaceid: string) {
  console.log(`Seeding departments for workspace: ${workspaceid}`);
  
  const departmentsToInsert = defaultDepartments.map((dept) => ({
    ...dept,
    workspaceid,
  }));

  const inserted = await db
    .insert(departments)
    .values(departmentsToInsert)
    .returning();

  console.log(`✅ Seeded ${inserted.length} departments`);
  return inserted;
}

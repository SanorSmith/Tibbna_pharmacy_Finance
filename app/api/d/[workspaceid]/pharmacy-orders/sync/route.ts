/**
 * Sync Pharmacy Orders from OpenEHR
 *
 * POST /api/d/[workspaceid]/pharmacy-orders/sync
 *
 * Fetches all medication order compositions from openEHR for every patient
 * in this workspace, then upserts them into the local pharmacy_orders and
 * pharmacy_order_items tables (deduplicated by composition_uid).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, pharmacyOrders, pharmacyOrderItems, users } from "@/lib/db/schema";
import { eq, ilike, or, isNull } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getOpenEHREHRBySubjectId, getOpenEHRPrescriptions } from "@/lib/openehr/openehr";
import { Pool } from "pg";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // 1. Get patients in this workspace AND global patients (workspaceid IS NULL)
    const workspacePatients = await db
      .select()
      .from(patients)
      .where(
        or(
          eq(patients.workspaceid, workspaceid),
          isNull(patients.workspaceid)
        )
      );

    // Filter to only patients with EHR IDs to avoid unnecessary API calls
    const patientsWithEHR = workspacePatients.filter(p => p.ehrid || p.nationalid);

    // 2. Get existing openEHR order IDs so we can skip duplicates
    const existingOrders = await db
      .select({ openehrorderid: pharmacyOrders.openehrorderid })
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.workspaceid, workspaceid));

    const existingIds = new Set(
      existingOrders
        .map((o) => o.openehrorderid)
        .filter(Boolean)
    );

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    // 3. For each patient with EHR ID, fetch prescriptions from openEHR
    for (const patient of patientsWithEHR) {
      let ehrId: string | null = null;

      try {
        if (patient.ehrid) {
          ehrId = patient.ehrid;
        } else if (patient.nationalid) {
          ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
        }
        if (!ehrId) {
          ehrId = await getOpenEHREHRBySubjectId(patient.patientid);
        }
        if (!ehrId) {
          continue;
        }

        const prescriptions = await getOpenEHRPrescriptions(ehrId);

        for (const rx of prescriptions) {
          // Deduplicate by composition_uid
          if (existingIds.has(rx.composition_uid)) {
            skipped++;
            continue;
          }

          // Determine priority from the prescription
          const priority = rx.clinical_indication?.toLowerCase().includes("urgent")
            ? "urgent" as const
            : "routine" as const;

          // Try to find prescriber by name in users table
          let prescriberid: string | null = null;
          if (rx.prescribed_by && rx.prescribed_by !== "Unknown") {
            const [prescriber] = await db
              .select({ userid: users.userid })
              .from(users)
              .where(ilike(users.name, `%${rx.prescribed_by}%`))
              .limit(1);
            
            if (prescriber) {
              prescriberid = prescriber.userid;
            }
          }

          // Create pharmacy order
          const [order] = await db
            .insert(pharmacyOrders)
            .values({
              workspaceid,
              patientid: patient.patientid,
              prescriberid,
              status: "PENDING",
              source: "openehr",
              openehrorderid: rx.composition_uid,
              priority,
              notes: [
                rx.clinical_indication && `Indication: ${rx.clinical_indication}`,
                rx.comment,
                rx.prescribed_by && `Prescribed by: ${rx.prescribed_by}`,
              ].filter(Boolean).join(" | ") || null,
              metadata: {
                composition_uid: rx.composition_uid,
                recorded_time: rx.recorded_time,
                prescribed_by: rx.prescribed_by,
                issued_from: rx.issued_from,
              },
            })
            .returning();

          // Build dosage string
          const dosageParts: string[] = [];
          if (rx.dose_amount) dosageParts.push(`${rx.dose_amount}${rx.dose_unit ? ` ${rx.dose_unit}` : ""}`);
          if (rx.route) dosageParts.push(rx.route);
          if (rx.timing_directions) dosageParts.push(rx.timing_directions);
          const dosage = dosageParts.join(", ") || null;

          // Fetch selling price from inventory for this medication
          const drugName = rx.medication_item || rx.product_name || "Unknown medication";
          const priceResult = await pool.query(`
            SELECT ib.selling_price
            FROM items i
            LEFT JOIN item_batches ib ON ib.item_id = i.id
            WHERE i.name ILIKE $1
              AND i.is_active = true
              AND ib.quantity > 0
            ORDER BY ib.expiry_date ASC
            LIMIT 1
          `, [drugName]);
          
          const sellingPrice = priceResult.rows[0]?.selling_price || null;

          // Create order item
          await db.insert(pharmacyOrderItems).values({
            orderid: order.orderid,
            drugid: null,
            drugname: drugName,
            dosage,
            quantity: 1,
            unitprice: sellingPrice,
            status: "PENDING",
          });

          existingIds.add(rx.composition_uid);
          synced++;
        }
      } catch (err) {
        const msg = `Patient ${patient.firstname} ${patient.lastname}: ${err instanceof Error ? err.message : String(err)}`;
        console.error("[Pharmacy Sync]", msg);
        errors.push(msg);
      }
    }

    return NextResponse.json({
      message: `Synced ${synced} new orders, skipped ${skipped} existing`,
      synced,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Pharmacy Sync POST]", error);
    return NextResponse.json({ error: "Failed to sync orders from openEHR" }, { status: 500 });
  }
}

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
import { patients, pharmacyOrders, pharmacyOrderItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getOpenEHREHRBySubjectId, getOpenEHRPrescriptions } from "@/lib/openehr/openehr";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Get all patients across all workspaces (prescriptions in openEHR are global)
    const workspacePatients = await db
      .select()
      .from(patients);

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

    console.log(`[Pharmacy Sync] ${workspacePatients.length} patients in workspace, ${existingIds.size} existing orders`);

    // 3. For each patient, fetch prescriptions from openEHR
    for (const patient of workspacePatients) {
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
          console.log(`[Pharmacy Sync] No EHR ID for patient ${patient.firstname} ${patient.lastname} (nationalid: ${patient.nationalid}, ehrid: ${patient.ehrid})`);
          continue;
        }

        console.log(`[Pharmacy Sync] Fetching prescriptions for ${patient.firstname} ${patient.lastname} (ehrId: ${ehrId})`);
        const prescriptions = await getOpenEHRPrescriptions(ehrId);
        console.log(`[Pharmacy Sync] Found ${prescriptions.length} prescriptions for ${patient.firstname} ${patient.lastname}`);

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

          // Create pharmacy order
          const [order] = await db
            .insert(pharmacyOrders)
            .values({
              workspaceid,
              patientid: patient.patientid,
              prescriberid: null,
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

          // Create order item
          await db.insert(pharmacyOrderItems).values({
            orderid: order.orderid,
            drugid: null,
            drugname: rx.medication_item || rx.product_name || "Unknown medication",
            dosage,
            quantity: 1,
            unitprice: null,
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

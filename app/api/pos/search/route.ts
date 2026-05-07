/**
 * POS Search API
 *
 * GET — search patients, dispensed orders, drugs/items
 * Query params: q (search term), type (patient|order|drug|all)
 *
 * Uses the unified inventory system: items → item_batches → inventory_stock
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pharmacyOrders, patients } from "@/lib/db/schema";
import { drugs } from "@/lib/db/tables/pharmacy-drugs";
import { eq, or, and, ilike, sql, desc } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const searchType = searchParams.get("type") || "all"; // patient | order | drug | all

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const results: {
      patients: any[];
      dispensedOrders: any[];
      drugs: any[];
    } = {
      patients: [],
      dispensedOrders: [],
      drugs: [],
    };

    // Search patients (by national ID, name, phone) and their non-dispensed orders
    if (searchType === "patient" || searchType === "all") {
      const foundPatients = await db
        .select({
          patientid: patients.patientid,
          firstname: patients.firstname,
          lastname: patients.lastname,
          nationalid: patients.nationalid,
          phone: patients.phone,
          dateofbirth: patients.dateofbirth,
        })
        .from(patients)
        .where(
          or(
            ilike(patients.nationalid, `%${query}%`),
            ilike(patients.firstname, `%${query}%`),
            ilike(patients.lastname, `%${query}%`),
            ilike(patients.phone, `%${query}%`)
          )
        )
        .limit(10);

      // For each patient, get their non-dispensed orders (PENDING and PARTIALLY_DISPENSED)
      for (const patient of foundPatients) {
        const patientOrders = await db
          .select({
            orderid: pharmacyOrders.orderid,
            patientid: pharmacyOrders.patientid,
            status: pharmacyOrders.status,
            openehrorderid: pharmacyOrders.openehrorderid,
            createdat: pharmacyOrders.createdat,
            dispensedat: pharmacyOrders.dispensedat,
          })
          .from(pharmacyOrders)
          .where(
            and(
              eq(pharmacyOrders.patientid, patient.patientid),
              or(
                eq(pharmacyOrders.status, "PENDING"),
                eq(pharmacyOrders.status, "PARTIALLY_DISPENSED")
              )
            )
          )
          .orderBy(desc(pharmacyOrders.createdat))
          .limit(5);

        // Add orders to the dispensedOrders results
        results.dispensedOrders.push(...patientOrders);
      }

      // Store patients (without orders for now, we'll display them with their orders)
      results.patients = foundPatients;
    }

    // Search dispensed orders (by order ID prefix, openEHR ID) - only when searching specifically for orders
    if (searchType === "order") {
      results.dispensedOrders = await db
        .select({
          orderid: pharmacyOrders.orderid,
          patientid: pharmacyOrders.patientid,
          status: pharmacyOrders.status,
          openehrorderid: pharmacyOrders.openehrorderid,
          createdat: pharmacyOrders.createdat,
          dispensedat: pharmacyOrders.dispensedat,
        })
        .from(pharmacyOrders)
        .where(
          and(
            or(
              eq(pharmacyOrders.status, "PENDING"),
              eq(pharmacyOrders.status, "PARTIALLY_DISPENSED")
            ),
            or(
              sql`${pharmacyOrders.orderid}::text ILIKE ${`%${query}%`}`,
              ilike(pharmacyOrders.openehrorderid, `%${query}%`)
            )
          )
        )
        .limit(10);
    }

    // Search items for OTC sales — uses ONLY unified inventory: items → item_batches → inventory_stock
    // Filters by item_type = 'drug' and links to drugs table via drugid for enrichment
    if (searchType === "drug" || searchType === "all") {
      // Use raw SQL for unified inventory to bypass Drizzle import issues
      const itemResults = await db.execute(sql`
        SELECT
          i.id as "itemId",
          i.drug_id as "drugid",
          i.name as "name",
          i.generic_name as "genericname",
          (SELECT d.form FROM drugs d WHERE d.drugid = i.drug_id LIMIT 1) as "form",
          (SELECT d.strength FROM drugs d WHERE d.drugid = i.drug_id LIMIT 1) as "strength",
          i.barcode as "barcode",
          i.manufacturer as "manufacturer",
          i.item_type as "itemtype",
          -- Best batch ID (FIFO)
          (
            SELECT ib.id
            FROM item_batches ib
            JOIN inventory_stock ist ON ist.item_id = ib.item_id AND ist.batch_id = ib.id
            WHERE ib.item_id = i.id
              AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
              AND ib.is_quarantined = false
              AND ist.quantity > 0
            ORDER BY ib.expiry_date ASC NULLS LAST
            LIMIT 1
          ) as "batchid",
          -- Best batch selling price (show even if stock is 0)
          (
            SELECT ib.selling_price
            FROM item_batches ib
            WHERE ib.item_id = i.id
              AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
              AND ib.is_quarantined = false
            ORDER BY ib.expiry_date ASC NULLS LAST
            LIMIT 1
          ) as "sellingprice",
          -- Best batch unit cost
          (
            SELECT ib.unit_cost
            FROM item_batches ib
            JOIN inventory_stock ist ON ist.item_id = ib.item_id AND ist.batch_id = ib.id
            WHERE ib.item_id = i.id
              AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP)
              AND ib.is_quarantined = false
              AND ist.quantity > 0
            ORDER BY ib.expiry_date ASC NULLS LAST
            LIMIT 1
          ) as "unitcost",
          -- Total available stock (including items without batches)
          COALESCE((
            SELECT SUM(ist.quantity)
            FROM inventory_stock ist
            LEFT JOIN item_batches ib ON ib.id = ist.batch_id AND ib.item_id = ist.item_id
            WHERE ist.item_id = i.id
              AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP OR ib.id IS NULL)
              AND (ib.is_quarantined = false OR ib.id IS NULL)
              AND ist.quantity > 0
          ), 0) as "availablestock"
        FROM items i
        WHERE i.item_type = 'drug'
          AND (i.name ILIKE ${`%${query}%`}
               OR i.generic_name ILIKE ${`%${query}%`}
               OR i.barcode = ${query})
        ORDER BY
          -- Prioritize items with available stock
          COALESCE((
            SELECT SUM(ist.quantity)
            FROM inventory_stock ist
            LEFT JOIN item_batches ib ON ib.id = ist.batch_id AND ib.item_id = ist.item_id
            WHERE ist.item_id = i.id
              AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_TIMESTAMP OR ib.id IS NULL)
              AND (ib.is_quarantined = false OR ib.id IS NULL)
              AND ist.quantity > 0
          ), 0) DESC,
          -- Then by name for consistent ordering
          i.name ASC
        LIMIT 20
      `);

      results.drugs = itemResults;
    }

    return NextResponse.json({ results, query, type: searchType });
  } catch (error) {
    console.error("[POS Search] Error:", error);
    console.error("[POS Search] Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Search failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

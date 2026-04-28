/**
 * POS Search API
 *
 * GET — search patients, dispensed orders, drugs
 * Query params: q (search term), type (patient|order|drug|all)
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

    // Search drugs (for OTC sales — by name, generic name, barcode)
    if (searchType === "drug" || searchType === "all") {
      results.drugs = await db
        .select({
          drugid: drugs.drugid,
          name: drugs.name,
          genericname: drugs.genericname,
          form: drugs.form,
          strength: drugs.strength,
          barcode: drugs.barcode,
          manufacturer: drugs.manufacturer,
          // Best batch: earliest-expiry in-stock batch (FIFO)
          batchid: sql<string>`(
            SELECT batchid 
            FROM drug_batches 
            WHERE drugid = ${drugs.drugid}
              AND expirydate > CURRENT_DATE
              AND batchid IN (
                SELECT batchid FROM pharmacy_stock_levels 
                WHERE drugid = ${drugs.drugid} AND quantity > 0
              )
            ORDER BY expirydate ASC
            LIMIT 1
          )`.as("batchid"),
          sellingprice: sql<string>`(
            SELECT sellingprice 
            FROM drug_batches 
            WHERE drugid = ${drugs.drugid}
              AND expirydate > CURRENT_DATE
              AND batchid IN (
                SELECT batchid FROM pharmacy_stock_levels 
                WHERE drugid = ${drugs.drugid} AND quantity > 0
              )
            ORDER BY expirydate ASC
            LIMIT 1
          )`.as("sellingprice"),
          availablestock: sql<number>`COALESCE((
            SELECT SUM(quantity) 
            FROM pharmacy_stock_levels 
            WHERE drugid = ${drugs.drugid}
              AND batchid IN (
                SELECT batchid FROM drug_batches 
                WHERE drugid = ${drugs.drugid} AND expirydate > CURRENT_DATE
              )
          ), 0)`.as("availablestock"),
        })
        .from(drugs)
        .where(
          and(
            eq(drugs.isactive, true),
            or(
              ilike(drugs.name, `%${query}%`),
              ilike(drugs.genericname, `%${query}%`),
              eq(drugs.barcode, query)
            )
          )
        )
        .limit(20);
    }

    return NextResponse.json({ results, query, type: searchType });
  } catch (error) {
    console.error("[POS Search]", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

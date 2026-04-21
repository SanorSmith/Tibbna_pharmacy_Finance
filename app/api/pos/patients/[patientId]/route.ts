/**
 * POS Patient Lookup API
 *
 * GET — patient details, dispensed orders, credit account, insurance
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  patients,
  pharmacyOrders,
  patientCreditAccounts,
  patientInsurance,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUser } from "@/lib/user";

type RouteParams = { params: Promise<{ patientId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientId } = await params;

    // Get patient details
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientId))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Get dispensed orders awaiting payment
    const dispensedOrders = await db
      .select()
      .from(pharmacyOrders)
      .where(
        and(
          eq(pharmacyOrders.patientid, patientId),
          eq(pharmacyOrders.status, "DISPENSED")
        )
      )
      .orderBy(desc(pharmacyOrders.dispensedat));

    // Get credit account
    const [creditAccount] = await db
      .select()
      .from(patientCreditAccounts)
      .where(eq(patientCreditAccounts.patientid, patientId))
      .limit(1);

    // Get insurance info
    const insuranceInfo = await db
      .select()
      .from(patientInsurance)
      .where(eq(patientInsurance.patientid, patientId));

    return NextResponse.json({
      patient,
      dispensedOrders,
      creditAccount: creditAccount || null,
      insurance: insuranceInfo,
    });
  } catch (error) {
    console.error("[POS Patient Lookup]", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}

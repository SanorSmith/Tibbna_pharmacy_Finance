/**
 * Accession Sample API Route
 * Fetches a specific sample by ID with patient demographics
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accessionSamples, patients } from "@/lib/db/schema";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; sampleid: string }> }
) {
  try {
    const { workspaceid, sampleid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the sample with patient demographics
    const samples = await db
      .select({
        sampleid: accessionSamples.sampleid,
        samplenumber: accessionSamples.samplenumber,
        accessionnumber: accessionSamples.accessionnumber,
        sampletype: accessionSamples.sampletype,
        containertype: accessionSamples.containertype,
        volume: accessionSamples.volume,
        volumeunit: accessionSamples.volumeunit,
        collectiondate: accessionSamples.collectiondate,
        collectorid: accessionSamples.collectorid,
        collectorname: accessionSamples.collectorname,
        orderid: accessionSamples.orderid,
        openehrrequestid: accessionSamples.openehrrequestid,
        patientid: accessionSamples.patientid,
        ehrid: accessionSamples.ehrid,
        subjectidentifier: accessionSamples.subjectidentifier,
        tests: accessionSamples.tests,
        barcode: accessionSamples.barcode,
        qrcode: accessionSamples.qrcode,
        openehrcompositionuid: accessionSamples.openehrcompositionuid,
        currentstatus: accessionSamples.currentstatus,
        currentlocation: accessionSamples.currentlocation,
        accessionedby: accessionSamples.accessionedby,
        accessionedat: accessionSamples.accessionedat,
        workspaceid: accessionSamples.workspaceid,
        createdat: accessionSamples.createdat,
        updatedat: accessionSamples.updatedat,
        // Patient demographics
        patientname: sql<string>`CONCAT(${patients.firstname}, ' ', ${patients.lastname})`.as('patientname'),
        patientage: sql<number>`EXTRACT(YEAR FROM AGE(${patients.dateofbirth}))`.as('patientage'),
        patientsex: patients.gender,
      })
      .from(accessionSamples)
      .leftJoin(patients, sql`${accessionSamples.patientid}::uuid = ${patients.patientid}`)
      .where(
        and(
          eq(accessionSamples.workspaceid, workspaceid),
          eq(accessionSamples.sampleid, sampleid)
        )
      );

    if (samples.length === 0) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    return NextResponse.json({ sample: samples[0] });
  } catch (error) {
    console.error("Error fetching sample:", error);
    return NextResponse.json(
      { error: "Failed to fetch sample" },
      { status: 500 }
    );
  }
}

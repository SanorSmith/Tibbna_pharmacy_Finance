/**
 * Lab Report API Route
 * Fetches complete lab report data for a given sample including:
 * - Patient demographics
 * - Sample/specimen details
 * - All test results with reference ranges
 * - Validation/release information
 * - Workspace (facility) info
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  testResults,
  accessionSamples,
  patients,
  workspaces,
  users,
} from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { sql } from "drizzle-orm";

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

    // Fetch workspace info for facility header
    const [workspace] = await db
      .select({
        name: workspaces.name,
        type: workspaces.type,
        description: workspaces.description,
      })
      .from(workspaces)
      .where(eq(workspaces.workspaceid, workspaceid))
      .limit(1);

    // Fetch sample with patient info
    const [sampleData] = await db
      .select({
        sampleid: accessionSamples.sampleid,
        samplenumber: accessionSamples.samplenumber,
        accessionnumber: accessionSamples.accessionnumber,
        sampletype: accessionSamples.sampletype,
        containertype: accessionSamples.containertype,
        collectiondate: accessionSamples.collectiondate,
        collectorname: accessionSamples.collectorname,
        currentstatus: accessionSamples.currentstatus,
        barcode: accessionSamples.barcode,
        labcategory: accessionSamples.labcategory,
        patientid: accessionSamples.patientid,
        orderid: accessionSamples.orderid,
        accessionedat: accessionSamples.accessionedat,
        tests: accessionSamples.tests,
      })
      .from(accessionSamples)
      .where(
        and(
          eq(accessionSamples.sampleid, sampleid),
          eq(accessionSamples.workspaceid, workspaceid)
        )
      )
      .limit(1);

    if (!sampleData) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    // Fetch patient info if patientid exists
    let patientData = null;
    if (sampleData.patientid) {
      const patientRows = await db
        .select({
          patientid: patients.patientid,
          firstname: patients.firstname,
          middlename: patients.middlename,
          lastname: patients.lastname,
          dateofbirth: patients.dateofbirth,
          gender: patients.gender,
          nationalid: patients.nationalid,
          phone: patients.phone,
          bloodgroup: patients.bloodgroup,
        })
        .from(patients)
        .where(eq(patients.patientid, sampleData.patientid))
        .limit(1);

      if (patientRows.length > 0) {
        const p = patientRows[0];
        const age = p.dateofbirth
          ? Math.floor(
              (Date.now() - new Date(p.dateofbirth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null;
        patientData = { ...p, age };
      }
    }

    // Fetch all test results for this sample
    const resultsData = await db
      .select({
        resultid: testResults.resultid,
        testcode: testResults.testcode,
        testname: testResults.testname,
        resultvalue: testResults.resultvalue,
        resultnumeric: testResults.resultnumeric,
        unit: testResults.unit,
        referencemin: testResults.referencemin,
        referencemax: testResults.referencemax,
        referencerange: testResults.referencerange,
        flag: testResults.flag,
        isabormal: testResults.isabormal,
        iscritical: testResults.iscritical,
        interpretation: testResults.interpretation,
        status: testResults.status,
        comment: testResults.comment,
        entereddate: testResults.entereddate,
        technicalvalidatedby: testResults.technicalvalidatedby,
        technicalvalidateddate: testResults.technicalvalidateddate,
        medicalvalidatedby: testResults.medicalvalidatedby,
        medicalvalidateddate: testResults.medicalvalidateddate,
        releasedby: testResults.releasedby,
        releaseddate: testResults.releaseddate,
        analyzeddate: testResults.analyzeddate,
      })
      .from(testResults)
      .where(
        and(
          eq(testResults.sampleid, sampleid),
          eq(testResults.workspaceid, workspaceid)
        )
      )
      .orderBy(testResults.testcode);

    // Resolve user names for validation/release
    const userIds = new Set<string>();
    resultsData.forEach((r) => {
      if (r.technicalvalidatedby) userIds.add(r.technicalvalidatedby);
      if (r.medicalvalidatedby) userIds.add(r.medicalvalidatedby);
      if (r.releasedby) userIds.add(r.releasedby);
    });

    const userMap = new Map<string, string>();
    if (userIds.size > 0) {
      const userRows = await db
        .select({ userid: users.userid, name: users.name, email: users.email })
        .from(users)
        .where(
          sql`${users.userid} IN (${sql.join(
            Array.from(userIds).map((id) => sql`${id}`),
            sql`, `
          )})`
        );
      userRows.forEach((u) => {
        userMap.set(u.userid, u.name || u.email || "Unknown");
      });
    }

    // Enrich results with user names
    const enrichedResults = resultsData.map((r) => ({
      ...r,
      technicalvalidatedbyname: r.technicalvalidatedby
        ? userMap.get(r.technicalvalidatedby) || null
        : null,
      medicalvalidatedbyname: r.medicalvalidatedby
        ? userMap.get(r.medicalvalidatedby) || null
        : null,
      releasedbyname: r.releasedby
        ? userMap.get(r.releasedby) || null
        : null,
    }));

    return NextResponse.json({
      report: {
        facility: workspace || { name: "Laboratory", type: "laboratory", description: null },
        patient: patientData,
        sample: sampleData,
        results: enrichedResults,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating lab report:", error);
    return NextResponse.json(
      { error: "Failed to generate lab report" },
      { status: 500 }
    );
  }
}

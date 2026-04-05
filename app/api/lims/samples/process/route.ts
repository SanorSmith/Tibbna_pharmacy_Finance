/**
 * Process Sample API
 * 
 * Updates sample status to IN_PROCESS and sends status update to OpenEHR
 * This implements the healthcare practice of notifying EHR systems when samples start processing
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { accessionSamples, limsOrders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sampleid, workspaceid } = body;

    if (!sampleid || !workspaceid) {
      return NextResponse.json(
        { error: "Sample ID and workspace ID are required" },
        { status: 400 }
      );
    }

    // Get sample details
    const [sample] = await db
      .select({
        sampleid: accessionSamples.sampleid,
        samplenumber: accessionSamples.samplenumber,
        currentstatus: accessionSamples.currentstatus,
        orderid: accessionSamples.orderid,
        ehrid: accessionSamples.ehrid,
        patientid: accessionSamples.patientid,
        tests: accessionSamples.tests,
      })
      .from(accessionSamples)
      .where(eq(accessionSamples.sampleid, sampleid))
      .limit(1);

    if (!sample) {
      return NextResponse.json(
        { error: "Sample not found" },
        { status: 404 }
      );
    }

    // Check if sample is already processed
    if (sample.currentstatus === 'IN_PROCESS' || 
        sample.currentstatus === 'ANALYZED' || 
        sample.currentstatus === 'DISPOSED') {
      return NextResponse.json(
        { error: "Sample is already processed or completed" },
        { status: 400 }
      );
    }

    // Update sample status to IN_PROCESS
    const result = await db.transaction(async (tx) => {
      // Update sample status
      const [updatedSample] = await tx
        .update(accessionSamples)
        .set({
          currentstatus: 'IN_PROCESS',
          updatedat: new Date(),
        })
        .where(eq(accessionSamples.sampleid, sampleid))
        .returning();

      // Update order status if this is the first sample being processed
      if (sample.orderid) {
        const [order] = await tx
          .select()
          .from(limsOrders)
          .where(eq(limsOrders.orderid, sample.orderid))
          .limit(1);

        if (order && order.status === 'ACCEPTED') {
          await tx
            .update(limsOrders)
            .set({
              status: 'IN_PROGRESS',
              updatedat: new Date(),
            })
            .where(eq(limsOrders.orderid, sample.orderid));
        }
      }

      return updatedSample;
    });

    // Send status update to OpenEHR if sample has OpenEHR ID
    if (sample.ehrid) {
      try {
        // Create status update composition for OpenEHR
        const statusUpdate = {
          _type: "COMPOSITION",
          archetype_node_id: "openEHR-EHR-OBSERVATION.sample_status.v1",
          name: {
            _type: "DV_TEXT",
            value: "Sample Processing Status"
          },
          archetype_details: {
            archetype_id: {
              value: "openEHR-EHR-OBSERVATION.sample_status.v1"
            }
          },
          language: {
            terminology_id: { value: "ISO_639-1" },
            code_string: "en"
          },
          territory: {
            terminology_id: { value: "ISO_3166-1" },
            code_string: "GB"
          },
          category: {
            value: "event",
            defining_code: {
              terminology_id: { value: "openehr" },
              code_string: "433"
            }
          },
          composer: {
            _type: "PARTY_IDENTIFIED",
            name: user.name || "Lab Technician"
          },
          context: {
            _type: "EVENT_CONTEXT",
            start_time: {
              _type: "DV_DATE_TIME",
              value: new Date().toISOString()
            },
            setting: {
              _type: "DV_CODED_TEXT",
              value: "Laboratory",
              defining_code: {
                terminology_id: { value: "openehr" },
                code_string: "225"
              }
            }
          },
          content: [{
            _type: "CLUSTER",
            archetype_node_id: "at0001",
            name: {
              _type: "DV_TEXT",
              value: "Sample Status Details"
            },
            items: [{
              _type: "ELEMENT",
              archetype_node_id: "at0002",
              name: {
                _type: "DV_TEXT",
                value: "Sample ID"
              },
              value: {
                _type: "DV_TEXT",
                value: sample.samplenumber
              }
            }, {
              _type: "ELEMENT",
              archetype_node_id: "at0003",
              name: {
                _type: "DV_TEXT",
                value: "Status"
              },
              value: {
                _type: "DV_CODED_TEXT",
                value: "In Progress",
                defining_code: {
                  terminology_id: { value: "local" },
                  code_string: "in_progress"
                }
              }
            }, {
              _type: "ELEMENT",
              archetype_node_id: "at0004",
              name: {
                _type: "DV_TEXT",
                value: "Processing Started"
              },
              value: {
                _type: "DV_DATE_TIME",
                value: new Date().toISOString()
              }
            }]
          }]
        };

        // Send to OpenEHR
        const ehrBase = process.env.EHRBASE_URL?.trim() || "";
        const username = process.env.EHRBASE_USER?.trim() || "";
        const password = process.env.EHRBASE_PASSWORD?.trim() || "";

        if (ehrBase && username && password) {
          const response = await fetch(`${ehrBase}/rest/v1/ehr/${sample.ehrid}/composition`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
            },
            body: JSON.stringify(statusUpdate)
          });

          if (!response.ok) {
            console.error(`Failed to send status update to OpenEHR: ${response.status}`);
            // Don't fail the entire operation if EHR update fails
          }
        }
      } catch (ehrError) {
        console.error("Error sending status update to OpenEHR:", ehrError);
        // Don't fail the entire operation if EHR update fails
      }
    }

    return NextResponse.json({
      success: true,
      sampleid: result.sampleid,
      samplenumber: result.samplenumber,
      status: 'IN_PROCESS',
      message: "Sample is now being processed and EHR has been notified"
    });

  } catch (error) {
    console.error("Process sample error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process sample",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

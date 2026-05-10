/**
 * POS Receipt Reprint API
 *
 * POST — Log reprint action and return receipt data with watermark flag
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posReceiptReprints } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { z } from "zod";

const reprintSchema = z.object({
  workspaceId: z.string().uuid(),
  receiptType: z.enum(["SALE", "RETURN", "SHIFT"]),
  saleId: z.string().uuid().optional().nullable(),
  returnId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
  printFormat: z.enum(["PDF", "THERMAL", "BROWSER"]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reprintSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate that at least one ID is provided based on type
    if (data.receiptType === "SALE" && !data.saleId) {
      return NextResponse.json(
        { error: "saleId required for SALE receipt type" },
        { status: 400 }
      );
    }
    if (data.receiptType === "RETURN" && !data.returnId) {
      return NextResponse.json(
        { error: "returnId required for RETURN receipt type" },
        { status: 400 }
      );
    }
    if (data.receiptType === "SHIFT" && !data.shiftId) {
      return NextResponse.json(
        { error: "shiftId required for SHIFT receipt type" },
        { status: 400 }
      );
    }

    // Log reprint action
    const [reprintLog] = await db
      .insert(posReceiptReprints)
      .values({
        workspaceid: data.workspaceId,
        saleid: data.saleId || null,
        returnid: data.returnId || null,
        shiftid: data.shiftId || null,
        receipttype: data.receiptType,
        cashierid: user.userid,
        printformat: data.printFormat,
        reason: data.reason || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      reprintId: reprintLog.reprintid,
      isReprint: true,
      printFormat: data.printFormat,
      message: "Reprint logged successfully",
    });
  } catch (error) {
    console.error("[Receipt Reprint] Error:", error);
    return NextResponse.json({ error: "Failed to log reprint" }, { status: 500 });
  }
}

/**
 * POS Shift Management API
 *
 * POST — open a new shift
 * GET  — get current open shift for the logged-in cashier
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posShifts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";

const openShiftSchema = z.object({
  workspaceId: z.string().uuid(),
  openingCash: z.number().nonnegative(),
  notes: z.string().optional(),
});

// POST — open shift
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = openShiftSchema.parse(body);

    // Check if cashier already has an open shift
    const [existingShift] = await db
      .select()
      .from(posShifts)
      .where(
        and(
          eq(posShifts.cashierid, user.userid),
          eq(posShifts.status, "OPEN")
        )
      )
      .limit(1);

    if (existingShift) {
      return NextResponse.json(
        {
          error: "You already have an open shift",
          shift: existingShift,
        },
        { status: 400 }
      );
    }

    // Generate shift number
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const seq = Date.now().toString(36).toUpperCase();
    const shiftNumber = `SHIFT-${today}-${seq}`;

    // Create shift
    const [shift] = await db
      .insert(posShifts)
      .values({
        workspaceid: data.workspaceId,
        cashierid: user.userid,
        shiftnumber: shiftNumber,
        openingtime: new Date(),
        openingcash: data.openingCash.toFixed(2),
        status: "OPEN",
        notes: data.notes || null,
      })
      .returning();

    console.log(
      `[POS] Shift ${shiftNumber} opened by ${user.name || user.email}`
    );

    return NextResponse.json({ shift }, { status: 201 });
  } catch (error) {
    console.error("[POS Open Shift]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to open shift" },
      { status: 500 }
    );
  }
}

// GET — get current open shift
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [shift] = await db
      .select()
      .from(posShifts)
      .where(
        and(
          eq(posShifts.cashierid, user.userid),
          eq(posShifts.status, "OPEN")
        )
      )
      .limit(1);

    return NextResponse.json({ shift: shift || null });
  } catch (error) {
    console.error("[POS Get Shift]", error);
    return NextResponse.json(
      { error: "Failed to get shift" },
      { status: 500 }
    );
  }
}

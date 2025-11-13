/**
 * API Route: /api/d/[workspaceid]/pharmacies
 * - GET: List all pharmacies for a workspace
 * - POST: Create a new pharmacy
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { pharmacies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/d/[workspaceid]/pharmacies
 * 
 * Retrieves all pharmacies associated with a specific workspace.
 * 
 * @param req - Next.js request object
 * @param params - Route parameters (awaited Promise containing workspaceid)
 * 
 * @returns JSON response with pharmacies array or error message
 * 
 * @example
 * // Success response (200)
 * {
 *   "pharmacies": [
 *     {
 *       "pharmacyid": "uuid",
 *       "workspaceid": "workspace-uuid",
 *       "name": "Pharmacy Name",
 *       "phone": "+1234567890",
 *       "email": "pharmacy@example.com",
 *       "address": "123 Main St",
 *       "createdat": "2024-01-01T00:00:00Z",
 *       "updatedat": "2024-01-01T00:00:00Z"
 *     }
 *   ]
 * }
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {500} Internal Server Error - Database or server error
 * 
 * @remarks
 * - Requires user authentication via getUser()
 * - Params must be awaited before accessing properties (Next.js 15+)
 * - Returns empty array if no pharmacies found for workspace
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;

    const allPharmacies = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.workspaceid, workspaceid));

    return NextResponse.json({ pharmacies: allPharmacies });
  } catch (error) {
    console.error("Error fetching pharmacies:", error);
    return NextResponse.json(
      { error: "Failed to fetch pharmacies" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/pharmacies
 * 
 * Creates a new pharmacy within a specific workspace.
 * 
 * @param req - Next.js request object with JSON body
 * @param params - Route parameters (awaited Promise containing workspaceid)
 * 
 * @returns JSON response with created pharmacy object or error message
 * 
 * @example
 * // Request body
 * {
 *   "name": "Central Pharmacy",
 *   "phone": "+1234567890",
 *   "email": "central@pharmacy.com",
 *   "address": "123 Medical Center Dr"
 * }
 * 
 * // Success response (201)
 * {
 *   "pharmacy": {
 *     "pharmacyid": "uuid",
 *     "workspaceid": "workspace-uuid",
 *     "name": "Central Pharmacy",
 *     "phone": "+1234567890",
 *     "email": "central@pharmacy.com",
 *     "address": "123 Medical Center Dr",
 *     "createdat": "2024-01-01T00:00:00Z",
 *     "updatedat": "2024-01-01T00:00:00Z"
 *   }
 * }
 * 
 * @throws {400} Bad Request - Missing or invalid pharmacy name
 * @throws {401} Unauthorized - User not authenticated
 * @throws {500} Internal Server Error - Database or server error
 * 
 * @remarks
 * - Requires user authentication via getUser()
 * - Pharmacy name is required and will be trimmed
 * - Phone, email, and address are optional fields
 * - Params must be awaited before accessing properties (Next.js 15+)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;
    const body = await req.json();

    const { name, phone, email, address } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Pharmacy name is required" },
        { status: 400 }
      );
    }

    const [newPharmacy] = await db
      .insert(pharmacies)
      .values({
        workspaceid,
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        address: address || null,
      })
      .returning();

    return NextResponse.json({ pharmacy: newPharmacy }, { status: 201 });
  } catch (error) {
    console.error("Error creating pharmacy:", error);
    return NextResponse.json(
      { error: "Failed to create pharmacy" },
      { status: 500 }
    );
  }
}

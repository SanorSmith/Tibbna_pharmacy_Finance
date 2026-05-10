/**
 * API Route: /api/d/[workspaceid]/labs
 * - GET: List all labs for a workspace
 * - POST: Create a new lab
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { labs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/d/[workspaceid]/labs
 * 
 * Retrieves all labs associated with a specific workspace.
 * 
 * @param req - Next.js request object
 * @param params - Route parameters (awaited Promise containing workspaceid)
 * 
 * @returns JSON response with labs array or error message
 * 
 * @example
 * // Success response (200)
 * {
 *   "labs": [
 *     {
 *       "id": "uuid",
 *       "workspaceid": "workspace-uuid",
 *       "name": "Lab Name",
 *       "phone": "+1234567890",
 *       "email": "lab@example.com",
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
 * - Returns empty array if no labs found for workspace
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

    const allLabs = await db
      .select()
      .from(labs)
      .where(eq(labs.workspaceid, workspaceid));

    return NextResponse.json({ labs: allLabs });
  } catch (error) {
    console.error("Error fetching labs:", error);
    return NextResponse.json(
      { error: "Failed to fetch labs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/labs
 * 
 * Creates a new lab within a specific workspace.
 * 
 * @param req - Next.js request object with JSON body
 * @param params - Route parameters (awaited Promise containing workspaceid)
 * 
 * @returns JSON response with created lab object or error message
 * 
 * @example
 * // Request body
 * {
 *   "name": "Central Lab",
 *   "phone": "+1234567890",
 *   "email": "central@lab.com",
 *   "address": "123 Medical Center Dr"
 * }
 * 
 * // Success response (201)
 * {
 *   "lab": {
 *     "id": "uuid",
 *     "workspaceid": "workspace-uuid",
 *     "name": "Central Lab",
 *     "phone": "+1234567890",
 *     "email": "central@lab.com",
 *     "address": "123 Medical Center Dr",
 *     "createdat": "2024-01-01T00:00:00Z",
 *     "updatedat": "2024-01-01T00:00:00Z"
 *   }
 * }
 * 
 * @throws {400} Bad Request - Missing or invalid lab name
 * @throws {401} Unauthorized - User not authenticated
 * @throws {500} Internal Server Error - Database or server error
 * 
 * @remarks
 * - Requires user authentication via getUser()
 * - Lab name is required and will be trimmed
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
        { error: "Lab name is required" },
        { status: 400 }
      );
    }

    const [newLab] = await db
      .insert(labs)
      .values({
        workspaceid,
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        address: address || null,
      })
      .returning();

    return NextResponse.json({ lab: newLab }, { status: 201 });
  } catch (error) {
    console.error("Error creating lab:", error);
    return NextResponse.json(
      { error: "Failed to create lab" },
      { status: 500 }
    );
  }
}

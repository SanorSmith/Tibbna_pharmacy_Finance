/**
 * API Route: /api/d/[workspaceid]/departments
 * - GET: List all departments for a workspace
 * - POST: Create a new department
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/d/[workspaceid]/departments
 * 
 * Retrieves all departments associated with a specific workspace.
 * 
 * @param req - Next.js request object
 * @param params - Route parameters (awaited Promise containing workspaceid)
 * 
 * @returns JSON response with departments array or error message
 * 
 * @example
 * // Success response (200)
 * {
 *   "departments": [
 *     {
 *       "id": "uuid",
 *       "workspaceid": "workspace-uuid",
 *       "name": "Department Name",
 *       "phone": "+1234567890",
 *       "email": "dept@example.com",
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
 * - Returns empty array if no departments found for workspace
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

    const allDepartments = await db
      .select()
      .from(departments)
      .where(eq(departments.workspaceid, workspaceid));

    return NextResponse.json({ departments: allDepartments });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/departments
 * 
 * Creates a new department within a specific workspace.
 * 
 * @param req - Next.js request object with JSON body
 * @param params - Route parameters (awaited Promise containing workspaceid)
 * 
 * @returns JSON response with created department object or error message
 * 
 * @example
 * // Request body
 * {
 *   "name": "Cardiology",
 *   "phone": "+1234567890",
 *   "email": "cardiology@hospital.com",
 *   "address": "Building A, Floor 3"
 * }
 * 
 * // Success response (201)
 * {
 *   "department": {
 *     "id": "uuid",
 *     "workspaceid": "workspace-uuid",
 *     "name": "Cardiology",
 *     "phone": "+1234567890",
 *     "email": "cardiology@hospital.com",
 *     "address": "Building A, Floor 3",
 *     "createdat": "2024-01-01T00:00:00Z",
 *     "updatedat": "2024-01-01T00:00:00Z"
 *   }
 * }
 * 
 * @throws {400} Bad Request - Missing or invalid department name
 * @throws {401} Unauthorized - User not authenticated
 * @throws {500} Internal Server Error - Database or server error
 * 
 * @remarks
 * - Requires user authentication via getUser()
 * - Department name is required and will be trimmed
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
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    const [newDepartment] = await db
      .insert(departments)
      .values({
        workspaceid,
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        address: address || null,
      })
      .returning();

    return NextResponse.json({ department: newDepartment }, { status: 201 });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}

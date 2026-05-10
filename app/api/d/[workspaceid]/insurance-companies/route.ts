/**
 * Insurance Companies API
 *
 * GET /api/d/[workspaceid]/insurance-companies
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCompanies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Mock insurance companies data for now since the database table doesn't exist yet
    const companies = [
      {
        id: 'INS-001',
        name: 'National Insurance Company',
        code: 'NAT',
        phone: '+964 1 234 5678',
        email: 'info@national-insurance.iq',
        address: 'Baghdad, Iraq',
        coveragepercent: '80.00',
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      },
      {
        id: 'INS-002', 
        name: 'Iraq Health Insurance',
        code: 'IHI',
        phone: '+964 1 345 6789',
        email: 'contact@iraq-health.iq',
        address: 'Erbil, Iraq',
        coveragepercent: '75.00',
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      },
      {
        id: 'INS-003',
        name: 'Private Medical Insurance',
        code: 'PMI',
        phone: '+964 1 456 7890',
        email: 'support@pmi.iq',
        address: 'Basra, Iraq',
        coveragepercent: '85.00',
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      }
    ];

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[Insurance Companies GET]", error);
    return NextResponse.json({ error: "Failed to fetch insurance companies" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supplierClaims, grnItems, vendors } from '@/lib/db/schema';
import { eq, and, desc, like, or, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import type { CreateSupplierClaimRequest, UpdateSupplierClaimRequest } from '@/lib/types/procurement';

// GET /api/d/[workspaceid]/procurement/claims - List claims with filters
export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceid: string } }
) {
  try {
    const { workspaceid } = params;
    const searchParams = req.nextUrl.searchParams;

    const status = searchParams.get('status') as any;
    const vendorid = searchParams.get('vendorid');
    const claimtype = searchParams.get('claimtype') as any;
    const datefrom = searchParams.get('datefrom');
    const dateto = searchParams.get('dateto');
    const searchQuery = searchParams.get('search');

    const conditions = [eq(supplierClaims.workspaceid, workspaceid)];

    if (status) {
      conditions.push(eq(supplierClaims.status, status));
    }
    if (vendorid) {
      conditions.push(eq(supplierClaims.vendorid, vendorid));
    }
    if (claimtype) {
      conditions.push(eq(supplierClaims.claimtype, claimtype));
    }
    if (datefrom) {
      conditions.push(gte(supplierClaims.claimdate, new Date(datefrom)));
    }
    if (dateto) {
      conditions.push(lte(supplierClaims.claimdate, new Date(dateto)));
    }
    if (searchQuery) {
      conditions.push(
        or(
          like(supplierClaims.claimnumber, `%${searchQuery}%`),
          like(supplierClaims.description, `%${searchQuery}%`)
        )!
      );
    }

    const claims = await db
      .select({
        id: supplierClaims.id,
        workspaceid: supplierClaims.workspaceid,
        claimnumber: supplierClaims.claimnumber,
        grnid: supplierClaims.grnid,
        grnitemid: supplierClaims.grnitemid,
        vendorid: supplierClaims.vendorid,
        claimtype: supplierClaims.claimtype,
        status: supplierClaims.status,
        claimdate: supplierClaims.claimdate,
        description: supplierClaims.description,
        quantityclaimed: supplierClaims.quantityclaimed,
        amountclaimed: supplierClaims.amountclaimed,
        resolveddate: supplierClaims.resolveddate,
        resolutionnotes: supplierClaims.resolutionnotes,
        createdby: supplierClaims.createdby,
        createdat: supplierClaims.createdat,
        updatedat: supplierClaims.updatedat,
        vendor: {
          id: vendors.id,
          name: vendors.name,
        },
      })
      .from(supplierClaims)
      .leftJoin(vendors, eq(supplierClaims.vendorid, vendors.id))
      .where(and(...conditions))
      .orderBy(desc(supplierClaims.claimdate));

    return NextResponse.json(claims);
  } catch (error) {
    console.error('Error fetching supplier claims:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier claims' }, { status: 500 });
  }
}

// POST /api/d/[workspaceid]/procurement/claims - Create claim
const createClaimSchema = z.object({
  grnid: z.string().uuid().optional(),
  grnitemid: z.string().uuid().optional(),
  vendorid: z.string().uuid(),
  claimtype: z.enum(['DAMAGED', 'INCORRECT', 'SHORTAGE', 'EXPIRED']),
  description: z.string().min(1),
  quantityclaimed: z.number().min(1),
  amountclaimed: z.number().min(0),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceid: string } }
) {
  try {
    const { workspaceid } = params;
    const body = await req.json();
    const validated = createClaimSchema.parse(body);

    // Generate claim number
    const claimnumber = `CLM-${Date.now().toString().slice(-8)}`;

    // Create claim
    const [newClaim] = await db
      .insert(supplierClaims)
      .values({
        workspaceid,
        claimnumber,
        grnid: validated.grnid,
        grnitemid: validated.grnitemid,
        vendorid: validated.vendorid,
        claimtype: validated.claimtype,
        description: validated.description,
        quantityclaimed: validated.quantityclaimed,
        amountclaimed: validated.amountclaimed.toString(),
        status: 'submitted',
        claimdate: new Date(),
      })
      .returning();

    return NextResponse.json({
      ...newClaim,
      amountclaimed: parseFloat(newClaim.amountclaimed || '0'),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating supplier claim:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create supplier claim' }, { status: 500 });
  }
}

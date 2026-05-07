import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supplierReturns, supplierReturnItems, itemBatches, inventoryStock, stockTransactions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import type { UpdateSupplierReturnRequest } from '@/lib/types/procurement';

// PUT /api/d/[workspaceid]/procurement/returns/[id] - Update return
const updateReturnSchema = z.object({
  status: z.enum(['pending', 'authorized', 'shipped', 'received', 'credited']).optional(),
  creditnote: z.string().optional(),
  receiveddate: z.string().optional(),
  receivedby: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const { workspaceid, id } = params;
    const body = await req.json();
    const validated = updateReturnSchema.parse(body);

    const updateData: any = {};
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.creditnote !== undefined) updateData.creditnote = validated.creditnote;
    if (validated.receiveddate !== undefined) updateData.receiveddate = new Date(validated.receiveddate);
    if (validated.receivedby !== undefined) updateData.receivedby = validated.receivedby;
    updateData.updatedat = new Date();

    const [updatedReturn] = await db
      .update(supplierReturns)
      .set(updateData)
      .where(and(eq(supplierReturns.id, id), eq(supplierReturns.workspaceid, workspaceid)))
      .returning();

    if (!updatedReturn) {
      return NextResponse.json({ error: 'Supplier return not found' }, { status: 404 });
    }

    return NextResponse.json(updatedReturn);
  } catch (error) {
    console.error('Error updating supplier return:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update supplier return' }, { status: 500 });
  }
}

// POST /api/d/[workspaceid]/procurement/returns/[id]/post - Post return (deduct stock, create credit)
const postReturnSchema = z.object({
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const { workspaceid, id } = params;
    const body = await req.json();
    const validated = postReturnSchema.parse(body);

    // Get return with items
    const returnData = await db
      .select()
      .from(supplierReturns)
      .where(and(eq(supplierReturns.id, id), eq(supplierReturns.workspaceid, workspaceid)))
      .limit(1);

    if (!returnData[0]) {
      return NextResponse.json({ error: 'Supplier return not found' }, { status: 404 });
    }

    const returnItems = await db
      .select()
      .from(supplierReturnItems)
      .where(eq(supplierReturnItems.returnid, id));

    // Process each item: deduct stock, create transaction
    await db.transaction(async (tx) => {
      for (const item of returnItems) {
        if (!item.batchid) continue;

        // Deduct from batch
        const [batch] = await tx
          .select()
          .from(itemBatches)
          .where(eq(itemBatches.id, item.batchid))
          .limit(1);

        if (batch) {
          await tx
            .update(itemBatches)
            .set({
              quantity: batch.quantity - item.quantity,
            })
            .where(eq(itemBatches.id, item.batchid));
        }

        // Deduct from inventory stock
        const [stock] = await tx
          .select()
          .from(inventoryStock)
          .where(and(
            eq(inventoryStock.itemid, item.itemid),
            eq(inventoryStock.batchid, item.batchid)
          ))
          .limit(1);

        if (stock) {
          await tx
            .update(inventoryStock)
            .set({
              quantity: stock.quantity - item.quantity,
              lastupdated: new Date(),
            })
            .where(eq(inventoryStock.id, stock.id));
        }

        // Create stock transaction
        await tx
          .insert(stockTransactions)
          .values({
            itemid: item.itemid,
            warehouseid: '', // Will need to be determined from batch or passed in request
            batchid: item.batchid,
            transactiontype: 'RETURN',
            quantity: -item.quantity,
            referencetype: 'RETURN',
            referenceid: returnData[0].returnnumber,
            notes: validated.notes || `Return ${returnData[0].returnnumber}`,
            createdby: returnData[0].receivedby,
          });
      }

      // Update return status to credited
      await tx
        .update(supplierReturns)
        .set({
          status: 'credited',
          receiveddate: new Date(),
          updatedat: new Date(),
        })
        .where(eq(supplierReturns.id, id));
    });

    const [postedReturn] = await db
      .select()
      .from(supplierReturns)
      .where(eq(supplierReturns.id, id))
      .limit(1);

    return NextResponse.json(postedReturn);
  } catch (error) {
    console.error('Error posting supplier return:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to post supplier return' }, { status: 500 });
  }
}

// DELETE /api/d/[workspaceid]/procurement/returns/[id] - Delete return
export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const { workspaceid, id } = params;

    const [deletedReturn] = await db
      .delete(supplierReturns)
      .where(and(eq(supplierReturns.id, id), eq(supplierReturns.workspaceid, workspaceid)))
      .returning();

    if (!deletedReturn) {
      return NextResponse.json({ error: 'Supplier return not found' }, { status: 404 });
    }

    return NextResponse.json(deletedReturn);
  } catch (error) {
    console.error('Error deleting supplier return:', error);
    return NextResponse.json({ error: 'Failed to delete supplier return' }, { status: 500 });
  }
}

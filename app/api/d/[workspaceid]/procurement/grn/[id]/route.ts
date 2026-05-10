import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { goodsReceiptNotes, grnItems, itemBatches, inventoryStock, stockTransactions, purchaseOrderItems, purchaseOrders } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import type { PostGoodsReceiptRequest } from '@/lib/types/procurement';

// PUT /api/d/[workspaceid]/procurement/grn/[id] - Update GRN
const updateGRNSchema = z.object({
  status: z.enum(['draft', 'pending', 'approved', 'posted', 'cancelled'] as const).optional(),
  invoicenumber: z.string().optional(),
  invoicedate: z.string().optional(),
  receivedby: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const validated = updateGRNSchema.parse(body);

    const updateData: any = {};
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.invoicenumber !== undefined) updateData.invoicenumber = validated.invoicenumber;
    if (validated.invoicedate !== undefined) updateData.invoicedate = new Date(validated.invoicedate);
    if (validated.receivedby !== undefined) updateData.receivedby = validated.receivedby;
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    updateData.updatedat = new Date();

    const [updatedGRN] = await db
      .update(goodsReceiptNotes)
      .set(updateData)
      .where(eq(goodsReceiptNotes.id, id))
      .returning();

    if (!updatedGRN) {
      return NextResponse.json({ error: 'Goods receipt note not found' }, { status: 404 });
    }

    return NextResponse.json(updatedGRN);
  } catch (error) {
    console.error('Error updating goods receipt note:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update goods receipt note' }, { status: 500 });
  }
}

// POST /api/d/[workspaceid]/procurement/grn/[id]/post - Post GRN (update stock)
const postGRNSchema = z.object({
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const validated = postGRNSchema.parse(body);

    // Get GRN with items
    const grn = await db
      .select()
      .from(goodsReceiptNotes)
      .where(eq(goodsReceiptNotes.id, id))
      .limit(1);

    if (!grn[0]) {
      return NextResponse.json({ error: 'Goods receipt note not found' }, { status: 404 });
    }

    const grnItemsList = await db
      .select()
      .from(grnItems)
      .where(eq(grnItems.grnid, id));

    // Process each item: create batch, update stock, create transaction
    await db.transaction(async (tx) => {
      for (const item of grnItemsList) {
        if (!item.itemid || !item.batchnumber) continue;

        // Create or update batch
        const [existingBatch] = await tx
          .select()
          .from(itemBatches)
          .where(and(
            eq(itemBatches.itemid, item.itemid),
            eq(itemBatches.batchnumber, item.batchnumber)
          ))
          .limit(1);

        let batchId: string;
        if (existingBatch) {
          batchId = existingBatch.id;
          await tx
            .update(itemBatches)
            .set({
              quantity: existingBatch.quantity + item.receivedqty,
            })
            .where(eq(itemBatches.id, batchId));
        } else {
          const [newBatch] = await tx
            .insert(itemBatches)
            .values({
              itemid: item.itemid,
              warehouseid: grn[0].warehouseid,
              batchnumber: item.batchnumber,
              quantity: item.receivedqty,
              unitcost: item.unitprice,
              expirydate: item.expirydate,
              manufacturedate: item.manufacturedate,
            })
            .returning();
          batchId = newBatch.id;
        }

        // Update inventory stock
        const [existingStock] = await tx
          .select()
          .from(inventoryStock)
          .where(and(
            eq(inventoryStock.itemid, item.itemid),
            eq(inventoryStock.warehouseid, grn[0].warehouseid!),
            eq(inventoryStock.batchid, batchId)
          ))
          .limit(1);

        if (existingStock) {
          await tx
            .update(inventoryStock)
            .set({
              quantity: existingStock.quantity + item.receivedqty,
              lastupdated: new Date(),
            })
            .where(eq(inventoryStock.id, existingStock.id));
        } else {
          await tx
            .insert(inventoryStock)
            .values({
              itemid: item.itemid,
              warehouseid: grn[0].warehouseid!,
              batchid: batchId,
              quantity: item.receivedqty,
              reservedquantity: 0,
              lastupdated: new Date(),
            });
        }

        // Create stock transaction
        await tx
          .insert(stockTransactions)
          .values({
            itemid: item.itemid,
            warehouseid: grn[0].warehouseid!,
            batchid: batchId,
            transactiontype: 'RECEIPT',
            quantity: item.receivedqty,
            referencetype: 'GRN',
            referenceid: grn[0].grnnumber,
            notes: validated.notes || `GRN ${grn[0].grnnumber}`,
            createdby: grn[0].receivedby,
          });

        // Update PO item received quantity
        if (item.poitemid) {
          await tx
            .update(purchaseOrderItems)
            .set({
              receivedqty: item.receivedqty,
            })
            .where(eq(purchaseOrderItems.id, item.poitemid));
        }
      }

      // Update GRN status to posted
      await tx
        .update(goodsReceiptNotes)
        .set({
          status: 'posted',
          notes: validated.notes || grn[0].notes,
          updatedat: new Date(),
        })
        .where(eq(goodsReceiptNotes.id, id));

      // Update PO status if fully received
      if (grn[0].poid) {
        const poItems = await tx
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.poid, grn[0].poid));

        const allReceived = poItems.every(
          (poi) => poi.receivedqty >= poi.orderedqty
        );

        if (allReceived) {
          await tx
            .update(purchaseOrders)
            .set({
              status: 'delivered',
              updatedat: new Date(),
            })
            .where(eq(purchaseOrders.id, grn[0].poid));
        } else {
          await tx
            .update(purchaseOrders)
            .set({
              status: 'partial',
              updatedat: new Date(),
            })
            .where(eq(purchaseOrders.id, grn[0].poid));
        }
      }
    });

    const [postedGRN] = await db
      .select()
      .from(goodsReceiptNotes)
      .where(eq(goodsReceiptNotes.id, id))
      .limit(1);

    return NextResponse.json(postedGRN);
  } catch (error) {
    console.error('Error posting goods receipt note:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to post goods receipt note' }, { status: 500 });
  }
}

// DELETE /api/d/[workspaceid]/procurement/grn/[id] - Cancel/Delete GRN
export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const { id } = params;

    const [deletedGRN] = await db
      .update(goodsReceiptNotes)
      .set({ 
        status: 'cancelled',
        updatedat: new Date(),
      })
      .where(eq(goodsReceiptNotes.id, id))
      .returning();

    if (!deletedGRN) {
      return NextResponse.json({ error: 'Goods receipt note not found' }, { status: 404 });
    }

    return NextResponse.json(deletedGRN);
  } catch (error) {
    console.error('Error cancelling goods receipt note:', error);
    return NextResponse.json({ error: 'Failed to cancel goods receipt note' }, { status: 500 });
  }
}

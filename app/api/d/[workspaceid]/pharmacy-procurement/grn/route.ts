import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyGoodsReceipt,
  pharmacyGoodsReceiptItems,
  pharmacyClaimDamage,
  pharmacyPurchaseOrders,
  pharmacyPurchaseOrderItems,
  itemBatches,
  inventoryStock,
  stockTransactions,
} from "@/lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;
  const status = req.nextUrl.searchParams.get("status") ?? "";

  try {
    const conditions: any[] = [eq(pharmacyGoodsReceipt.workspaceid, workspaceid)];
    if (status) {
      conditions.push(eq(pharmacyGoodsReceipt.status, status as any));
    }

    const rows = await db
      .select({
        id: pharmacyGoodsReceipt.id,
        receiptnumber: pharmacyGoodsReceipt.receiptnumber,
        orderid: pharmacyGoodsReceipt.orderid,
        ordernumber: pharmacyGoodsReceipt.ordernumber,
        deliverynotenumber: pharmacyGoodsReceipt.deliverynotenumber,
        receivedby: pharmacyGoodsReceipt.receivedby,
        receiptdate: pharmacyGoodsReceipt.receiptdate,
        suppliername: pharmacyGoodsReceipt.suppliername,
        supplieremail: pharmacyGoodsReceipt.supplieremail,
        status: pharmacyGoodsReceipt.status,
        notes: pharmacyGoodsReceipt.notes,
        isreversal: pharmacyGoodsReceipt.isreversal,
        correctiontype: pharmacyGoodsReceipt.correctiontype,
        createdat: pharmacyGoodsReceipt.createdat,
        item_count: sql<number>`(SELECT COUNT(*) FROM pharmacy_goods_receipt_items WHERE receipt_id = ${pharmacyGoodsReceipt.id})::int`,
      })
      .from(pharmacyGoodsReceipt)
      .where(and(...conditions))
      .orderBy(desc(pharmacyGoodsReceipt.createdat));

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("GET /pharmacy-procurement/grn error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;

  try {
    const body = await req.json();
    const {
      orderId,
      orderNumber,
      deliveryNoteNumber,
      receivedBy,
      receiptDate,
      supplierName,
      supplierEmail,
      notes,
      items: grItems,
      warehouseId,
    } = body;

    if (!receivedBy?.trim())
      return NextResponse.json({ error: "Received by is required" }, { status: 400 });
    if (!grItems?.length)
      return NextResponse.json({ error: "No items provided" }, { status: 400 });

    const allComplete = grItems.every(
      (i: any) => parseInt(i.receivedQty) >= parseInt(i.orderedQty || i.receivedQty)
    );
    const anyReceived = grItems.some((i: any) => parseInt(i.receivedQty) > 0);
    const grnStatus = allComplete ? "COMPLETE" : anyReceived ? "PARTIAL" : "PENDING";

    const receiptNum = `PGRN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`;

    const result = await db.transaction(async (tx) => {
      // 1. Insert goods receipt header
      const [receipt] = await tx
        .insert(pharmacyGoodsReceipt)
        .values({
          workspaceid,
          receiptnumber: receiptNum,
          orderid: orderId || null,
          ordernumber: orderNumber || null,
          deliverynotenumber: deliveryNoteNumber || null,
          receivedby: receivedBy,
          receiptdate: receiptDate ? new Date(receiptDate) : new Date(),
          suppliername: supplierName || null,
          supplieremail: supplierEmail || null,
          status: grnStatus as any,
          notes: notes || null,
        })
        .returning();

      const shortItems: any[] = [];
      const extraItems: any[] = [];

      // 2. Process each item
      for (const item of grItems) {
        const receivedQty = parseInt(item.receivedQty) || 0;
        const orderedQty = parseInt(item.orderedQty) || 0;
        const returnClaim = parseInt(item.returnClaim) || 0;

        // Insert receipt item
        await tx.insert(pharmacyGoodsReceiptItems).values({
          receiptid: receipt.id,
          itemid: item.itemId || null,
          itemname: item.itemName || null,
          uom: item.uom || null,
          orderedqty: orderedQty,
          receivedqty: receivedQty,
          returnclaim: returnClaim,
          dnregnum: item.dnRegNum || null,
          unitcost: item.unitCost ? String(item.unitCost) : null,
          batchnumber: item.batchNumber || null,
          lotnumber: item.lotNumber || null,
          expirydate: item.expiryDate ? new Date(item.expiryDate) : null,
          manufacturedate: item.manufactureDate ? new Date(item.manufactureDate) : null,
          notes: item.notes || null,
        });

        // Insert claim/damage if any
        if (returnClaim > 0) {
          await tx.insert(pharmacyClaimDamage).values({
            receiptid: receipt.id,
            itemid: item.itemId || null,
            itemname: item.itemName || null,
            quantity: returnClaim,
            note: item.claimNote || null,
          });
        }

        // Track short/extra
        if (orderedQty > 0 && receivedQty < orderedQty) {
          shortItems.push({ itemName: item.itemName, ordered: orderedQty, received: receivedQty, missing: orderedQty - receivedQty });
        }
        if (orderedQty > 0 && receivedQty > orderedQty) {
          extraItems.push({ itemName: item.itemName, ordered: orderedQty, received: receivedQty, extra: receivedQty - orderedQty });
        }

        // Stock quantity = received minus claimed
        const stockQty = Math.max(0, receivedQty - returnClaim);

        if (stockQty > 0 && item.itemId && warehouseId) {
          // Find or create batch
          const batchNum = item.batchNumber || `AUTO-${Date.now()}`;
          const existingBatches = await tx
            .select()
            .from(itemBatches)
            .where(
              and(
                eq(itemBatches.itemid, item.itemId),
                eq(itemBatches.batchnumber, batchNum)
              )
            )
            .limit(1);

          let batchId: string;
          if (existingBatches.length > 0) {
            batchId = existingBatches[0].id;
            await tx
              .update(itemBatches)
              .set({
                quantity: (existingBatches[0].quantity || 0) + stockQty,
                ...(item.unitprice && { sellingprice: String(item.unitprice) }),
              })
              .where(eq(itemBatches.id, batchId));
          } else {
            const [newBatch] = await tx
              .insert(itemBatches)
              .values({
                itemid: item.itemId,
                warehouseid: warehouseId,
                batchnumber: batchNum,
                quantity: stockQty,
                unitcost: item.unitCost ? String(item.unitCost) : null,
                sellingprice: item.unitprice ? String(item.unitprice) : null,
                expirydate: item.expiryDate ? new Date(item.expiryDate) : null,
                manufacturedate: item.manufactureDate ? new Date(item.manufactureDate) : null,
              })
              .returning();
            batchId = newBatch.id;
          }

          // Find or create inventory stock
          const existingStock = await tx
            .select()
            .from(inventoryStock)
            .where(
              and(
                eq(inventoryStock.itemid, item.itemId),
                eq(inventoryStock.warehouseid, warehouseId),
                eq(inventoryStock.batchid, batchId)
              )
            )
            .limit(1);

          if (existingStock.length > 0) {
            await tx
              .update(inventoryStock)
              .set({
                quantity: (existingStock[0].quantity || 0) + stockQty,
                lastupdated: new Date(),
              })
              .where(eq(inventoryStock.id, existingStock[0].id));
          } else {
            await tx.insert(inventoryStock).values({
              itemid: item.itemId,
              warehouseid: warehouseId,
              batchid: batchId,
              quantity: stockQty,
              reservedquantity: 0,
            });
          }

          // Create stock transaction
          await tx.insert(stockTransactions).values({
            itemid: item.itemId,
            warehouseid: warehouseId,
            batchid: batchId,
            transactiontype: "RECEIPT",
            quantity: stockQty,
            referencetype: "GRN",
            referenceid: receiptNum,
            patientref: null,
            notes: notes || `GRN ${receiptNum}`,
            createdby: receivedBy,
          });
        }
      }

      // 3. Update purchase order status if order-based
      if (orderId) {
        const allOrderItems = await tx
          .select()
          .from(pharmacyPurchaseOrderItems)
          .where(eq(pharmacyPurchaseOrderItems.orderid, orderId));

        // Check if all items fully received across all GRNs
        const allItemsReceived = allOrderItems.every((oi) => {
          const receivedItem = grItems.find((gi: any) => gi.itemId === oi.itemid);
          return receivedItem && parseInt(receivedItem.receivedQty) >= (oi.orderedqty || 0);
        });

        const newOrderStatus = allItemsReceived ? "DELIVERED" : "PARTIALLY_DELIVERED";
        await tx
          .update(pharmacyPurchaseOrders)
          .set({
            status: newOrderStatus as any,
            updatedat: new Date(),
          })
          .where(eq(pharmacyPurchaseOrders.id, orderId));
      }

      return { receipt, grnStatus, shortItems, extraItems };
    });

    return NextResponse.json({
      ...result.receipt,
      status: result.grnStatus,
      shortItems: result.shortItems,
      extraItems: result.extraItems,
    });
  } catch (e: any) {
    console.error("POST /pharmacy-procurement/grn error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

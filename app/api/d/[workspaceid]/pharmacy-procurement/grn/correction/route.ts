import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyGoodsReceipt,
  pharmacyGoodsReceiptItems,
  inventoryStock,
  stockTransactions,
} from "@/lib/db/schema";
import { eq, sql, desc, and, or, ilike } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  const dateFrom = req.nextUrl.searchParams.get("dateFrom") ?? "";
  const dateTo = req.nextUrl.searchParams.get("dateTo") ?? "";

  try {
    const conditions: any[] = [
      eq(pharmacyGoodsReceipt.workspaceid, workspaceid),
      or(
        eq(pharmacyGoodsReceipt.status, "COMPLETE"),
        eq(pharmacyGoodsReceipt.status, "PARTIAL")
      ),
      eq(pharmacyGoodsReceipt.isreversal, false),
    ];

    if (q) {
      conditions.push(
        or(
          ilike(pharmacyGoodsReceipt.receiptnumber, `%${q}%`),
          ilike(pharmacyGoodsReceipt.ordernumber, `%${q}%`),
          ilike(pharmacyGoodsReceipt.suppliername, `%${q}%`)
        )
      );
    }
    if (dateFrom) {
      conditions.push(sql`${pharmacyGoodsReceipt.receiptdate}::date >= ${dateFrom}::date`);
    }
    if (dateTo) {
      conditions.push(sql`${pharmacyGoodsReceipt.receiptdate}::date <= ${dateTo}::date`);
    }

    const rows = await db
      .select({
        id: pharmacyGoodsReceipt.id,
        receiptnumber: pharmacyGoodsReceipt.receiptnumber,
        ordernumber: pharmacyGoodsReceipt.ordernumber,
        suppliername: pharmacyGoodsReceipt.suppliername,
        receiptdate: pharmacyGoodsReceipt.receiptdate,
        status: pharmacyGoodsReceipt.status,
        item_count: sql<number>`(SELECT COUNT(*) FROM pharmacy_goods_receipt_items WHERE receipt_id = ${pharmacyGoodsReceipt.id})::int`,
      })
      .from(pharmacyGoodsReceipt)
      .where(and(...conditions))
      .orderBy(desc(pharmacyGoodsReceipt.createdat))
      .limit(50);

    return NextResponse.json(rows);
  } catch (e: any) {
    console.error("GET correction search error:", e.message);
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
    const { originalReceiptId, correctedBy, reason, items: corrItems, warehouseId } = body;

    if (!originalReceiptId)
      return NextResponse.json({ error: "Original receipt required" }, { status: 400 });
    if (!correctedBy?.trim())
      return NextResponse.json({ error: "Corrected by is required" }, { status: 400 });
    if (!reason?.trim())
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    if (!corrItems?.length)
      return NextResponse.json({ error: "No items provided" }, { status: 400 });

    const [origReceipt] = await db
      .select()
      .from(pharmacyGoodsReceipt)
      .where(eq(pharmacyGoodsReceipt.id, originalReceiptId));

    if (!origReceipt)
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    // Get original receipt items to link corrections
    const origReceiptItems = await db
      .select()
      .from(pharmacyGoodsReceiptItems)
      .where(eq(pharmacyGoodsReceiptItems.receiptid, originalReceiptId));

    const now = Date.now();

    const result = await db.transaction(async (tx) => {
      // 1. Create reversal GR
      const revNum = `PGRN-REV-${now.toString().slice(-8)}`;
      const [reversal] = await tx
        .insert(pharmacyGoodsReceipt)
        .values({
          workspaceid,
          receiptnumber: revNum,
          orderid: origReceipt.orderid,
          ordernumber: origReceipt.ordernumber,
          receivedby: correctedBy,
          receiptdate: new Date(),
          suppliername: origReceipt.suppliername,
          supplieremail: origReceipt.supplieremail,
          status: "CORRECTION",
          notes: `[Reversal] ${reason}`,
          isreversal: true,
          correctionof: originalReceiptId,
          correctionreason: reason,
          correctedby: correctedBy,
          correctiontype: "REVERSAL",
        })
        .returning();

      // 2. Create corrected GR
      const corrNum = `PGRN-COR-${(now + 1).toString().slice(-8)}`;
      const [corrected] = await tx
        .insert(pharmacyGoodsReceipt)
        .values({
          workspaceid,
          receiptnumber: corrNum,
          orderid: origReceipt.orderid,
          ordernumber: origReceipt.ordernumber,
          receivedby: correctedBy,
          receiptdate: new Date(),
          suppliername: origReceipt.suppliername,
          supplieremail: origReceipt.supplieremail,
          status: "CORRECTION",
          notes: `[Correction] ${reason}`,
          isreversal: false,
          correctionof: originalReceiptId,
          correctionreason: reason,
          correctedby: correctedBy,
          correctiontype: "CORRECTED",
        })
        .returning();

      // 3. Process each item
      for (const item of corrItems) {
        const origQty = parseInt(item.originalQty) || 0;
        const corrQty = parseInt(item.correctedQty) || 0;
        const diff = corrQty - origQty;

        // Find the matching original receipt item
        const origReceiptItem = origReceiptItems.find(
          (origItem) => origItem.itemid === item.itemId
        );

        // Insert reversal item with link to original item
        await tx.insert(pharmacyGoodsReceiptItems).values({
          receiptid: reversal.id,
          itemid: item.itemId || null,
          itemname: item.itemName || null,
          uom: item.uom || null,
          orderedqty: origQty,
          receivedqty: -origQty,
          notes: "Reversal of original receipt",
          correctionofitemid: origReceiptItem?.id || null,
        });

        // Insert corrected item with link to original item
        await tx.insert(pharmacyGoodsReceiptItems).values({
          receiptid: corrected.id,
          itemid: item.itemId || null,
          itemname: item.itemName || null,
          uom: item.uom || null,
          orderedqty: origQty,
          receivedqty: corrQty,
          notes: item.itemNote || null,
          correctionofitemid: origReceiptItem?.id || null,
        });

        // Adjust stock by net difference
        if (item.itemId && diff !== 0 && warehouseId) {
          const existingStock = await tx
            .select()
            .from(inventoryStock)
            .where(
              and(
                eq(inventoryStock.itemid, item.itemId),
                eq(inventoryStock.warehouseid, warehouseId)
              )
            )
            .limit(1);

          if (existingStock.length > 0) {
            await tx
              .update(inventoryStock)
              .set({
                quantity: Math.max(0, (existingStock[0].quantity || 0) + diff),
                lastupdated: new Date(),
              })
              .where(eq(inventoryStock.id, existingStock[0].id));
          }

          // Log reversal transaction
          await tx.insert(stockTransactions).values({
            itemid: item.itemId,
            warehouseid: warehouseId,
            transactiontype: "CORRECTION_REVERSAL",
            quantity: -origQty,
            referencetype: "GRN",
            referenceid: revNum,
            createdby: correctedBy,
          });

          // Log correction transaction
          await tx.insert(stockTransactions).values({
            itemid: item.itemId,
            warehouseid: warehouseId,
            transactiontype: "CORRECTION_IN",
            quantity: corrQty,
            referencetype: "GRN",
            referenceid: corrNum,
            createdby: correctedBy,
          });
        }
      }

      return {
        reversalNumber: reversal.receiptnumber,
        correctionNumber: corrected.receiptnumber,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    console.error("POST correction error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

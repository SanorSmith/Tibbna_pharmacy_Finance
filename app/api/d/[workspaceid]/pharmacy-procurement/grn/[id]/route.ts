import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  pharmacyGoodsReceipt,
  pharmacyGoodsReceiptItems,
  pharmacyClaimDamage,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; id: string }> }
) {
  const { id } = await params;
  try {
    const [receipt] = await db
      .select()
      .from(pharmacyGoodsReceipt)
      .where(eq(pharmacyGoodsReceipt.id, id));

    if (!receipt)
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    const receiptItems = await db
      .select()
      .from(pharmacyGoodsReceiptItems)
      .where(eq(pharmacyGoodsReceiptItems.receiptid, id));

    const claims = await db
      .select()
      .from(pharmacyClaimDamage)
      .where(eq(pharmacyClaimDamage.receiptid, id));

    return NextResponse.json({ receipt, items: receiptItems, claims });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

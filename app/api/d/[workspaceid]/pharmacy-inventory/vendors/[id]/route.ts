import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [params.id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching vendor:", error);
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const body = await req.json();
    const {
      name,
      code,
      contactname,
      phone,
      email,
      address,
      country,
      paymentterms,
      currency,
      taxnumber,
      bankName,
      bankAccountNumber,
      bankRoutingNumber,
      bankIban,
      bankSwiftCode,
      website,
      ratingQuality,
      ratingDelivery,
      ratingPricing,
      notes,
      isactive
    } = body;

    const result = await pool.query(
      `UPDATE vendors SET
        name = $1,
        code = $2,
        contactname = $3,
        phone = $4,
        email = $5,
        address = $6,
        country = $7,
        paymentterms = $8,
        currency = $9,
        taxnumber = $10,
        bankname = $11,
        bankaccountnumber = $12,
        bankroutingnumber = $13,
        bankiban = $14,
        bankswiftcode = $15,
        website = $16,
        ratingquality = $17,
        ratingdelivery = $18,
        ratingpricing = $19,
        notes = $20,
        isactive = $21,
        updatedat = NOW()
      WHERE id = $22
      RETURNING *`,
      [
        name,
        code,
        contactname,
        phone,
        email,
        address,
        country,
        paymentterms,
        currency,
        taxnumber,
        bankName,
        bankAccountNumber,
        bankRoutingNumber,
        bankIban,
        bankSwiftCode,
        website,
        ratingQuality,
        ratingDelivery,
        ratingPricing,
        notes,
        isactive,
        params.id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating vendor:", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { workspaceid: string; id: string } }
) {
  try {
    const result = await pool.query(
      'UPDATE vendors SET isactive = false, updatedat = NOW() WHERE id = $1 RETURNING *',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vendor deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting vendor:", error);
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
  }
}

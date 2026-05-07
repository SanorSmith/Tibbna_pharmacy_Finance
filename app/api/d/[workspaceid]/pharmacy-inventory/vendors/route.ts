import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(
  req: NextRequest,
  { params }: { params: { workspaceid: string } }
) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const active = searchParams.get("active") ?? "all";

  try {
    let query = `SELECT * FROM vendors WHERE 1=1`;
    const params: any[] = [];

    if (active === "active") {
      query += ` AND isactive = true`;
    } else if (active === "inactive") {
      query += ` AND isactive = false`;
    }

    if (search) {
      query += ` AND (name ILIKE $1 OR code ILIKE $1 OR contactname ILIKE $1 OR email ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY name`;

    const result = await pool.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching vendors:", error);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceid: string } }
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
      notes
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO vendors (
        name, code, contactname, phone, email, address, country,
        paymentterms, currency, taxnumber,
        bankname, bankaccountnumber, bankroutingnumber, bankiban, bankswiftcode,
        website,
        ratingquality, ratingdelivery, ratingpricing,
        notes, isactive, createdat, updatedat
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16,
        $17, $18, $19,
        $20, true, NOW(), NOW()
      ) RETURNING *`,
      [
        name,
        code || null,
        contactname || null,
        phone || null,
        email || null,
        address || null,
        country || null,
        paymentterms || 30,
        currency || "USD",
        taxnumber || null,
        bankName || null,
        bankAccountNumber || null,
        bankRoutingNumber || null,
        bankIban || null,
        bankSwiftCode || null,
        website || null,
        ratingQuality || 0,
        ratingDelivery || 0,
        ratingPricing || 0,
        notes || null
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error creating vendor:", error);
    return NextResponse.json({ error: "Failed to create vendor", details: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

// Use main database connection for global_drugs table
const globalPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search")?.trim();
    if (!search || search.length < 2) {
      return NextResponse.json([]);
    }

    const result = await globalPool.query(
      `SELECT
        id as drugid,
        name,
        generic_name as genericname,
        atc_code as atccode,
        national_code as nationalcode,
        form,
        strength,
        unit,
        manufacturer,
        description,
        indication,
        interaction,
        warning,
        side_effect as sideeffect,
        storage_type as storagetype,
        traffic,
        pregnancy,
        requires_prescription as requiresprescription,
        is_active as isactive
      FROM global_drugs
      WHERE
        is_active = true
        AND (
          name ILIKE $1
          OR generic_name ILIKE $1
          OR atc_code ILIKE $1
          OR national_code ILIKE $1
        )
      ORDER BY
        CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END,
        name
      LIMIT 20`,
      [`%${search}%`, `${search}%`]
    );

    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("Global drug search error:", err.message);
    return NextResponse.json({ error: "Failed to search drug database" }, { status: 500 });
  }
}

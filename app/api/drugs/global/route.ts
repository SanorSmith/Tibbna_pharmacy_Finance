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

    console.log("[Global Drugs API] Searching for:", search);

    const result = await globalPool.query(
      `SELECT DISTINCT ON (name, form, strength)
        drugid,
        name,
        genericname,
        atccode,
        nationalcode,
        form,
        strength,
        unit,
        category,
        route,
        interaction,
        warning,
        pregnancy,
        sideeffect,
        storagetype,
        indication,
        traffic,
        requiresprescription,
        isactive
      FROM global_drugs
      WHERE
        isactive = true
        AND (
          name ILIKE $1
          OR genericname ILIKE $1
          OR atccode ILIKE $1
          OR nationalcode ILIKE $1
        )
      ORDER BY
        name, form, strength,
        CASE WHEN name ILIKE $2 THEN 0 ELSE 1 END
      LIMIT 20`,
      [`%${search}%`, `${search}%`]
    );

    console.log("[Global Drugs API] Found", result.rows.length, "results");
    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error("[Global Drugs API] Error:", err.message);
    console.error("[Global Drugs API] Full error:", err);
    return NextResponse.json({ error: "Failed to search drug database" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  try {
    const result = await pool.query(
      `SELECT 
        name,
        form,
        strength,
        nationalcode,
        COUNT(*) as drug_count,
        array_agg(drugid) as drug_ids
      FROM global_drugs
      GROUP BY name, form, strength, nationalcode
      HAVING COUNT(*) > 1
      ORDER BY drug_count DESC, name`
    );

    // Also check for NDL code duplicates
    const ndlResult = await pool.query(
      `SELECT 
        nationalcode,
        COUNT(*) as drug_count,
        array_agg(drugid) as drug_ids,
        array_agg(name) as names
      FROM global_drugs
      WHERE nationalcode IS NOT NULL AND nationalcode != ''
      GROUP BY nationalcode
      HAVING COUNT(*) > 1
      ORDER BY drug_count DESC`
    );

    return NextResponse.json({ 
      duplicates: result.rows,
      ndlDuplicates: ndlResult.rows
    });
  } catch (error) {
    console.error('[Global Drugs Duplicates] Error:', error);
    return NextResponse.json({ error: "Failed to fetch duplicates" }, { status: 500 });
  }
}

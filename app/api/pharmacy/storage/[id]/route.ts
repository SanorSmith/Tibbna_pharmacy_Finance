import { Pool } from "pg";
import { NextRequest, NextResponse } from "next/server";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { name, location, type, temperature, notes } = await req.json();
    
    // Convert temperature to boolean
    const isTemperatureControlled = temperature === true || temperature === "true" || temperature === 1;
    
    const r = await pool.query(
      `UPDATE warehouse_sections 
       SET sectionname = COALESCE($1, sectionname),
           bin_location = COALESCE($2, bin_location),
           section_type = COALESCE($3, section_type),
           temperature_controlled = COALESCE($4, temperature_controlled),
           description = COALESCE($5, description)
       WHERE id = $6
       RETURNING id, sectionname as name, bin_location as location, section_type as type, 
                 temperature_controlled, temperature_controlled as temperature, description as notes`,
      [name || null, location || null, type || null, isTemperatureControlled, notes || null, id]
    );
    
    if (!r.rows.length) {
      return NextResponse.json({ error: "Storage location not found" }, { status: 404 });
    }
    
    return NextResponse.json(r.rows[0]);
  } catch (error) {
    console.error("Error updating storage location:", error);
    return NextResponse.json({ error: "Failed to update storage location" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    await pool.query(
      `UPDATE warehouse_sections SET isactive = false WHERE id = $1`,
      [id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting storage location:", error);
    return NextResponse.json({ error: "Failed to delete storage location" }, { status: 500 });
  }
}

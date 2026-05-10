/**
 * Admin API: Cleanup duplicate drugs
 * GET - Preview duplicate drugs
 * DELETE - Merge duplicates (keep the one linked to items, delete others)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugs, items } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total counts
    const workspaceTotalCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM drugs
    `);
    
    const globalTotalCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM global_drugs
    `);

    // Find drugs with duplicate names AND same strength/form in workspace drugs table
    const workspaceDuplicates = await db.execute(sql`
      SELECT 
        'workspace' as source,
        d.workspaceid,
        d.name,
        d.strength,
        d.form,
        COUNT(*) as duplicate_count,
        array_agg(d.drugid::text) as drugids,
        array_agg(d.createdat::text) as created_dates
      FROM drugs d
      GROUP BY d.workspaceid, d.name, d.strength, d.form
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, d.name
    `);

    // Find drugs with duplicate names AND same strength/form in global drugs table
    const globalDuplicates = await db.execute(sql`
      SELECT 
        'global' as source,
        NULL as workspaceid,
        gd.name,
        gd.strength,
        gd.form,
        COUNT(*) as duplicate_count,
        array_agg(gd.drugid::text) as drugids,
        array_agg(gd.createdat::text) as created_dates
      FROM global_drugs gd
      GROUP BY gd.name, gd.strength, gd.form
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, gd.name
    `);

    const duplicates = [...workspaceDuplicates, ...globalDuplicates];
    
    const workspaceTotal = (workspaceTotalCount[0] as any)?.total || 0;
    const globalTotal = (globalTotalCount[0] as any)?.total || 0;

    return NextResponse.json({
      count: duplicates.length,
      duplicates: duplicates,
      workspaceTotal: workspaceTotal,
      globalTotal: globalTotal,
      workspaceDuplicateCount: workspaceDuplicates.length,
      globalDuplicateCount: globalDuplicates.length,
      message: `Found ${duplicates.length} drugs with duplicates (${workspaceDuplicates.length} workspace, ${globalDuplicates.length} global)`
    });
  } catch (error) {
    console.error("Error finding duplicate drugs:", error);
    return NextResponse.json(
      { error: "Failed to find duplicate drugs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let totalDeleted = 0;

    // Find all duplicate drug groups in workspace drugs table
    const workspaceDuplicateGroups = await db.execute(sql`
      SELECT 
        'workspace' as source,
        d.workspaceid,
        d.name,
        d.strength,
        d.form,
        array_agg(d.drugid) as drugids
      FROM drugs d
      GROUP BY d.workspaceid, d.name, d.strength, d.form
      HAVING COUNT(*) > 1
    `);

    // Find all duplicate drug groups in global drugs table
    const globalDuplicateGroups = await db.execute(sql`
      SELECT 
        'global' as source,
        NULL as workspaceid,
        gd.name,
        gd.strength,
        gd.form,
        array_agg(gd.drugid) as drugids
      FROM global_drugs gd
      GROUP BY gd.name, gd.strength, gd.form
      HAVING COUNT(*) > 1
    `);

    // Handle workspace drugs duplicates
    for (const group of workspaceDuplicateGroups as any[]) {
      const drugids = group.drugids;
      
      // For each group, find which drugid is linked to items
      const linkedDrugIds = await db
        .select({ drugid: items.drugid })
        .from(items)
        .where(
          and(
            eq(items.workspaceid, group.workspaceid),
            inArray(items.drugid, drugids)
          )
        )
        .groupBy(items.drugid);

      const linkedIds = linkedDrugIds.map(d => d.drugid).filter(Boolean);
      
      // Keep the first linked drugid, or the first drugid if none are linked
      const keepDrugId = linkedIds.length > 0 ? linkedIds[0] : drugids[0];
      
      // Delete all other drugids in this group
      const toDelete = drugids.filter((id: string) => id !== keepDrugId);
      
      if (toDelete.length > 0) {
        const result = await db
          .delete(drugs)
          .where(inArray(drugs.drugid, toDelete));
        
        totalDeleted += toDelete.length;
        console.log(`[Cleanup] Deleted ${toDelete.length} duplicate workspace drugs for "${group.name}", kept ${keepDrugId}`);
      }
    }

    // Handle global drugs duplicates
    for (const group of globalDuplicateGroups as any[]) {
      const drugids = group.drugids;
      
      // For global drugs, keep the first one (oldest by creation date)
      const keepDrugId = drugids[0];
      const toDelete = drugids.slice(1);
      
      if (toDelete.length > 0) {
        await db.execute(sql`
          DELETE FROM global_drugs WHERE drugid = ANY(${toDelete}::uuid[])
        `);
        
        totalDeleted += toDelete.length;
        console.log(`[Cleanup] Deleted ${toDelete.length} duplicate global drugs for "${group.name}", kept ${keepDrugId}`);
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      message: `Deleted ${totalDeleted} duplicate drug records`
    });
  } catch (error) {
    console.error("Error deleting duplicate drugs:", error);
    return NextResponse.json(
      { error: "Failed to delete duplicate drugs" },
      { status: 500 }
    );
  }
}

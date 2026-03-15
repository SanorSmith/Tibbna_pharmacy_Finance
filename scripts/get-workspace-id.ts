/**
 * Get workspace ID for seeding
 * 
 * Usage: npx tsx scripts/get-workspace-id.ts
 */

import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";

async function getWorkspaceId() {
  console.log("🔍 Fetching workspace IDs...\n");

  const allWorkspaces = await db.select().from(workspaces);

  if (allWorkspaces.length === 0) {
    console.log("❌ No workspaces found in database");
    console.log("Please create a workspace first");
    process.exit(1);
  }

  console.log(`📦 Found ${allWorkspaces.length} workspace(s):\n`);

  allWorkspaces.forEach((ws, index) => {
    console.log(`${index + 1}. ${ws.name || "Unnamed Workspace"}`);
    console.log(`   ID: ${ws.workspaceid}`);
    console.log(`   Created: ${ws.createdat}\n`);
  });

  console.log("💡 To seed NDL medicines, run:");
  console.log(`   npx tsx scripts/seed-ndl-medicines.ts ${allWorkspaces[0].workspaceid}`);
}

getWorkspaceId()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

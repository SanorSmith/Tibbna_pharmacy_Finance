import "dotenv/config";
import postgres from "postgres";

async function main() {
  const client = postgres(`${process.env.DATABASE_URL}?sslmode=require`, { max: 1 });

  // First, delete existing reasons (to avoid duplicates)
  await client`DELETE FROM pos_return_reasons`;
  console.log("Cleared existing return reasons");

  // Now seed for all workspaces
  const result = await client`
    INSERT INTO pos_return_reasons (
      workspaceid, reasoncode, reasonname, reasondescription,
      requiresapproval, allowsexchange, applyrestockingfee, restockingfeepercentage, displayorder
    )
    SELECT 
      w.workspaceid,
      r.reasoncode,
      r.reasonname,
      r.reasondescription,
      r.requiresapproval,
      r.allowsexchange,
      r.applyrestockingfee,
      r.restockingfeepercentage,
      r.displayorder
    FROM workspaces w
    CROSS JOIN (VALUES
      ('DEFECTIVE', 'Defective/Damaged Product', 'Product was defective or damaged on receipt', false, true, false, 0.00, 1),
      ('WRONG_ITEM', 'Wrong Item Dispensed', 'Customer received wrong medication', false, true, false, 0.00, 2),
      ('ALLERGY', 'Allergic Reaction', 'Patient had allergic reaction to medication', false, true, false, 0.00, 3),
      ('EXPIRED', 'Product Expired', 'Product was expired at time of sale', false, false, false, 0.00, 4),
      ('CHANGED_MIND', 'Changed Mind', 'Customer changed mind about purchase', false, true, true, 15.00, 5),
      ('DOCTOR_CHANGED', 'Doctor Changed Prescription', 'Prescriber changed the prescription', false, true, false, 0.00, 6),
      ('DUPLICATE', 'Duplicate Purchase', 'Customer accidentally purchased twice', false, true, false, 0.00, 7),
      ('OTHER', 'Other Reason', 'Other reason for return', true, true, false, 0.00, 8)
    ) AS r(reasoncode, reasonname, reasondescription, requiresapproval, allowsexchange, applyrestockingfee, restockingfeepercentage, displayorder)
    RETURNING workspaceid, reasoncode
  `;

  console.log(`Seeded ${result.length} return reasons across all workspaces`);
  console.log("Sample:", result.slice(0, 3));

  await client.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

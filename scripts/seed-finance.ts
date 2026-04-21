/**
 * Seed Finance Data — COA Template + Fiscal Periods
 *
 * Usage: npx tsx scripts/seed-finance.ts
 *
 * This script:
 * 1. Finds the first workspace in the database
 * 2. Seeds the Healthcare Pharmacy COA template (42 accounts)
 * 3. Generates fiscal periods for current + next year
 * 4. Seeds default tax codes
 */
import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const sql = postgres(url + "?sslmode=require", { max: 1 });

  // ── 1. Find workspace ──────────────────────────────────────
  const workspaces = await sql`SELECT workspaceid, name FROM workspaces LIMIT 5`;
  if (workspaces.length === 0) {
    console.error("No workspaces found in the database");
    await sql.end();
    process.exit(1);
  }

  console.log("Available workspaces:");
  for (const ws of workspaces) {
    console.log(`  - ${ws.workspaceid}  ${ws.name}`);
  }

  const workspace = workspaces[0];
  const wsid = workspace.workspaceid;
  console.log(`\nUsing workspace: ${workspace.name} (${wsid})\n`);

  // ── 2. Find a user for audit trail ─────────────────────────
  const users = await sql`SELECT userid, name FROM users LIMIT 1`;
  if (users.length === 0) {
    console.error("No users found in the database");
    await sql.end();
    process.exit(1);
  }
  const userid = users[0].userid;
  console.log(`Using user: ${users[0].name} (${userid})`);

  // ── 3. Check if COA already seeded ─────────────────────────
  const existing = await sql`SELECT COUNT(*)::int as cnt FROM fin_accounts WHERE workspaceid = ${wsid}`;
  if (existing[0].cnt > 0) {
    console.log(`\n⚠️  COA already has ${existing[0].cnt} accounts. Skipping COA seed.`);
  } else {
    console.log("\n📊 Seeding Chart of Accounts...");
    await seedCOA(sql, wsid, userid);
  }

  // ── 4. Seed fiscal periods ─────────────────────────────────
  const existingPeriods = await sql`SELECT COUNT(*)::int as cnt FROM fin_periods WHERE workspaceid = ${wsid}`;
  if (existingPeriods[0].cnt > 0) {
    console.log(`⚠️  Fiscal periods already exist (${existingPeriods[0].cnt}). Skipping.`);
  } else {
    console.log("📅 Generating fiscal periods...");
    await seedPeriods(sql, wsid);
  }

  // ── 5. Seed default tax codes ──────────────────────────────
  const existingTax = await sql`SELECT COUNT(*)::int as cnt FROM fin_tax_codes WHERE workspaceid = ${wsid}`;
  if (existingTax[0].cnt > 0) {
    console.log(`⚠️  Tax codes already exist (${existingTax[0].cnt}). Skipping.`);
  } else {
    console.log("💰 Seeding default tax codes...");
    await seedTaxCodes(sql, wsid);
  }

  console.log("\n✅ Finance seed complete!");
  await sql.end();
}

// ═══════════════════════════════════════════════════════════════
// COA SEED — Healthcare Pharmacy Template
// ═══════════════════════════════════════════════════════════════
interface COARow {
  code: string;
  name: string;
  type: string;
  subtype: string;
  parentcode: string | null;
  normalbalance: string;
  isgroup: boolean;
  description: string;
}

const COA_TEMPLATE: COARow[] = [
  // ── ASSETS ─────────────────────────────────────────────────
  { code: "1000", name: "Assets", type: "ASSET", subtype: "CURRENT_ASSET", parentcode: null, normalbalance: "DEBIT", isgroup: true, description: "Total assets" },
  { code: "1100", name: "Current Assets", type: "ASSET", subtype: "CURRENT_ASSET", parentcode: "1000", normalbalance: "DEBIT", isgroup: true, description: "Short-term assets" },
  { code: "1111", name: "Cash & Bank", type: "ASSET", subtype: "CASH", parentcode: "1100", normalbalance: "DEBIT", isgroup: false, description: "Cash on hand and bank balances" },
  { code: "1121", name: "Patient Accounts Receivable", type: "ASSET", subtype: "ACCOUNTS_RECEIVABLE", parentcode: "1100", normalbalance: "DEBIT", isgroup: false, description: "Patient AR" },
  { code: "1122", name: "Insurance Accounts Receivable", type: "ASSET", subtype: "ACCOUNTS_RECEIVABLE", parentcode: "1100", normalbalance: "DEBIT", isgroup: false, description: "Insurance AR" },
  { code: "1130", name: "Inventory", type: "ASSET", subtype: "INVENTORY", parentcode: "1100", normalbalance: "DEBIT", isgroup: true, description: "Inventory group" },
  { code: "1131", name: "Drug Inventory", type: "ASSET", subtype: "INVENTORY", parentcode: "1130", normalbalance: "DEBIT", isgroup: false, description: "Pharmaceutical inventory (FIFO)" },
  { code: "1132", name: "Medical Supplies", type: "ASSET", subtype: "INVENTORY", parentcode: "1130", normalbalance: "DEBIT", isgroup: false, description: "Non-drug medical supplies" },
  { code: "1133", name: "Goods Received Not Invoiced", type: "ASSET", subtype: "INVENTORY", parentcode: "1130", normalbalance: "DEBIT", isgroup: false, description: "GRNI accrual account" },
  { code: "1200", name: "Non-Current Assets", type: "ASSET", subtype: "FIXED_ASSET", parentcode: "1000", normalbalance: "DEBIT", isgroup: true, description: "Long-term assets" },
  { code: "1210", name: "Equipment", type: "ASSET", subtype: "FIXED_ASSET", parentcode: "1200", normalbalance: "DEBIT", isgroup: false, description: "Pharmacy equipment" },
  { code: "1220", name: "Accumulated Depreciation", type: "ASSET", subtype: "FIXED_ASSET", parentcode: "1200", normalbalance: "CREDIT", isgroup: false, description: "Contra asset" },

  // ── LIABILITIES ────────────────────────────────────────────
  { code: "2000", name: "Liabilities", type: "LIABILITY", subtype: "CURRENT_LIABILITY", parentcode: null, normalbalance: "CREDIT", isgroup: true, description: "Total liabilities" },
  { code: "2100", name: "Current Liabilities", type: "LIABILITY", subtype: "CURRENT_LIABILITY", parentcode: "2000", normalbalance: "CREDIT", isgroup: true, description: "Short-term liabilities" },
  { code: "2111", name: "Accounts Payable", type: "LIABILITY", subtype: "ACCOUNTS_PAYABLE", parentcode: "2100", normalbalance: "CREDIT", isgroup: false, description: "Supplier AP" },
  { code: "2120", name: "Accrued Expenses", type: "LIABILITY", subtype: "CURRENT_LIABILITY", parentcode: "2100", normalbalance: "CREDIT", isgroup: false, description: "Accrued liabilities" },
  { code: "2130", name: "Tax Payable", type: "LIABILITY", subtype: "TAX_PAYABLE", parentcode: "2100", normalbalance: "CREDIT", isgroup: false, description: "Taxes due" },
  { code: "2140", name: "Employee Payable", type: "LIABILITY", subtype: "CURRENT_LIABILITY", parentcode: "2100", normalbalance: "CREDIT", isgroup: false, description: "Staff salaries payable" },

  // ── EQUITY ─────────────────────────────────────────────────
  { code: "3000", name: "Equity", type: "EQUITY", subtype: "OWNERS_EQUITY", parentcode: null, normalbalance: "CREDIT", isgroup: true, description: "Owner's equity" },
  { code: "3100", name: "Owner's Capital", type: "EQUITY", subtype: "OWNERS_EQUITY", parentcode: "3000", normalbalance: "CREDIT", isgroup: false, description: "Capital invested" },
  { code: "3200", name: "Retained Earnings", type: "EQUITY", subtype: "RETAINED_EARNINGS", parentcode: "3000", normalbalance: "CREDIT", isgroup: false, description: "Accumulated profit" },

  // ── REVENUE ────────────────────────────────────────────────
  { code: "4000", name: "Revenue", type: "REVENUE", subtype: "OPERATING_REVENUE", parentcode: null, normalbalance: "CREDIT", isgroup: true, description: "Total revenue" },
  { code: "4100", name: "Pharmacy Revenue", type: "REVENUE", subtype: "OPERATING_REVENUE", parentcode: "4000", normalbalance: "CREDIT", isgroup: true, description: "Pharmacy sales" },
  { code: "4110", name: "Drug Sales", type: "REVENUE", subtype: "OPERATING_REVENUE", parentcode: "4100", normalbalance: "CREDIT", isgroup: false, description: "OTC and Rx drug sales" },
  { code: "4120", name: "Medical Supplies Sales", type: "REVENUE", subtype: "OPERATING_REVENUE", parentcode: "4100", normalbalance: "CREDIT", isgroup: false, description: "Non-drug product sales" },
  { code: "4130", name: "Pharmaceutical Services", type: "REVENUE", subtype: "OPERATING_REVENUE", parentcode: "4100", normalbalance: "CREDIT", isgroup: false, description: "Compounding, counseling" },
  { code: "4200", name: "Lab Revenue", type: "REVENUE", subtype: "OPERATING_REVENUE", parentcode: "4000", normalbalance: "CREDIT", isgroup: false, description: "Laboratory test revenue" },
  { code: "4300", name: "Other Income", type: "REVENUE", subtype: "OTHER_INCOME", parentcode: "4000", normalbalance: "CREDIT", isgroup: true, description: "Non-operating income" },
  { code: "4310", name: "Discount Received", type: "REVENUE", subtype: "OTHER_INCOME", parentcode: "4300", normalbalance: "CREDIT", isgroup: false, description: "Supplier discounts" },
  { code: "4320", name: "Miscellaneous Income", type: "REVENUE", subtype: "OTHER_INCOME", parentcode: "4300", normalbalance: "CREDIT", isgroup: false, description: "Other income" },

  // ── EXPENSES ───────────────────────────────────────────────
  { code: "5000", name: "Expenses", type: "EXPENSE", subtype: "COST_OF_GOODS_SOLD", parentcode: null, normalbalance: "DEBIT", isgroup: true, description: "Total expenses" },
  { code: "5100", name: "Cost of Goods Sold", type: "EXPENSE", subtype: "COST_OF_GOODS_SOLD", parentcode: "5000", normalbalance: "DEBIT", isgroup: false, description: "Drug COGS (FIFO)" },
  { code: "5200", name: "Staff Expenses", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5000", normalbalance: "DEBIT", isgroup: true, description: "Personnel costs" },
  { code: "5210", name: "Salaries & Wages", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5200", normalbalance: "DEBIT", isgroup: false, description: "Employee salaries" },
  { code: "5220", name: "Staff Benefits", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5200", normalbalance: "DEBIT", isgroup: false, description: "Insurance, pension" },
  { code: "5300", name: "Operating Expenses", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5000", normalbalance: "DEBIT", isgroup: true, description: "Day-to-day costs" },
  { code: "5310", name: "Rent & Utilities", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5300", normalbalance: "DEBIT", isgroup: false, description: "Facility costs" },
  { code: "5320", name: "Inventory Write-off", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5300", normalbalance: "DEBIT", isgroup: false, description: "Expired/damaged stock" },
  { code: "5330", name: "Depreciation Expense", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5300", normalbalance: "DEBIT", isgroup: false, description: "Asset depreciation" },
  { code: "5340", name: "Professional Fees", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5300", normalbalance: "DEBIT", isgroup: false, description: "Legal, accounting, consulting" },
  { code: "5350", name: "Marketing & Advertising", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5300", normalbalance: "DEBIT", isgroup: false, description: "Promotional expenses" },
  { code: "5360", name: "Miscellaneous Expense", type: "EXPENSE", subtype: "OPERATING_EXPENSE", parentcode: "5300", normalbalance: "DEBIT", isgroup: false, description: "Other expenses" },
];

async function seedCOA(
  sql: postgres.Sql,
  wsid: string,
  userid: string
) {
  // First pass: insert all accounts (parents first due to ordering)
  const accountMap = new Map<string, string>(); // code -> accountid

  for (const row of COA_TEMPLATE) {
    const parentid = row.parentcode ? accountMap.get(row.parentcode) ?? null : null;
    const level = row.parentcode
      ? (COA_TEMPLATE.findIndex((r) => r.code === row.parentcode) >= 0
          ? getLevel(row.code, COA_TEMPLATE)
          : 1)
      : 1;

    const result = await sql`
      INSERT INTO fin_accounts (workspaceid, accountcode, accountname, accounttype, accountsubtype, parentaccountid, level, isgroupaccount, normalbalance, description, createdby)
      VALUES (${wsid}, ${row.code}, ${row.name}, ${row.type}, ${row.subtype}, ${parentid}, ${level}, ${row.isgroup}, ${row.normalbalance}, ${row.description}, ${userid})
      RETURNING accountid
    `;
    accountMap.set(row.code, result[0].accountid);
  }

  console.log(`  ✅ Inserted ${accountMap.size} accounts`);
}

function getLevel(code: string, template: COARow[]): number {
  const row = template.find((r) => r.code === code);
  if (!row || !row.parentcode) return 1;
  return 1 + getLevel(row.parentcode, template);
}

// ═══════════════════════════════════════════════════════════════
// FISCAL PERIODS — Current year + next year
// ═══════════════════════════════════════════════════════════════
async function seedPeriods(sql: postgres.Sql, wsid: string) {
  const currentYear = new Date().getFullYear();
  let count = 0;

  for (const year of [currentYear, currentYear + 1]) {
    for (let month = 1; month <= 12; month++) {
      const mm = String(month).padStart(2, "0");
      const startDate = `${year}-${mm}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // last day

      await sql`
        INSERT INTO fin_periods (workspaceid, periodcode, periodname, periodtype, startdate, enddate, fiscalyear, status)
        VALUES (${wsid}, ${`${year}-${mm}`}, ${`${getMonthName(month)} ${year}`}, 'MONTH', ${startDate}, ${endDate}, ${year}, 'OPEN')
      `;
      count++;
    }
  }

  console.log(`  ✅ Generated ${count} fiscal periods (${currentYear}–${currentYear + 1})`);
}

function getMonthName(month: number): string {
  return [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][month];
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT TAX CODES
// ═══════════════════════════════════════════════════════════════
async function seedTaxCodes(sql: postgres.Sql, wsid: string) {
  const defaults = [
    { code: "EXEMPT", name: "Tax Exempt", rate: "0", taxtype: "EXEMPT" },
    { code: "ZERO", name: "Zero Rate", rate: "0", taxtype: "VAT" },
  ];

  for (const tc of defaults) {
    await sql`
      INSERT INTO fin_tax_codes (workspaceid, code, name, rate, taxtype, isinclusive, effectivefrom, isactive)
      VALUES (${wsid}, ${tc.code}, ${tc.name}, ${tc.rate}, ${tc.taxtype}, false, '2020-01-01', true)
    `;
  }

  console.log(`  ✅ Inserted ${defaults.length} default tax codes`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

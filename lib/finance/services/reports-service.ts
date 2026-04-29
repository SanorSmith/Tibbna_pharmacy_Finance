/**
 * Finance Module — Financial Reports Service
 *
 * Trial Balance, Income Statement (P&L), Balance Sheet, Dashboard KPIs.
 * All reports derive from fin_account_balances and fin_journal_lines.
 */
import { db } from "@/lib/db";
import { finAccountBalances } from "@/lib/db/tables/finance-balances";
import { finAccounts } from "@/lib/db/tables/finance-accounts";
import { finPeriods } from "@/lib/db/tables/finance-periods";
import { finArTransactions } from "@/lib/db/tables/finance-ar";
import { finApInvoices } from "@/lib/db/tables/finance-ap";
import { eq, and, sql, lte, gte, asc } from "drizzle-orm";
import type {
  TrialBalanceReport,
  IncomeStatementReport,
  BalanceSheetReport,
  FinanceDashboardKPIs,
} from "../types";

// ── Trial Balance ────────────────────────────────────────────────
export async function getTrialBalance(
  workspaceid: string,
  periodid: string
): Promise<TrialBalanceReport> {
  // Get period info
  const [period] = await db
    .select()
    .from(finPeriods)
    .where(eq(finPeriods.periodid, periodid))
    .limit(1);

  if (!period) throw new Error("Period not found");

  // Get all balances for this period with account info
  const rows = await db
    .select({
      accountcode: finAccounts.accountcode,
      accountname: finAccounts.accountname,
      accounttype: finAccounts.accounttype,
      normalbalance: finAccounts.normalbalance,
      closingdebit: finAccountBalances.closingdebit,
      closingcredit: finAccountBalances.closingcredit,
    })
    .from(finAccountBalances)
    .innerJoin(
      finAccounts,
      eq(finAccounts.accountid, finAccountBalances.accountid)
    )
    .where(eq(finAccountBalances.periodid, periodid))
    .orderBy(asc(finAccounts.accountcode));

  let totaldebit = 0;
  let totalcredit = 0;

  const accounts = rows.map((r) => {
    const closingDebit = parseFloat(r.closingdebit);
    const closingCredit = parseFloat(r.closingcredit);
    const net = closingDebit - closingCredit;

    let debitbalance = 0;
    let creditbalance = 0;

    if (net > 0) {
      debitbalance = net;
    } else if (net < 0) {
      creditbalance = Math.abs(net);
    }

    totaldebit += debitbalance;
    totalcredit += creditbalance;

    return {
      accountcode: r.accountcode,
      accountname: r.accountname,
      accounttype: r.accounttype,
      debitbalance,
      creditbalance,
    };
  });

  return {
    period: {
      periodcode: period.periodcode,
      periodname: period.periodname,
    },
    accounts: accounts.filter(
      (a) => a.debitbalance !== 0 || a.creditbalance !== 0
    ),
    totals: {
      totaldebit: Math.round(totaldebit * 100) / 100,
      totalcredit: Math.round(totalcredit * 100) / 100,
      isbalanced: Math.abs(totaldebit - totalcredit) < 0.01,
    },
  };
}

// ── Income Statement (P&L) ───────────────────────────────────────
export async function getIncomeStatement(
  workspaceid: string,
  periodid: string
): Promise<IncomeStatementReport> {
  const [period] = await db
    .select()
    .from(finPeriods)
    .where(eq(finPeriods.periodid, periodid))
    .limit(1);

  if (!period) throw new Error("Period not found");

  // Get period balances for revenue and expense accounts
  const rows = await db
    .select({
      accountcode: finAccounts.accountcode,
      accountname: finAccounts.accountname,
      accounttype: finAccounts.accounttype,
      accountsubtype: finAccounts.accountsubtype,
      isgroupaccount: finAccounts.isgroupaccount,
      perioddebit: finAccountBalances.perioddebit,
      periodcredit: finAccountBalances.periodcredit,
    })
    .from(finAccountBalances)
    .innerJoin(
      finAccounts,
      eq(finAccounts.accountid, finAccountBalances.accountid)
    )
    .where(
      and(
        eq(finAccountBalances.periodid, periodid),
        eq(finAccounts.workspaceid, workspaceid)
      )
    )
    .orderBy(asc(finAccounts.accountcode));

  // Separate into categories
  const revenueAccounts: { accountcode: string; accountname: string; amount: number }[] = [];
  const cogsAccounts: { accountcode: string; accountname: string; amount: number }[] = [];
  const expenseAccounts: { accountcode: string; accountname: string; amount: number }[] = [];

  for (const row of rows) {
    if (row.isgroupaccount) continue;

    const periodDebit = parseFloat(row.perioddebit);
    const periodCredit = parseFloat(row.periodcredit);

    if (row.accounttype === "REVENUE") {
      const amount = periodCredit - periodDebit; // Revenue = credits
      if (amount !== 0) {
        revenueAccounts.push({
          accountcode: row.accountcode,
          accountname: row.accountname,
          amount,
        });
      }
    } else if (row.accounttype === "EXPENSE") {
      const amount = periodDebit - periodCredit; // Expense = debits
      if (amount !== 0) {
        if (row.accountsubtype === "COGS") {
          cogsAccounts.push({
            accountcode: row.accountcode,
            accountname: row.accountname,
            amount,
          });
        } else {
          expenseAccounts.push({
            accountcode: row.accountcode,
            accountname: row.accountname,
            amount,
          });
        }
      }
    }
  }

  const revenueTotal = revenueAccounts.reduce((s, a) => s + a.amount, 0);
  const cogsTotal = cogsAccounts.reduce((s, a) => s + a.amount, 0);
  const expenseTotal = expenseAccounts.reduce((s, a) => s + a.amount, 0);
  const grossProfit = revenueTotal - cogsTotal;
  const netProfit = grossProfit - expenseTotal;

  return {
    period: { from: period.startdate, to: period.enddate },
    revenue: { accounts: revenueAccounts, total: revenueTotal },
    cogs: { accounts: cogsAccounts, total: cogsTotal },
    grossProfit,
    grossMarginPercent: revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0,
    expenses: { accounts: expenseAccounts, total: expenseTotal },
    netProfit,
    netMarginPercent: revenueTotal > 0 ? (netProfit / revenueTotal) * 100 : 0,
  };
}

// ── Balance Sheet ────────────────────────────────────────────────
export async function getBalanceSheet(
  workspaceid: string,
  periodid: string
): Promise<BalanceSheetReport> {
  const [period] = await db
    .select()
    .from(finPeriods)
    .where(eq(finPeriods.periodid, periodid))
    .limit(1);

  if (!period) throw new Error("Period not found");

  const rows = await db
    .select({
      accountcode: finAccounts.accountcode,
      accountname: finAccounts.accountname,
      accounttype: finAccounts.accounttype,
      accountsubtype: finAccounts.accountsubtype,
      isgroupaccount: finAccounts.isgroupaccount,
      normalbalance: finAccounts.normalbalance,
      closingdebit: finAccountBalances.closingdebit,
      closingcredit: finAccountBalances.closingcredit,
    })
    .from(finAccountBalances)
    .innerJoin(
      finAccounts,
      eq(finAccounts.accountid, finAccountBalances.accountid)
    )
    .where(
      and(
        eq(finAccountBalances.periodid, periodid),
        eq(finAccounts.workspaceid, workspaceid)
      )
    )
    .orderBy(asc(finAccounts.accountcode));

  const currentAssets: { accountcode: string; accountname: string; balance: number }[] = [];
  const fixedAssets: { accountcode: string; accountname: string; balance: number }[] = [];
  const currentLiabilities: { accountcode: string; accountname: string; balance: number }[] = [];
  const longTermLiabilities: { accountcode: string; accountname: string; balance: number }[] = [];
  const equityAccounts: { accountcode: string; accountname: string; balance: number }[] = [];

  for (const row of rows) {
    if (row.isgroupaccount) continue;

    const closingDebit = parseFloat(row.closingdebit);
    const closingCredit = parseFloat(row.closingcredit);
    const net = closingDebit - closingCredit;
    // Assets have debit balance (positive net), L/E have credit balance (negative net)
    const balance = row.normalbalance === "DEBIT" ? net : -net;

    if (balance === 0) continue;

    const entry = { accountcode: row.accountcode, accountname: row.accountname, balance };

    switch (row.accounttype) {
      case "ASSET":
        if (
          row.accountsubtype === "FIXED_ASSET" ||
          row.accountsubtype === "ACCUMULATED_DEPRECIATION"
        ) {
          fixedAssets.push(entry);
        } else {
          currentAssets.push(entry);
        }
        break;
      case "LIABILITY":
        if (row.accountsubtype === "LONG_TERM_LIABILITY") {
          longTermLiabilities.push(entry);
        } else {
          currentLiabilities.push(entry);
        }
        break;
      case "EQUITY":
        equityAccounts.push(entry);
        break;
    }
  }

  const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.balance, 0);
  const totalFixedAssets = fixedAssets.reduce((s, a) => s + a.balance, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiab = currentLiabilities.reduce((s, a) => s + a.balance, 0);
  const totalLongTermLiab = longTermLiabilities.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = totalCurrentLiab + totalLongTermLiab;

  const totalEquity = equityAccounts.reduce((s, a) => s + a.balance, 0);
  const totalLiabAndEquity = totalLiabilities + totalEquity;

  return {
    asOfDate: period.enddate,
    assets: {
      currentAssets: { accounts: currentAssets, total: totalCurrentAssets },
      fixedAssets: { accounts: fixedAssets, total: totalFixedAssets },
      totalAssets,
    },
    liabilities: {
      currentLiabilities: { accounts: currentLiabilities, total: totalCurrentLiab },
      longTermLiabilities: { accounts: longTermLiabilities, total: totalLongTermLiab },
      totalLiabilities,
    },
    equity: {
      accounts: equityAccounts,
      total: totalEquity,
      totalEquity,
    },
    totalLiabilitiesAndEquity: totalLiabAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabAndEquity) < 0.01,
  };
}

// ── Dashboard KPIs ───────────────────────────────────────────────
export async function getFinanceDashboard(
  workspaceid: string
): Promise<FinanceDashboardKPIs> {
  // Find current open period
  const today = new Date().toISOString().split("T")[0];
  const [currentPeriod] = await db
    .select()
    .from(finPeriods)
    .where(
      and(
        eq(finPeriods.workspaceid, workspaceid),
        lte(finPeriods.startdate, today),
        gte(finPeriods.enddate, today)
      )
    )
    .limit(1);

  if (!currentPeriod) {
    return {
      currentPeriod: "N/A",
      revenueMTD: 0, cogsMTD: 0, grossMarginPercent: 0, netProfitMTD: 0,
      cashBalance: 0, arOutstanding: 0, apOutstanding: 0,
      inventoryValue: 0, overdueAR: 0, overdueAP: 0,
    };
  }

  // Get P&L for current period
  let revenueMTD = 0, cogsMTD = 0, expensesMTD = 0;

  const balances = await db
    .select({
      accounttype: finAccounts.accounttype,
      accountsubtype: finAccounts.accountsubtype,
      isgroupaccount: finAccounts.isgroupaccount,
      normalbalance: finAccounts.normalbalance,
      perioddebit: finAccountBalances.perioddebit,
      periodcredit: finAccountBalances.periodcredit,
      closingdebit: finAccountBalances.closingdebit,
      closingcredit: finAccountBalances.closingcredit,
      accountcode: finAccounts.accountcode,
    })
    .from(finAccountBalances)
    .innerJoin(finAccounts, eq(finAccounts.accountid, finAccountBalances.accountid))
    .where(
      and(
        eq(finAccountBalances.periodid, currentPeriod.periodid),
        eq(finAccounts.workspaceid, workspaceid)
      )
    );

  let cashBalance = 0;
  let inventoryValue = 0;
  let arOutstanding = 0;
  let apOutstanding = 0;

  for (const b of balances) {
    if (b.isgroupaccount) continue;

    const pDebit = parseFloat(b.perioddebit);
    const pCredit = parseFloat(b.periodcredit);
    const cDebit = parseFloat(b.closingdebit);
    const cCredit = parseFloat(b.closingcredit);
    const closingNet = cDebit - cCredit;

    if (b.accounttype === "REVENUE") {
      revenueMTD += pCredit - pDebit;
    } else if (b.accounttype === "EXPENSE") {
      if (b.accountsubtype === "COGS") {
        cogsMTD += pDebit - pCredit;
      } else {
        expensesMTD += pDebit - pCredit;
      }
    }

    // Balance sheet items from closing balances
    if (b.accountcode.startsWith("111")) { // Cash & Bank accounts
      cashBalance += closingNet;
    }
    if (b.accountcode.startsWith("112")) { // AR accounts
      arOutstanding += closingNet;
    }
    if (b.accountcode.startsWith("113")) { // Inventory accounts
      inventoryValue += closingNet;
    }
    if (b.accountcode.startsWith("211")) { // AP accounts
      apOutstanding += Math.abs(closingNet);
    }
  }

  const grossProfit = revenueMTD - cogsMTD;
  const netProfitMTD = grossProfit - expensesMTD;

  // Get overdue AR (transactions older than 30 days with positive balance)
  const [arOverdue] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(debitamount AS numeric) - CAST(creditamount AS numeric)), 0)`,
    })
    .from(finArTransactions)
    .where(
      and(
        eq(finArTransactions.workspaceid, workspaceid),
        sql`transactiondate < NOW() - INTERVAL '30 days'`
      )
    );

  // Get overdue AP
  const [apOverdue] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(balancedue AS numeric)), 0)`,
    })
    .from(finApInvoices)
    .where(
      and(
        eq(finApInvoices.workspaceid, workspaceid),
        sql`duedate < NOW()::date`,
        sql`CAST(balancedue AS numeric) > 0`
      )
    );

  return {
    currentPeriod: currentPeriod.periodcode,
    revenueMTD: Math.round(revenueMTD * 100) / 100,
    cogsMTD: Math.round(cogsMTD * 100) / 100,
    grossMarginPercent: revenueMTD > 0
      ? Math.round((grossProfit / revenueMTD) * 10000) / 100
      : 0,
    netProfitMTD: Math.round(netProfitMTD * 100) / 100,
    cashBalance: Math.round(cashBalance * 100) / 100,
    arOutstanding: Math.round(arOutstanding * 100) / 100,
    apOutstanding: Math.round(apOutstanding * 100) / 100,
    inventoryValue: Math.round(inventoryValue * 100) / 100,
    overdueAR: parseFloat(arOverdue?.total ?? "0"),
    overdueAP: parseFloat(apOverdue?.total ?? "0"),
  };
}

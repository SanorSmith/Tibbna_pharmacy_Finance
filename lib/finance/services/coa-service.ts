/**
 * Finance Module — Chart of Accounts Service
 *
 * Business logic for COA management: CRUD, hierarchy, seeding.
 * All methods are workspace-scoped.
 */
import { db } from "@/lib/db";
import { finAccounts, type FinAccount, type NewFinAccount } from "@/lib/db/tables/finance-accounts";
import { finAuditLog } from "@/lib/db/tables/finance-audit";
import { eq, and, asc, isNull } from "drizzle-orm";
import { HEALTHCARE_PHARMACY_COA } from "../coa-template";
import type { CreateAccountInput, UpdateAccountInput } from "../validation";
import { FinanceError } from "../errors";

// ── Create Account ───────────────────────────────────────────────
export async function createAccount(
  workspaceid: string,
  input: CreateAccountInput,
  userid: string
): Promise<FinAccount> {
  // Calculate level from parent
  let level = 1;
  let parentaccountid: string | null = null;

  if (input.parentaccountid) {
    const parent = await getAccountById(workspaceid, input.parentaccountid);
    if (!parent) {
      throw new FinanceError("ACCOUNT_NOT_FOUND", "Parent account not found");
    }
    level = parent.level + 1;
    parentaccountid = parent.accountid;
  }

  // Check for duplicate code in workspace
  const existing = await getAccountByCode(workspaceid, input.accountcode);
  if (existing) {
    throw new FinanceError(
      "DUPLICATE_CONFLICT",
      `Account code '${input.accountcode}' already exists in this workspace`
    );
  }

  const [account] = await db
    .insert(finAccounts)
    .values({
      workspaceid,
      accountcode: input.accountcode,
      accountname: input.accountname,
      accounttype: input.accounttype,
      accountsubtype: input.accountsubtype ?? null,
      parentaccountid,
      level,
      isgroupaccount: input.isgroupaccount,
      normalbalance: input.normalbalance,
      description: input.description ?? null,
      createdby: userid,
    })
    .returning();

  // Audit
  await logAudit(workspaceid, account.accountid, "INSERT", userid, null, account);

  return account;
}

// ── Get Account by ID ────────────────────────────────────────────
export async function getAccountById(
  workspaceid: string,
  accountid: string
): Promise<FinAccount | null> {
  const [account] = await db
    .select()
    .from(finAccounts)
    .where(
      and(
        eq(finAccounts.workspaceid, workspaceid),
        eq(finAccounts.accountid, accountid)
      )
    )
    .limit(1);

  return account ?? null;
}

// ── Get Account by Code ──────────────────────────────────────────
export async function getAccountByCode(
  workspaceid: string,
  accountcode: string
): Promise<FinAccount | null> {
  const [account] = await db
    .select()
    .from(finAccounts)
    .where(
      and(
        eq(finAccounts.workspaceid, workspaceid),
        eq(finAccounts.accountcode, accountcode)
      )
    )
    .limit(1);

  return account ?? null;
}

// ── List Accounts ────────────────────────────────────────────────
export async function listAccounts(
  workspaceid: string,
  filters?: {
    accounttype?: string;
    isactive?: boolean;
  }
): Promise<FinAccount[]> {
  const conditions = [eq(finAccounts.workspaceid, workspaceid)];

  if (filters?.accounttype) {
    conditions.push(
      eq(finAccounts.accounttype, filters.accounttype as FinAccount["accounttype"])
    );
  }

  if (filters?.isactive !== undefined) {
    conditions.push(eq(finAccounts.isactive, filters.isactive));
  }

  return db
    .select()
    .from(finAccounts)
    .where(and(...conditions))
    .orderBy(asc(finAccounts.accountcode));
}

// ── Get Account Hierarchy (tree) ─────────────────────────────────
export async function getAccountHierarchy(
  workspaceid: string
): Promise<(FinAccount & { children?: FinAccount[] })[]> {
  const allAccounts = await listAccounts(workspaceid);

  // Build tree from flat list
  const accountMap = new Map<string, FinAccount & { children: FinAccount[] }>();
  const roots: (FinAccount & { children: FinAccount[] })[] = [];

  for (const account of allAccounts) {
    accountMap.set(account.accountid, { ...account, children: [] });
  }

  for (const account of allAccounts) {
    const node = accountMap.get(account.accountid)!;
    if (account.parentaccountid) {
      const parent = accountMap.get(account.parentaccountid);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ── Update Account ───────────────────────────────────────────────
export async function updateAccount(
  workspaceid: string,
  accountid: string,
  input: UpdateAccountInput,
  userid: string
): Promise<FinAccount> {
  const existing = await getAccountById(workspaceid, accountid);
  if (!existing) {
    throw new FinanceError("NOT_FOUND", "Account not found");
  }

  const updateData: Partial<NewFinAccount> = {
    updatedat: new Date(),
  };

  if (input.accountname !== undefined) updateData.accountname = input.accountname;
  if (input.accountsubtype !== undefined) updateData.accountsubtype = input.accountsubtype;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.isactive !== undefined) updateData.isactive = input.isactive;
  if (input.normalbalance !== undefined) updateData.normalbalance = input.normalbalance;
  if (input.isgroupaccount !== undefined) updateData.isgroupaccount = input.isgroupaccount;

  const [updated] = await db
    .update(finAccounts)
    .set(updateData)
    .where(
      and(
        eq(finAccounts.workspaceid, workspaceid),
        eq(finAccounts.accountid, accountid)
      )
    )
    .returning();

  // Audit
  await logAudit(workspaceid, accountid, "UPDATE", userid, existing, updated);

  return updated;
}

// ── Deactivate Account ───────────────────────────────────────────
export async function deactivateAccount(
  workspaceid: string,
  accountid: string,
  userid: string
): Promise<void> {
  await updateAccount(workspaceid, accountid, { isactive: false }, userid);
}

// ── Seed COA from Template ───────────────────────────────────────
export async function seedCOA(
  workspaceid: string,
  userid: string
): Promise<{ accountsCreated: number }> {
  // Check if workspace already has accounts
  const existingAccounts = await db
    .select()
    .from(finAccounts)
    .where(eq(finAccounts.workspaceid, workspaceid))
    .limit(1);

  if (existingAccounts.length > 0) {
    throw new FinanceError(
      "DUPLICATE_CONFLICT",
      "Workspace already has Chart of Accounts. Cannot seed again."
    );
  }

  // Insert all template accounts in order (parents first)
  // Build a code→id map as we insert so child accounts can reference parents
  const codeToId = new Map<string, string>();
  let count = 0;

  for (const tpl of HEALTHCARE_PHARMACY_COA) {
    let parentaccountid: string | null = null;
    if (tpl.parentcode) {
      parentaccountid = codeToId.get(tpl.parentcode) ?? null;
    }

    // Calculate level
    let level = 1;
    if (tpl.parentcode) {
      const parentLevel = HEALTHCARE_PHARMACY_COA.find(
        (a) => a.accountcode === tpl.parentcode
      );
      if (parentLevel) {
        // Count depth by walking parent chain
        let depth = 1;
        let currentParent = parentLevel.parentcode;
        while (currentParent) {
          depth++;
          const p = HEALTHCARE_PHARMACY_COA.find(
            (a) => a.accountcode === currentParent
          );
          currentParent = p?.parentcode ?? null;
        }
        level = depth + 1;
      }
    }

    const [inserted] = await db
      .insert(finAccounts)
      .values({
        workspaceid,
        accountcode: tpl.accountcode,
        accountname: tpl.accountname,
        accounttype: tpl.accounttype,
        accountsubtype: tpl.accountsubtype ?? null,
        parentaccountid,
        level,
        isgroupaccount: tpl.isgroupaccount,
        normalbalance: tpl.normalbalance,
        description: tpl.description ?? null,
        createdby: userid,
      })
      .returning();

    codeToId.set(tpl.accountcode, inserted.accountid);
    count++;
  }

  return { accountsCreated: count };
}

// ── Audit Helper ─────────────────────────────────────────────────
async function logAudit(
  workspaceid: string,
  recordid: string,
  action: "INSERT" | "UPDATE" | "REVERSE",
  userid: string,
  beforedata: unknown,
  afterdata: unknown
): Promise<void> {
  try {
    await db.insert(finAuditLog).values({
      workspaceid,
      tablename: "fin_accounts",
      recordid,
      action,
      userid,
      beforedata: beforedata as Record<string, unknown> | null,
      afterdata: afterdata as Record<string, unknown>,
    });
  } catch (err) {
    console.error("[Finance Audit] Failed to log:", err);
  }
}

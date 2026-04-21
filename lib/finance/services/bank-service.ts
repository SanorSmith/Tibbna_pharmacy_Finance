/**
 * Finance Module — Bank & Cash Account Service
 *
 * CRUD for bank/cash accounts linked to GL accounts.
 */
import { db } from "@/lib/db";
import {
  finBankAccounts,
  type FinBankAccount,
} from "@/lib/db/tables/finance-bank";
import { eq, and, asc } from "drizzle-orm";
import { FinanceError } from "../errors";
import type { CreateBankAccountInput } from "../validation";

// ── Create Bank Account ──────────────────────────────────────────
export async function createBankAccount(
  workspaceid: string,
  input: CreateBankAccountInput
): Promise<FinBankAccount> {
  const [account] = await db
    .insert(finBankAccounts)
    .values({
      workspaceid,
      accountname: input.accountname,
      bankname: input.bankname ?? null,
      accountnumber: input.accountnumber ?? null,
      accounttype: input.accounttype,
      currencycode: input.currencycode,
      glaccountid: input.glaccountid,
    })
    .returning();

  return account;
}

// ── List Bank Accounts ───────────────────────────────────────────
export async function listBankAccounts(
  workspaceid: string
): Promise<FinBankAccount[]> {
  return db
    .select()
    .from(finBankAccounts)
    .where(
      and(
        eq(finBankAccounts.workspaceid, workspaceid),
        eq(finBankAccounts.isactive, true)
      )
    )
    .orderBy(asc(finBankAccounts.accountname));
}

// ── Get Bank Account by ID ───────────────────────────────────────
export async function getBankAccountById(
  workspaceid: string,
  bankaccountid: string
): Promise<FinBankAccount | null> {
  const [account] = await db
    .select()
    .from(finBankAccounts)
    .where(
      and(
        eq(finBankAccounts.workspaceid, workspaceid),
        eq(finBankAccounts.bankaccountid, bankaccountid)
      )
    )
    .limit(1);
  return account ?? null;
}

// ── Update Bank Account ──────────────────────────────────────────
export async function updateBankAccount(
  workspaceid: string,
  bankaccountid: string,
  updates: Partial<Pick<FinBankAccount, "accountname" | "bankname" | "accountnumber" | "isactive">>
): Promise<FinBankAccount> {
  const existing = await getBankAccountById(workspaceid, bankaccountid);
  if (!existing) {
    throw new FinanceError("NOT_FOUND", "Bank account not found");
  }

  const [updated] = await db
    .update(finBankAccounts)
    .set({ ...updates, updatedat: new Date() })
    .where(
      and(
        eq(finBankAccounts.workspaceid, workspaceid),
        eq(finBankAccounts.bankaccountid, bankaccountid)
      )
    )
    .returning();

  return updated;
}

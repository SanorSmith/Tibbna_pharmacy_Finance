/**
 * Finance Module — Tax Calculation Service
 *
 * Tax code CRUD and tax amount calculation.
 * Default: 0% for Iraq (EXEMPT). Configurable per workspace.
 */
import { db } from "@/lib/db";
import { finTaxCodes, type FinTaxCode } from "@/lib/db/tables/finance-tax";
import { eq, and, lte, sql, asc } from "drizzle-orm";
import { FinanceError } from "../errors";
import type { CreateTaxCodeInput } from "../validation";

// ── Create Tax Code ──────────────────────────────────────────────
export async function createTaxCode(
  workspaceid: string,
  input: CreateTaxCodeInput
): Promise<FinTaxCode> {
  const [taxCode] = await db
    .insert(finTaxCodes)
    .values({
      workspaceid,
      code: input.code,
      name: input.name,
      rate: input.rate.toFixed(2),
      taxtype: input.taxtype,
      isinclusive: input.isinclusive,
      glaccountid: input.glaccountid ?? null,
      effectivefrom: input.effectivefrom,
      effectiveto: input.effectiveto ?? null,
    })
    .returning();

  return taxCode;
}

// ── List Tax Codes ───────────────────────────────────────────────
export async function listTaxCodes(
  workspaceid: string
): Promise<FinTaxCode[]> {
  return db
    .select()
    .from(finTaxCodes)
    .where(eq(finTaxCodes.workspaceid, workspaceid))
    .orderBy(asc(finTaxCodes.code));
}

// ── Get Active Tax Code by Code ──────────────────────────────────
export async function getActiveTaxCode(
  workspaceid: string,
  code: string,
  asOfDate: string
): Promise<FinTaxCode | null> {
  const [taxCode] = await db
    .select()
    .from(finTaxCodes)
    .where(
      and(
        eq(finTaxCodes.workspaceid, workspaceid),
        eq(finTaxCodes.code, code),
        eq(finTaxCodes.isactive, true),
        lte(finTaxCodes.effectivefrom, asOfDate),
        sql`(${finTaxCodes.effectiveto} IS NULL OR ${finTaxCodes.effectiveto} >= ${asOfDate})`
      )
    )
    .limit(1);

  return taxCode ?? null;
}

// ── Calculate Tax ────────────────────────────────────────────────
export interface TaxCalculation {
  grossAmount: number;
  netAmount: number;
  taxAmount: number;
  taxRate: number;
  taxCode: string;
  isInclusive: boolean;
}

export function calculateTax(
  amount: number,
  rate: number,
  isInclusive: boolean
): TaxCalculation {
  if (rate === 0) {
    return {
      grossAmount: amount,
      netAmount: amount,
      taxAmount: 0,
      taxRate: 0,
      taxCode: "EXEMPT",
      isInclusive: false,
    };
  }

  const rateDecimal = rate / 100;

  if (isInclusive) {
    // Amount includes tax: taxAmount = amount - (amount / (1 + rate))
    const netAmount = amount / (1 + rateDecimal);
    const taxAmount = amount - netAmount;
    return {
      grossAmount: Math.round(amount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      taxRate: rate,
      taxCode: "",
      isInclusive: true,
    };
  } else {
    // Amount excludes tax: taxAmount = amount * rate
    const taxAmount = amount * rateDecimal;
    const grossAmount = amount + taxAmount;
    return {
      grossAmount: Math.round(grossAmount * 100) / 100,
      netAmount: Math.round(amount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      taxRate: rate,
      taxCode: "",
      isInclusive: false,
    };
  }
}

// ── Seed Default Tax Codes ───────────────────────────────────────
export async function seedDefaultTaxCodes(
  workspaceid: string
): Promise<{ count: number }> {
  const defaults: Omit<CreateTaxCodeInput, "effectivefrom">[] = [
    { code: "EXEMPT", name: "Tax Exempt", rate: 0, taxtype: "EXEMPT", isinclusive: false },
    { code: "ZERO", name: "Zero Rate", rate: 0, taxtype: "VAT", isinclusive: false },
  ];

  let count = 0;
  const today = new Date().toISOString().split("T")[0];

  for (const def of defaults) {
    const existing = await getActiveTaxCode(workspaceid, def.code, today);
    if (!existing) {
      await createTaxCode(workspaceid, { ...def, effectivefrom: "2020-01-01" });
      count++;
    }
  }

  return { count };
}

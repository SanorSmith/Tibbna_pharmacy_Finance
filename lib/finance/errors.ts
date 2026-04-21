/**
 * Finance Module — Error Classes & Utilities
 *
 * Structured error handling for all finance operations.
 * Finance errors never crash the calling code; they return typed error objects.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ── Error Codes ──────────────────────────────────────────────────
export type FinanceErrorCode =
  | "VALIDATION_ERROR"
  | "PERIOD_CLOSED"
  | "DUPLICATE_CONFLICT"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_INACTIVE"
  | "GROUP_ACCOUNT"
  | "UNBALANCED_JOURNAL"
  | "INSUFFICIENT_PERMISSIONS"
  | "NOT_FOUND"
  | "ALREADY_POSTED"
  | "ALREADY_REVERSED"
  | "INTERNAL_ERROR";

// ── Finance Error Class ──────────────────────────────────────────
export class FinanceError extends Error {
  public readonly code: FinanceErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: FinanceErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FinanceError";
    this.code = code;
    this.statusCode = getStatusCode(code);
    this.details = details;
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: this.message,
        code: this.code,
        ...(this.details ? { details: this.details } : {}),
      },
      { status: this.statusCode }
    );
  }
}

// ── Status Code Mapping ──────────────────────────────────────────
function getStatusCode(code: FinanceErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
    case "UNBALANCED_JOURNAL":
    case "GROUP_ACCOUNT":
      return 400;
    case "INSUFFICIENT_PERMISSIONS":
      return 403;
    case "NOT_FOUND":
    case "ACCOUNT_NOT_FOUND":
    case "ACCOUNT_INACTIVE":
      return 404;
    case "DUPLICATE_CONFLICT":
    case "ALREADY_POSTED":
    case "ALREADY_REVERSED":
      return 409;
    case "PERIOD_CLOSED":
      return 422;
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

// ── Helper: Handle API Errors ────────────────────────────────────
export function handleFinanceApiError(
  error: unknown,
  context: string
): NextResponse {
  // Zod validation error
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation error",
        code: "VALIDATION_ERROR",
        details: { issues: error.issues },
      },
      { status: 400 }
    );
  }

  // Known finance error
  if (error instanceof FinanceError) {
    console.error(`[Finance: ${context}]`, error.message);
    return error.toResponse();
  }

  // Postgres unique constraint violation (idempotency)
  if (
    error instanceof Error &&
    error.message.includes("duplicate key value violates unique constraint")
  ) {
    console.error(`[Finance: ${context}] Duplicate key:`, error.message);
    return NextResponse.json(
      {
        error: "Duplicate entry",
        code: "DUPLICATE_CONFLICT",
      },
      { status: 409 }
    );
  }

  // Unknown error
  console.error(`[Finance: ${context}] Unexpected error:`, error);
  return NextResponse.json(
    {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}

// ── Helper: Safe Finance Hook Wrapper ────────────────────────────
// Wraps integration hooks so finance failures never block pharmacy operations.
export async function safeFinanceHook(
  hookName: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[Finance Hook: ${hookName}] Error (non-blocking):`, err);
  }
}

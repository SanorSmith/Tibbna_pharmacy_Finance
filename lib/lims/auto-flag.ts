/**
 * Auto-Flag Utility for Lab Test Results
 *
 * Computes flag, isAbnormal, and isCritical from a result value
 * against reference ranges and panic/critical values.
 *
 * Supports:
 * - Numeric results compared against referencemin/referencemax and paniclow/panichigh
 * - Descriptive/text results compared against referencetext and panictext
 *
 * Flag values follow standard lab conventions:
 *   ""  = Normal
 *   "L" = Low (below reference min)
 *   "H" = High (above reference max)
 *   "LL" = Critically Low (below panic low)
 *   "HH" = Critically High (above panic high)
 *   "A" = Abnormal (descriptive mismatch)
 *   "AA" = Critically Abnormal (descriptive panic match)
 */

export interface AutoFlagInput {
  resultvalue: string;
  referencemin?: number | string | null;
  referencemax?: number | string | null;
  referencerange?: string | null;
  referencetext?: string | null;
  paniclow?: number | string | null;
  panichigh?: number | string | null;
  panictext?: string | null;
}

export interface AutoFlagOutput {
  flag: string;
  isabormal: boolean;
  iscritical: boolean;
}

/**
 * Auto-flag a single test result against its reference/panic ranges.
 */
export function autoFlagResult(input: AutoFlagInput): AutoFlagOutput {
  const { resultvalue } = input;

  if (!resultvalue || resultvalue.trim() === "" || resultvalue === "-") {
    return { flag: "normal", isabormal: false, iscritical: false };
  }

  const numericValue = parseFloat(resultvalue);

  // ── Numeric result ──
  if (!isNaN(numericValue)) {
    return flagNumeric(numericValue, input);
  }

  // ── Descriptive / text result ──
  return flagDescriptive(resultvalue, input);
}

function flagNumeric(value: number, input: AutoFlagInput): AutoFlagOutput {
  const refMin = toNumber(input.referencemin);
  const refMax = toNumber(input.referencemax);
  const panicLow = toNumber(input.paniclow);
  const panicHigh = toNumber(input.panichigh);

  // Check critical (panic) values first — they take priority
  if (panicLow !== null && value < panicLow) {
    return { flag: "LL", isabormal: true, iscritical: true };
  }
  if (panicHigh !== null && value > panicHigh) {
    return { flag: "HH", isabormal: true, iscritical: true };
  }

  // Check reference ranges
  if (refMin !== null && refMax !== null) {
    if (value < refMin) {
      return { flag: "L", isabormal: true, iscritical: false };
    }
    if (value > refMax) {
      return { flag: "H", isabormal: true, iscritical: false };
    }
    return { flag: "normal", isabormal: false, iscritical: false };
  }

  // Only one bound provided
  if (refMin !== null && value < refMin) {
    return { flag: "L", isabormal: true, iscritical: false };
  }
  if (refMax !== null && value > refMax) {
    return { flag: "H", isabormal: true, iscritical: false };
  }

  // Try to parse referencerange string (e.g. "< 5", "> 150", "70-100")
  if (input.referencerange) {
    const parsed = parseReferenceRangeString(input.referencerange);
    if (parsed) {
      if (parsed.panicLow !== null && value < parsed.panicLow) {
        return { flag: "LL", isabormal: true, iscritical: true };
      }
      if (parsed.panicHigh !== null && value > parsed.panicHigh) {
        return { flag: "HH", isabormal: true, iscritical: true };
      }
      if (parsed.min !== null && value < parsed.min) {
        return { flag: "L", isabormal: true, iscritical: false };
      }
      if (parsed.max !== null && value > parsed.max) {
        return { flag: "H", isabormal: true, iscritical: false };
      }
      return { flag: "normal", isabormal: false, iscritical: false };
    }
  }

  // No ranges available — assume normal
  return { flag: "normal", isabormal: false, iscritical: false };
}

function flagDescriptive(value: string, input: AutoFlagInput): AutoFlagOutput {
  const valueLower = value.toLowerCase().trim();

  // Check critical/panic text first
  if (input.panictext) {
    const panicTerms = input.panictext.toLowerCase().split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
    if (panicTerms.some((term) => valueLower.includes(term) || term.includes(valueLower))) {
      return { flag: "AA", isabormal: true, iscritical: true };
    }
  }

  // Check reference text (expected normal value)
  if (input.referencetext) {
    const refTerms = input.referencetext.toLowerCase().split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
    // If the result matches the reference text, it's normal
    if (refTerms.some((term) => valueLower === term || valueLower.includes(term))) {
      return { flag: "normal", isabormal: false, iscritical: false };
    }
    // Result doesn't match expected normal → abnormal
    return { flag: "A", isabormal: true, iscritical: false };
  }

  // Check referencerange for descriptive matching (e.g. "Negative", "Absent")
  if (input.referencerange) {
    const refLower = input.referencerange.toLowerCase().trim();
    // Common patterns: "Negative", "Absent", "Not detected", "No growth"
    const normalTerms = ["negative", "absent", "not detected", "no growth", "non-reactive", "normal"];
    const abnormalTerms = ["positive", "present", "detected", "growth", "reactive", "abnormal"];

    const resultIsNormal = normalTerms.some((t) => valueLower.includes(t));
    const resultIsAbnormal = abnormalTerms.some((t) => valueLower.includes(t));
    const refIsNormal = normalTerms.some((t) => refLower.includes(t));

    if (resultIsAbnormal && refIsNormal) {
      return { flag: "A", isabormal: true, iscritical: false };
    }
    if (resultIsNormal) {
      return { flag: "normal", isabormal: false, iscritical: false };
    }
  }

  // Cannot determine — assume normal
  return { flag: "normal", isabormal: false, iscritical: false };
}

// ── Helpers ──

function toNumber(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? null : n;
}

/**
 * Parse common reference range string formats:
 *   "70-100"        → { min: 70, max: 100 }
 *   "< 5"           → { min: null, max: 5 }
 *   "> 150"         → { min: 150, max: null }
 *   "70 - 100 mg/dL" → { min: 70, max: 100 }
 */
function parseReferenceRangeString(
  range: string
): { min: number | null; max: number | null; panicLow: number | null; panicHigh: number | null } | null {
  const trimmed = range.trim();

  // Range format: "70-100" or "70 - 100" or "70-100 mg/dL"
  const rangeMatch = trimmed.match(/^([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max, panicLow: null, panicHigh: null };
    }
  }

  // Less than: "< 5" or "<5"
  const ltMatch = trimmed.match(/^<\s*([\d.]+)/);
  if (ltMatch) {
    const max = parseFloat(ltMatch[1]);
    if (!isNaN(max)) {
      return { min: null, max, panicLow: null, panicHigh: null };
    }
  }

  // Greater than: "> 150" or ">150"
  const gtMatch = trimmed.match(/^>\s*([\d.]+)/);
  if (gtMatch) {
    const min = parseFloat(gtMatch[1]);
    if (!isNaN(min)) {
      return { min, max: null, panicLow: null, panicHigh: null };
    }
  }

  return null;
}

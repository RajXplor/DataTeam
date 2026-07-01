/**
 * Header validation for all uploaded file types.
 *
 * Each entry defines the minimum set of column headers that MUST be present
 * for a file to be accepted as the correct export type. Validation runs
 * server-side in each API route immediately after file parsing, before any
 * core logic is invoked. Missing headers produce a structured error payload
 * that the UI renders as a prominent red alert.
 *
 * Matching is trimmed + exact (case-sensitive), mirroring how the source
 * Python scripts reference column names.
 */

export const EXPECTED_HEADERS = {
  childrenData: {
    label: 'Children Data Master',
    required: [
      'XplorServiceID', 'ChildID', 'ChildFirst', 'ChildLast', 'DOB',
      'IsPrimaryCarer 1', 'FirstName 1', 'LastName 1',
    ],
  },
  emergencyContacts: {
    label: 'Emergency Contact Reports',
    required: [
      'Child First Name', 'Child Last Name',
      'Emergency Contact First Name', 'Emergency Contact Last Name',
      'Emergency Contact Number', 'Emergency Contact',
    ],
  },
  paymentPlan: {
    label: 'Payment Plan',
    required: [
      'Service_ID', 'Service_Name',
      'Parent_First_Name', 'Parent_Last_Name',
      'Child_First_Name', 'Child_Last_Name',
      'Gateway_Reference',
    ],
  },
  dsTokens: {
    label: 'DS Tokens',
    required: ['Client', 'Club Number', 'Adfit No'],
  },
  guardianList: {
    label: 'Guardian Financial List',
    required: ['ID', 'Account Holder', 'Child Names'],
  },
  bankDetails: {
    label: 'Parent Bank Details',
    required: ['First Name', 'Last Name', 'Bank Detail'],
  },
} as const;

export interface ValidationError {
  file: string;
  missing: string[];
  found: string[];
}

/**
 * Returns a ValidationError if any required headers are absent, otherwise null.
 * Pass the rows array already parsed by readSpreadsheetRows so we do not
 * re-parse the file.
 */
export function validateFileHeaders(
  rows: Record<string, string>[],
  required: readonly string[],
  fileLabel: string,
): ValidationError | null {
  const found = rows.length > 0 ? Object.keys(rows[0]).map((k) => k.trim()) : [];
  const missing = required.filter((h) => !found.includes(h));
  if (missing.length > 0) {
    return { file: fileLabel, missing, found };
  }
  return null;
}

export function formatValidationError(errors: ValidationError[]): string {
  return errors
    .map(
      (e) =>
        `${e.file}: missing column(s) — ${e.missing.map((m) => `"${m}"`).join(', ')}`,
    )
    .join('\n');
}

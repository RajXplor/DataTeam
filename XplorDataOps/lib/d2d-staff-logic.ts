/**
 * D > D Staff Import Logic
 *
 * Transforms an Xplor staff export (28 columns) into the exact
 * D-system import template format (35 columns), applying all
 * Legend mappings from the reference workbook.
 *
 * Source columns:
 *   First Name, Last Name, Police Check Expiry, Ethnicity1-3,
 *   Teacher Certification, Teacher Cert Expiry, Highest Qual,
 *   First Aid Expiry, Start Date, Leaving Date, Birthdate,
 *   Permanent Staff, Emergency Name, Emergency Mobile,
 *   Emergency Day Phone, Mobile, Personal Email, Address,
 *   Post Code, Daytime Phone, Teacher Cert Number, Payroll ID,
 *   Paid Staff, Full Time Staff, Role, Gender
 *
 * Target columns (Import template):
 *   Staff Name, Status, Date Effective, End Date, Reg #,
 *   Address1, Address2, Address3, Post Code, Phone, Cell,
 *   Emergency Contact, Emg Phone, Emg Cell, Email Address,
 *   Join, Leave, Birth Date, Gender, First Aid Expiry,
 *   Police Check Expiry, Colour, Permanent, Full Time, Paid,
 *   Qual, Role 1, Role 2, Role 3, Role 4,
 *   Ethnicity1, Ethnicity2, Ethnicity3, Payroll Code, BankAccount
 */

import { readSpreadsheetRows } from './file-parsing';
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────
// SHEET-AWARE FILE READER
// ─────────────────────────────────────────────────────────────

/**
 * For the D > D Staff workbook the source data may live in a named sheet
 * (e.g. "Export Data 1") rather than the first sheet.  This reader scans
 * every sheet in a binary Excel file and returns the first one that contains
 * the key staff column "First Name".  For plain CSV files it falls back to
 * the shared readSpreadsheetRows helper.
 */
function readStaffRows(buffer: Buffer): Record<string, string>[] {
  const magic = buffer.slice(0, 4);
  const isExcel =
    (magic[0] === 0xd0 && magic[1] === 0xcf) ||
    (magic[0] === 0x50 && magic[1] === 0x4b);

  if (!isExcel) {
    return readSpreadsheetRows(buffer);
  }

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  for (const sheetName of wb.SheetNames) {
    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '' });

    if (rows.length === 0) continue;

    const firstRowKeys = Object.keys(rows[0]);
    if (!firstRowKeys.includes('First Name')) continue;

    // Found the data sheet — convert to string rows (same as file-parsing.ts)
    return rows.map((row) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(row)) {
        const key = k.trim();
        if (v instanceof Date) {
          const d = String(v.getDate()).padStart(2, '0');
          const m = String(v.getMonth() + 1).padStart(2, '0');
          out[key] = `${v.getFullYear()}-${m}-${d}`;
        } else {
          out[key] = v === null || v === undefined ? '' : String(v);
        }
      }
      return out;
    });
  }

  // No matching sheet found — return empty so validation catches it cleanly
  return [];
}

// ─────────────────────────────────────────────────────────────
// LEGEND MAPS (sourced directly from the Legend sheet)
// ─────────────────────────────────────────────────────────────

/** Teacher Certification → Import Status */
const CERT_STATUS_MAP: Record<string, string> = {
  'Tūturu | Full Certification':                  'Full certificate',
  'Tōmua | Provisional Certification':             'Provisional',
  'Pūmau | Subject to Confirmation Certification': 'Provisional',
};
// All other values (including NaN) → 'No Certificate'

/** Role → role code abbreviation */
const ROLE_MAP: Record<string, string> = {
  'ECE Teacher':             'ECET',
  'Support Staff':           'SUPS',
  'Senior Management Staff': 'SNRMS',
  'Homebased Educator':      'HBE',
  'Homebased Coordinator':   'HBC',
};

/** Single-letter gender code → full word */
const GENDER_MAP: Record<string, string> = {
  F: 'Female',
  M: 'Male',
  U: 'Unknown',
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Return a clean string; treat NaN, NaT, 'nan', 'nat', '', undefined as empty */
function cv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (['nan', 'nat', 'none', ''].includes(s.toLowerCase())) return '';
  return s;
}

/** ✔ indicator → 'Yes', anything else → 'No' */
function yn(val: string): 'Yes' | 'No' {
  return val.trim() === '✔' ? 'Yes' : 'No';
}

/**
 * Clean a mobile / cell number.
 * Strips all non-digit characters; prepends '0' if the result
 * doesn't already start with '0'.
 */
function cleanMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? digits : '0' + digits;
}

/**
 * Clean an emergency phone field.
 * Strips spaces and common formatting characters; returns digits only.
 */
function cleanEmergencyPhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '').replace(/\D/g, '');
}

/** Format a date-like string as YYYY-MM-DD, or return '' if invalid */
function formatDate(raw: string): string {
  if (!raw) return '';
  // Already ISO-like: "2025-12-14" or "2025-12-14 00:00:00"
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  // DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return raw; // pass through unknown formats unchanged
}

/**
 * Map Teacher Certification value to import Status.
 * Falls back to 'No Certificate' for any unrecognised / empty value.
 */
function mapStatus(certValue: string): string {
  return CERT_STATUS_MAP[certValue] ?? 'No Certificate';
}

/**
 * Split a comma-separated Role string, map each part to its code,
 * and return an array of exactly 4 strings (empty string for unused slots).
 */
function mapRoles(roleStr: string): [string, string, string, string] {
  const raw = roleStr.split(',').map((r) => r.trim()).filter(Boolean);
  const mapped = raw.map((r) => ROLE_MAP[r] ?? r);
  return [
    mapped[0] ?? '',
    mapped[1] ?? '',
    mapped[2] ?? '',
    mapped[3] ?? '',
  ];
}

// ─────────────────────────────────────────────────────────────
// RESULT TYPES
// ─────────────────────────────────────────────────────────────

export interface D2DStaffSkippedRow {
  rowIndex: number;
  reason:   string;
}

export interface D2DStaffResult {
  csvBase64:      string;
  filename:       string;
  summary: {
    inputRows:     number;
    outputRows:    number;
    skippedRows:   number;
  };
  skipped: D2DStaffSkippedRow[];
}

// ─────────────────────────────────────────────────────────────
// IMPORT TEMPLATE COLUMN ORDER (must match exactly)
// ─────────────────────────────────────────────────────────────

export const IMPORT_COLUMNS = [
  'Staff Name', 'Status', 'Date Effective', 'End Date', 'Reg #',
  'Address1', 'Address2', 'Address3', 'Post Code', 'Phone', 'Cell',
  'Emergency Contact', 'Emg Phone', 'Emg Cell', 'Email Address',
  'Join', 'Leave', 'Birth Date', 'Gender',
  'First Aid Expiry', 'Police Check Expiry', 'Colour',
  'Permanent', 'Full Time', 'Paid', 'Qual',
  'Role 1', 'Role 2', 'Role 3', 'Role 4',
  'Ethnicity1', 'Ethnicity2', 'Ethnicity3',
  'Payroll Code', 'BankAccount',
] as const;

// ─────────────────────────────────────────────────────────────
// MAIN PROCESS FUNCTION
// ─────────────────────────────────────────────────────────────

export function processD2DStaff(fileBuffer: Buffer): D2DStaffResult {
  const rows = readStaffRows(fileBuffer);

  const outputRows: Record<string, string>[] = [];
  const skipped: D2DStaffSkippedRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based, +1 for header

    const firstName  = cv(row['First Name']);
    const lastName   = cv(row['Last Name']);

    // ── Field extraction ────────────────────────────────────
    const teacherCert     = cv(row['Teacher Certification']);
    const teacherCertExp  = cv(row['Teacher Cert Expiry']);
    const highestQual     = cv(row['Highest Qual']);
    const firstAidExp     = cv(row['First Aid Expiry']);
    const policeCheckExp  = cv(row['Police Check Expiry']);
    const startDate       = cv(row['Start Date']);
    const leavingDate     = cv(row['Leaving Date']);
    const birthdate       = cv(row['Birthdate']);
    const permanentStaff  = cv(row['Permanent Staff']);
    const fullTimeStaff   = cv(row['Full Time Staff']);
    const paidStaff       = cv(row['Paid Staff']);
    const emergencyName   = cv(row['Emergency Name']);
    const emergencyMobile = cv(row['Emergency Mobile']);
    const emergencyDayPh  = cv(row['Emergency Day Phone']);
    const mobile          = cv(row['Mobile']);
    const email           = cv(row['Personal Email']);
    const address         = cv(row['Address']);
    const postCode        = cv(row['Post Code']);
    const daytimePhone    = cv(row['Daytime Phone']);
    const teacherCertNum  = cv(row['Teacher Cert Number']);
    const payrollId       = cv(row['Payroll ID']);
    const roleStr         = cv(row['Role']);
    const gender          = cv(row['Gender']);
    const eth1            = cv(row['Ethnicity1']);
    const eth2            = cv(row['Ethnicity2']);
    const eth3            = cv(row['Ethnicity3']);

    // ── Transformations ──────────────────────────────────────
    const staffName   = [firstName, lastName].filter(Boolean).join(' ');
    const status      = mapStatus(teacherCert);
    const endDate     = formatDate(teacherCertExp);
    const regNum      = teacherCertNum;
    const cell        = cleanMobile(mobile);
    const emgPhone    = cleanEmergencyPhone(emergencyDayPh);
    const emgCell     = cleanEmergencyPhone(emergencyMobile);
    const genderOut   = GENDER_MAP[gender] ?? gender;
    const permanent   = yn(permanentStaff);
    const fullTime    = yn(fullTimeStaff);
    const paid        = yn(paidStaff);
    const [r1, r2, r3, r4] = mapRoles(roleStr);

    // ── Normalise postcode: strip ".0" float suffix ──────────
    const postCodeClean = postCode.replace(/\.0$/, '');

    const out: Record<string, string> = {
      'Staff Name':          staffName,
      'Status':              status,
      'Date Effective':      '',
      'End Date':            endDate,
      'Reg #':               regNum,
      'Address1':            address,
      'Address2':            '',
      'Address3':            '',
      'Post Code':           postCodeClean,
      'Phone':               daytimePhone,
      'Cell':                cell,
      'Emergency Contact':   emergencyName,
      'Emg Phone':           emgPhone,
      'Emg Cell':            emgCell,
      'Email Address':       email,
      'Join':                formatDate(startDate),
      'Leave':               formatDate(leavingDate),
      'Birth Date':          formatDate(birthdate),
      'Gender':              genderOut,
      'First Aid Expiry':    formatDate(firstAidExp),
      'Police Check Expiry': formatDate(policeCheckExp),
      'Colour':              '',
      'Permanent':           permanent,
      'Full Time':           fullTime,
      'Paid':                paid,
      'Qual':                highestQual,
      'Role 1':              r1,
      'Role 2':              r2,
      'Role 3':              r3,
      'Role 4':              r4,
      'Ethnicity1':          eth1,
      'Ethnicity2':          eth2,
      'Ethnicity3':          eth3,
      'Payroll Code':        payrollId,
      'BankAccount':         '',
    };

    // Track rows with no name — include them but flag
    if (!firstName && !lastName) {
      skipped.push({
        rowIndex: rowNum,
        reason:   'Both First Name and Last Name are empty — row included with blank Staff Name',
      });
    }

    outputRows.push(out);
  }

  // ── Build CSV with UTF-8 BOM ─────────────────────────────
  const cols = [...IMPORT_COLUMNS] as string[];
  const csvLines: string[] = [cols.join(',')];

  for (const row of outputRows) {
    const values = cols.map((col) => {
      const val = row[col] ?? '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    csvLines.push(values.join(','));
  }

  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const csvBase64  = Buffer.from(csvContent, 'utf-8').toString('base64');

  return {
    csvBase64,
    filename: 'D2D_Staff_Import.csv',
    summary: {
      inputRows:   rows.length,
      outputRows:  outputRows.length,
      skippedRows: skipped.length,
    },
    skipped,
  };
}

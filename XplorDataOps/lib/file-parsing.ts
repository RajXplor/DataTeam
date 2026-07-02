/**
 * Shared file reading utilities for both X2X and ParentTokens pipelines.
 *
 * CRITICAL DESIGN NOTE — why this file exists:
 * SheetJS's CSV-to-worksheet parser auto-detects cell types, including dates,
 * even with cellDates:false. For example "12/05/2021" gets silently parsed as
 * a date and re-rendered as the short string "12/5/21" *before* our own
 * dayfirst-aware logic ever sees it — at which point the 2-digit year breaks
 * our DD/MM/YYYY regex, falls through to native Date() parsing, and gets
 * reinterpreted as MM/DD/YY (American convention). The net effect: an
 * Australian dayfirst date like 12 May silently becomes 5 December. This is
 * exactly backwards for a tool whose stated purpose is Australian dayfirst
 * date handling, so we do not let SheetJS guess at CSV cell types at all.
 *
 * - CSV: parsed as pure text (RFC 4180-ish), zero type inference. Every cell
 *   reaches our own _date()/_postcode()/_phone() helpers exactly as written
 *   in the source file — mirroring pandas.read_csv's default object dtype.
 * - Genuine binary Excel (.xlsx/.xls/.xlsm): a date-formatted cell stores an
 *   explicit numeric serial in the file itself, so there is no day/month
 *   ambiguity to guess at. We read with cellDates:true + raw:true so real
 *   date cells resolve to native JS Date objects (verified empirically to
 *   reflect the exact stored serial, not a re-guessed string), and format
 *   those ourselves as DD/MM/YYYY. Cells the source system stored as plain
 *   text pass through untouched for our own dayfirst parser, exactly as a
 *   text-typed cell would.
 */

import * as XLSX from 'xlsx';

function formatDDMMYYYY(dt: Date): string {
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}

function isBinaryExcel(buffer: Buffer): boolean {
  const magic = buffer.slice(0, 4);
  return (
    (magic[0] === 0xd0 && magic[1] === 0xcf) || // legacy .xls (OLE2/CFB)
    (magic[0] === 0x50 && magic[1] === 0x4b)    // .xlsx/.xlsm (ZIP/PK)
  );
}

/** RFC-4180-ish CSV parser: handles quoted fields, embedded commas/quotes/newlines,
 *  CRLF and LF line endings. Every field is returned as a literal string — no
 *  type, number, or date inference of any kind. */
function parseRawCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += ch;
    i++;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  while (rows.length > 0 && rows[rows.length - 1].every((c) => c === '')) {
    rows.pop();
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? '';
    });
    return obj;
  });
}

// SECURITY NOTE — see README.md "Known dependency advisory" for full context.
// The npm-published `xlsx` package has a documented, currently unpatched
// prototype-pollution advisory (GHSA-4r6h-8v6p-xvw6) triggered by malicious
// header/key names in a crafted file. CSV uploads never reach SheetJS's
// parser at all (see parseRawCSV above) — only genuine binary .xlsx/.xls
// files do. As defense-in-depth for that remaining path, we explicitly
// reject the handful of property names that could pollute Object.prototype
// before they're ever used as object keys.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function readBinaryExcelRows(buffer: Buffer): Record<string, string>[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '' });

  return rows.map((row) => {
    const cleaned: Record<string, string> = Object.create(null);
    for (const [k, v] of Object.entries(row)) {
      const key = k.trim();
      if (DANGEROUS_KEYS.has(key)) continue;
      if (v instanceof Date) {
        cleaned[key] = formatDDMMYYYY(v);
      } else if (v === null || v === undefined) {
        cleaned[key] = '';
      } else {
        cleaned[key] = String(v);
      }
    }
    return cleaned;
  });
}

/** Main entry point: reads a CSV or binary Excel buffer into plain-string rows,
 *  with header whitespace trimmed and zero ambiguous type/date guessing. */
export function readSpreadsheetRows(buffer: Buffer): Record<string, string>[] {
  if (isBinaryExcel(buffer)) {
    return readBinaryExcelRows(buffer);
  }
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  return parseRawCSV(text);
}

/** Same as readSpreadsheetRows, but additionally strips a 2-line "preamble"
 *  if the first line looks like a quoted title row rather than real headers
 *  (e.g. a report title row above the actual column headers). Used by the
 *  ParentTokens pipeline, which can receive exports with this shape. */
export function readSpreadsheetRowsWithPreambleSkip(buffer: Buffer): Record<string, string>[] {
  if (isBinaryExcel(buffer)) {
    return readBinaryExcelRows(buffer);
  }
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const looksLikePreambleTitle =
    firstLine.trim().startsWith('"') && !firstLine.replace(/"/g, '').includes(',');
  const effectiveText = looksLikePreambleTitle
    ? text.split(/\r?\n/).slice(2).join('\n')
    : text;
  return parseRawCSV(effectiveText);
}

/**
 * X>X Token Import Logic — TypeScript port of X_to_X_ParentTokens.py
 *
 * Faithfully replicates:
 * - normalise(): strips all non-alphanumeric chars, lowercases
 * - find_column(): fuzzy substring match on normalised column names
 * - Club Number → Adfit No lookup map from DS Tokens file
 * - Per-child Parent 1 + Parent 2 token matching with missing counter
 * - Deduplication on [Parent Id, Token]
 * - UTF-8 BOM CSV output
 */

import { readSpreadsheetRows } from './file-parsing';

// ─────────────────────────────────────────────────────────────
// HELPERS — exact translations
// ─────────────────────────────────────────────────────────────

/** normalise(text) — strips everything except lowercase a-z 0-9 */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** clean_filename(name) — safe for use in a filename */
function cleanFilename(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_') || 'Service';
}

/**
 * find_column() — mirrors the Python version exactly.
 * Normalises every actual column header and every candidate name,
 * then tests whether the normalised candidate is a substring of the
 * normalised actual header (not the other way around, matching Python:
 *   `if candidate in col_norm`).
 * Returns the *original* (un-normalised) column name, or null if not found.
 */
function findColumn(
  rows: Record<string, string>[],
  candidates: string[],
): string | null {
  if (rows.length === 0) return null;
  const actualCols = Object.keys(rows[0]);
  // Build map: normalised → original
  const normToOrig: Record<string, string> = {};
  for (const col of actualCols) {
    normToOrig[normalise(col)] = col;
  }
  for (const candidate of candidates) {
    const cn = normalise(candidate);
    for (const [normKey, original] of Object.entries(normToOrig)) {
      if (normKey.includes(cn)) return original;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// RESULT TYPES
// ─────────────────────────────────────────────────────────────

export interface XxTokenMissingRow {
  parentLegacy: string;
  parentSlot: 'Parent 1' | 'Parent 2';
}

export interface XxTokenResult {
  csvBase64: string;
  filename: string;
  summary: {
    serviceName:   string;
    childRecords:  number;
    rowsExported:  number;
    missingTokens: number;
  };
  detectedColumns: {
    parent1Legacy: string;
    parent1Id:     string;
    parent2Legacy: string;
    parent2Id:     string;
  };
  missingRows: XxTokenMissingRow[];
}

// ─────────────────────────────────────────────────────────────
// MAIN PROCESS FUNCTION
// ─────────────────────────────────────────────────────────────

export function processXxToken(
  childBuffer: Buffer,
  tokenBuffer: Buffer,
): XxTokenResult {

  // ── Load files ────────────────────────────────────────────
  const childRows = readSpreadsheetRows(childBuffer);
  const tokenRows = readSpreadsheetRows(tokenBuffer);

  // ── Detect parent columns (fuzzy, mirrors Python find_column) ──
  const parent1LegacyCol = findColumn(childRows, [
    'Parent Legacy ID 1', 'Parent LegacyID 1', 'Parent Legacy ID1',
  ]);
  const parent1IdCol = findColumn(childRows, [
    'ParentID 1', 'Parent ID 1', 'Parent Id 1', 'Parent ID1',
  ]);
  const parent2LegacyCol = findColumn(childRows, [
    'Parent Legacy ID 2', 'Parent LegacyID 2', 'Parent Legacy ID2',
  ]);
  const parent2IdCol = findColumn(childRows, [
    'ParentID 2', 'Parent ID 2', 'Parent Id 2', 'Parent ID2',
  ]);

  if (!parent1LegacyCol) throw new Error(
    'Could not find Parent 1 Legacy ID column. Expected one of: "Parent Legacy ID 1", "Parent LegacyID 1", "Parent Legacy ID1".',
  );
  if (!parent1IdCol) throw new Error(
    'Could not find Parent 1 ID column. Expected one of: "ParentID 1", "Parent ID 1", "Parent Id 1", "Parent ID1".',
  );
  if (!parent2LegacyCol) throw new Error(
    'Could not find Parent 2 Legacy ID column. Expected one of: "Parent Legacy ID 2", "Parent LegacyID 2", "Parent Legacy ID2".',
  );
  if (!parent2IdCol) throw new Error(
    'Could not find Parent 2 ID column. Expected one of: "ParentID 2", "Parent ID 2", "Parent Id 2", "Parent ID2".',
  );

  // ── Service name — first non-empty value in "Service Name" column ──
  let serviceName = 'Service';
  for (const row of childRows) {
    const val = (row['Service Name'] ?? '').trim();
    if (val) { serviceName = cleanFilename(val); break; }
  }

  // ── Build Club → Token lookup ─────────────────────────────
  const lookup = new Map<string, string>();
  for (const row of tokenRows) {
    const club  = (row['Club Number'] ?? '').trim();
    const token = (row['Adfit No']    ?? '').trim();
    if (club && token) lookup.set(club, token);
  }

  // ── Build output rows (mirrors Python loop exactly) ───────
  const outputRows: { 'Parent Id': string; Token: string }[] = [];
  const missingRows: XxTokenMissingRow[] = [];
  let missing = 0;

  for (const row of childRows) {
    // Parent 1
    const p1Legacy = (row[parent1LegacyCol] ?? '').trim();
    const p1Id     = (row[parent1IdCol]     ?? '').trim() || p1Legacy; // fallback to legacy
    if (p1Legacy) {
      const token = lookup.get(p1Legacy);
      if (token) {
        outputRows.push({ 'Parent Id': p1Id, Token: token });
      } else {
        missing++;
        missingRows.push({ parentLegacy: p1Legacy, parentSlot: 'Parent 1' });
      }
    }

    // Parent 2
    const p2Legacy = (row[parent2LegacyCol] ?? '').trim();
    const p2Id     = (row[parent2IdCol]     ?? '').trim() || p2Legacy;
    if (p2Legacy) {
      const token = lookup.get(p2Legacy);
      if (token) {
        outputRows.push({ 'Parent Id': p2Id, Token: token });
      } else {
        missing++;
        missingRows.push({ parentLegacy: p2Legacy, parentSlot: 'Parent 2' });
      }
    }
  }

  // ── Deduplicate on [Parent Id, Token] ─────────────────────
  const seen = new Set<string>();
  const deduped = outputRows.filter((r) => {
    const key = `${r['Parent Id']}||${r.Token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Build CSV — UTF-8 BOM ─────────────────────────────────
  const csvLines = ['Parent Id,Token'];
  for (const r of deduped) {
    const pid = r['Parent Id'].includes(',') ? `"${r['Parent Id']}"` : r['Parent Id'];
    const tok = r.Token.includes(',')        ? `"${r.Token}"`        : r.Token;
    csvLines.push(`${pid},${tok}`);
  }
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const csvBase64  = Buffer.from(csvContent, 'utf-8').toString('base64');

  const filename = `${serviceName}_Token_Import.csv`;

  return {
    csvBase64,
    filename,
    summary: {
      serviceName,
      childRecords:  childRows.length,
      rowsExported:  deduped.length,
      missingTokens: missing,
    },
    detectedColumns: {
      parent1Legacy: parent1LegacyCol,
      parent1Id:     parent1IdCol,
      parent2Legacy: parent2LegacyCol,
      parent2Id:     parent2IdCol,
    },
    missingRows,
  };
}

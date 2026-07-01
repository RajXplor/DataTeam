/**
 * Parent Tokens & No Banking Report Logic
 * TypeScript port of ParentToken_Report_Generator.py
 * All matching logic, note resolution, and Excel styling are preserved.
 */

import ExcelJS from 'exceljs';
import { readSpreadsheetRowsWithPreambleSkip } from './file-parsing';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface PTIssueNoGW {
  ppRow: number;
  parentFullName: string;
  childName: string;
  gatewayRef: string;
  service: string;
  issue: string;
}

export interface PTIssueNoParent {
  ppRow: number;
  parentFullName: string;
  childName: string;
  gatewayRef: string;
  dsToken: string;
  service: string;
  issue: string;
}

export interface PTIssueChildDiff {
  ppRow: number;
  parentFullName: string;
  childInPP: string;
  gflChildren: string;
  gflParentId: string;
  gatewayRef: string;
  service: string;
  issue: string;
}

export interface PTDupGatewayRow {
  serviceName: string;
  xplorParentId: string;
  parentFullName: string;
  childName: string;
  gatewayReference: string;
  reviewNote: string;
}

export interface PTNoBankRow {
  serviceId: string;
  serviceName: string;
  parentFullName: string;
  childrenFullName: string;
  notes: string;
  noteColor: string;
  gatewayReference: string;
}

export interface PTResult {
  serviceName: string;
  tokenCsvBase64?: string;
  tokenCsvFilename?: string;
  dupReviewBase64?: string;
  dupReviewFilename?: string;
  noBankingBase64?: string;
  noBankingFilename?: string;
  summary: {
    validTokens: number;
    dupGatewayRows: number;
    issNoGw: number;
    issNoParent: number;
    issChildDiff: number;
    noBankingCount?: number;
  };
  issues: {
    noGw: PTIssueNoGW[];
    noParent: PTIssueNoParent[];
    childDiff: PTIssueChildDiff[];
  };
}

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS — direct translations
// ─────────────────────────────────────────────────────────────

/** cv(val) — clean string value */
function cv(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number' && isNaN(val)) return '';
  return String(val).trim();
}

/** norm(s) — lowercase + collapse whitespace */
function norm(s: unknown): string {
  return cv(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** child_in_gfl — check if child name appears in comma-separated GFL children string */
function childInGFL(ppChild: string, gflChildrenCSV: string): boolean {
  const ppNorm = norm(ppChild);
  return gflChildrenCSV
    .split(',')
    .map((c) => norm(c))
    .includes(ppNorm);
}

/** ds_client_to_norm — "Last, First" → "first last" normalized */
function dsClientToNorm(clientStr: string): string {
  const s = cv(clientStr);
  if (s.includes(',')) {
    const [last, first] = s.split(',', 2);
    return norm(`${first.trim()} ${last.trim()}`);
  }
  return norm(s);
}

// ─────────────────────────────────────────────────────────────
// FILE READING
// ─────────────────────────────────────────────────────────────

// File reading is now handled by lib/file-parsing.ts's
// readSpreadsheetRowsWithPreambleSkip(), which parses CSV as pure text (no
// SheetJS date/type auto-guessing — see that file for why this matters) and
// preserves the original preamble-skip behaviour for report exports that
// have a title row above the real header row.

// ─────────────────────────────────────────────────────────────
// EXCEL STYLING UTILITIES (replicates openpyxl style from original)
// ─────────────────────────────────────────────────────────────

const FONT_NAME = 'Aptos';
const FONT_SIZE = 11;

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: 'FFCCCCCC' } },
  left:   { style: 'thin', color: { argb: 'FFCCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  right:  { style: 'thin', color: { argb: 'FFCCCCCC' } },
};

function applyHeader(cell: ExcelJS.Cell, bg = '1F3864', fg = 'FFFFFF') {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } };
  cell.font      = { name: FONT_NAME, bold: true, color: { argb: `FF${fg}` }, size: FONT_SIZE };
  cell.border    = THIN_BORDER;
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function applyData(cell: ExcelJS.Cell, bg = 'FFFFFF', bold = false) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${bg}` } };
  cell.font      = { name: FONT_NAME, bold, color: { argb: 'FF000000' }, size: FONT_SIZE };
  cell.border    = THIN_BORDER;
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function autofit(ws: ExcelJS.Worksheet) {
  const colMaxLen: Record<number, number> = {};

  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const text = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
      colMaxLen[colNum] = Math.max(colMaxLen[colNum] ?? 0, text.length);
    });
  });

  const colWidths: Record<number, number> = {};
  ws.columns.forEach((_col, idx) => {
    const maxLen = colMaxLen[idx + 1] ?? 0;
    const width = Math.max(10, Math.floor(maxLen * 1.1) + 4);
    colWidths[idx + 1] = width;
    ws.getColumn(idx + 1).width = width;
  });

  ws.eachRow((row) => {
    let maxLines = 1;
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      if (!cell.value) return;
      const colWidth = colWidths[colNum] ?? 10;
      const text = String(cell.value);
      const charsPerLine = Math.max(1, Math.floor(colWidth / 1.1));
      const lines = Math.ceil(text.length / charsPerLine);
      maxLines = Math.max(maxLines, lines);
    });
    row.height = Math.max(20, maxLines * 15 + 6);
  });
}

// ─────────────────────────────────────────────────────────────
// MAIN PROCESS FUNCTION
// ─────────────────────────────────────────────────────────────

export async function processParentTokens(
  ppBuffer: Buffer,
  dsBuffer: Buffer,
  gflBuffer: Buffer,
  bankBuffer?: Buffer,
): Promise<PTResult> {

  // ── STEP 3: Load data ─────────────────────────────────────
  const pp  = readSpreadsheetRowsWithPreambleSkip(ppBuffer);
  const ds  = readSpreadsheetRowsWithPreambleSkip(dsBuffer);
  const gfl = readSpreadsheetRowsWithPreambleSkip(gflBuffer);

  // Extract service name / id from payment plan
  const serviceName = cv(pp.find((r) => r['Service_Name'])?.['Service_Name'] ?? 'Service');
  const serviceId   = cv(pp.find((r) => r['Service_ID'])?.['Service_ID']   ?? '');
  const safeSvc     = serviceName.replace(/\s+/g, '_').replace(/\//g, '-');

  // ── Build lookup indexes ──────────────────────────────────

  // GFL by normalised account holder name
  const gflByName: Record<string, Record<string, string>[]> = {};
  for (const row of gfl) {
    const key = norm(row['Account Holder']);
    if (!gflByName[key]) gflByName[key] = [];
    gflByName[key].push(row);
  }

  // DS by gateway reference (Club Number, uppercased, excluding XXX prefixes)
  const dsByGW: Record<string, Record<string, string>> = {};
  for (const row of ds) {
    const key = cv(row['Club Number']).toUpperCase();
    if (key && !key.startsWith('XXX')) {
      dsByGW[key] = row;
    }
  }

  // DS by normalised client name (for banking report note lookup)
  const dsByClient: Record<string, Record<string, string>[]> = {};
  for (const row of ds) {
    const key = dsClientToNorm(cv(row['Client']));
    if (key) {
      if (!dsByClient[key]) dsByClient[key] = [];
      dsByClient[key].push(row);
    }
  }

  // Enrich PP rows
  type PPRow = Record<string, string> & {
    _pf: string;  // parent full name (original)
    _cf: string;  // child full name (original)
    _pn: string;  // parent normalised
    _cn: string;  // child normalised
    _gu: string;  // gateway reference uppercased
  };

  const ppRows: PPRow[] = pp.map((row, idx) => ({
    ...row,
    _pf: `${cv(row['Parent_First_Name'])} ${cv(row['Parent_Last_Name'])}`,
    _cf: `${cv(row['Child_First_Name'])}  ${cv(row['Child_Last_Name'])}`,
    _pn: norm(`${cv(row['Parent_First_Name'])} ${cv(row['Parent_Last_Name'])}`),
    _cn: norm(`${cv(row['Child_First_Name'])}  ${cv(row['Child_Last_Name'])}`),
    _gu: cv(row['Gateway_Reference']).toUpperCase(),
    // store original index for row number (1-based, +2 for header)
    _idx: String(idx),
  }));

  // Detect parents with multiple distinct gateway references
  const gwPerParent: Record<string, Set<string>> = {};
  for (const row of ppRows) {
    if (!gwPerParent[row._pn]) gwPerParent[row._pn] = new Set();
    if (row._gu) gwPerParent[row._pn].add(row._gu);
  }
  const dupParentSet = new Set(
    Object.entries(gwPerParent)
      .filter(([, gwSet]) => gwSet.size > 1)
      .map(([pn]) => pn),
  );

  // ── STEP 4: Process payment plan rows ─────────────────────
  const validTokens:    { 'Parent ID': string; Token: string }[]       = [];
  const issNoGw:        PTIssueNoGW[]                                   = [];
  const issNoParent:    PTIssueNoParent[]                               = [];
  const issChildDiff:   PTIssueChildDiff[]                              = [];
  const dupGatewayRows: PTDupGatewayRow[]                               = [];

  for (const row of ppRows) {
    const csvRow    = parseInt(row['_idx'] ?? '0', 10) + 2;
    const parentFull = row._pf.trim();
    const parentNorm = row._pn;
    const childFull  = row._cf.trim().replace(/\s+/g, ' ');
    const gateway    = row._gu;
    const svcDisplay = cv(row['Service_Name'] || serviceName);

    if (dupParentSet.has(parentNorm)) {
      const gflId = gflByName[parentNorm]?.[0]
        ? cv(gflByName[parentNorm][0]['ID'])
        : 'NOT IN GFL';
      dupGatewayRows.push({
        serviceName:     svcDisplay,
        xplorParentId:   gflId,
        parentFullName:  parentFull,
        childName:       childFull,
        gatewayReference: cv(row['Gateway_Reference']),
        reviewNote:      'DUPLICATE — same parent has more than one gateway reference',
      });
      continue;
    }

    if (!dsByGW[gateway]) {
      issNoGw.push({
        ppRow: csvRow, parentFullName: parentFull, childName: childFull,
        gatewayRef: cv(row['Gateway_Reference']), service: svcDisplay,
        issue: 'Gateway reference not found in DS Tokens',
      });
      continue;
    }

    if (!gflByName[parentNorm]) {
      // Try to find the child in GFL under a different parent
      const childHits = gfl.filter((r) => childInGFL(childFull, cv(r['Child Names'])));
      let reason: string;
      if (childHits.length > 0) {
        reason =
          `Child '${childFull}' found under '${cv(childHits[0]['Account Holder'])}' ` +
          `(ID ${cv(childHits[0]['ID'])}) — parent name differs`;
      } else {
        reason = `Parent '${parentFull}' and child '${childFull}' not found in guardian list at all`;
      }
      const dsr = dsByGW[gateway];
      issNoParent.push({
        ppRow: csvRow, parentFullName: parentFull, childName: childFull,
        gatewayRef: cv(row['Gateway_Reference']),
        dsToken: cv(dsr['Adfit No']),
        service: svcDisplay, issue: reason,
      });
      continue;
    }

    const gflMatch = gflByName[parentNorm][0];
    const gflKids  = cv(gflMatch['Child Names']);
    const gflPid   = cv(gflMatch['ID']);

    if (!childInGFL(childFull, gflKids)) {
      issChildDiff.push({
        ppRow: csvRow, parentFullName: parentFull, childInPP: childFull,
        gflChildren: gflKids, gflParentId: gflPid,
        gatewayRef: cv(row['Gateway_Reference']),
        service: svcDisplay,
        issue: 'Parent matched but child name does not match GFL',
      });
      continue;
    }

    const dsr = dsByGW[gateway];
    validTokens.push({ 'Parent ID': gflPid, Token: cv(dsr['Adfit No']) });
  }

  // ── STEP 5: Write output files ────────────────────────────

  // 5a — Token Import CSV
  let tokenCsvBase64: string | undefined;
  let tokenCsvFilename: string | undefined;

  if (validTokens.length > 0) {
    const lines = ['Parent ID,Token'];
    for (const t of validTokens) {
      lines.push(`${t['Parent ID']},${t['Token']}`);
    }
    const csvContent = '\uFEFF' + lines.join('\r\n');
    tokenCsvBase64   = Buffer.from(csvContent, 'utf-8').toString('base64');
    tokenCsvFilename = `ParentToken_Import_${safeSvc}.csv`;
  }

  // 5b — Duplicate Gateway Review XLSX
  let dupReviewBase64: string | undefined;
  let dupReviewFilename: string | undefined;

  if (dupGatewayRows.length > 0) {
    const wb   = new ExcelJS.Workbook();
    const ws   = wb.addWorksheet('Duplicate Gateway Review');
    ws.views   = [{ state: 'frozen', ySplit: 1 }];

    const headers = [
      'Service Name', 'Xplor ParentID', 'Parent Full Name',
      'Child Name', 'Gateway Reference', 'Review Note',
    ];

    // Header row
    const hRow = ws.addRow(headers);
    hRow.eachCell((cell) => applyHeader(cell));
    hRow.height = 28;

    // Data rows
    dupGatewayRows.forEach((rd, idx) => {
      const ri    = idx + 2;
      const rowBg = ri % 2 === 0 ? 'FFF9E6' : 'FFFEF7';
      const values = [
        rd.serviceName, rd.xplorParentId, rd.parentFullName,
        rd.childName, rd.gatewayReference, rd.reviewNote,
      ];
      const r = ws.addRow(values);
      r.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum === 6) { // Review Note column
          applyData(cell, 'FFCC00', true);
        } else {
          applyData(cell, rowBg);
        }
      });
    });

    autofit(ws);

    const buf        = await wb.xlsx.writeBuffer();
    dupReviewBase64  = Buffer.from(buf).toString('base64');
    dupReviewFilename = `${safeSvc}_DuplicateGateway_Review.xlsx`;
  }

  // 5c — No Banking Report XLSX (if bank file provided)
  let noBankingBase64: string | undefined;
  let noBankingFilename: string | undefined;
  let noBankingCount: number | undefined;

  if (bankBuffer) {
    const bank = readSpreadsheetRowsWithPreambleSkip(bankBuffer);

    // Find bank detail column
    const bankDetailCol = Object.keys(bank[0] ?? {}).find((col) =>
      col.toLowerCase().includes('bank detail'),
    );

    let noBankDf: Record<string, string>[];
    if (!bankDetailCol) {
      noBankDf = bank;
    } else {
      noBankDf = bank.filter(
        (r) => cv(r[bankDetailCol]).toLowerCase() === 'no',
      );
    }

    noBankingCount = noBankDf.length;

    /** Replicates get_note(parent_full_name) exactly */
    const getNote = (parentFullName: string): [string, string] => {
      const pn     = norm(parentFullName);
      const dsEnts = dsByClient[pn] ?? [];

      if (dsEnts.length === 0) return ['Not found', ''];

      const isCancelled = (dr: Record<string, string>): boolean => {
        const adfit = cv(dr['Adfit No']).toLowerCase();
        const club  = cv(dr['Club Number']).toUpperCase();
        return ['n/a', 'na', ''].includes(adfit) || club.startsWith('XXX');
      };

      const allCancelled = dsEnts.every((dr) => isCancelled(dr));
      const hasValid     = dsEnts.some((dr) => !isCancelled(dr));

      if (allCancelled) return ['Cancelled - No billing since 31/12/2019', 'F4B942'];
      if (hasValid)     return ['Review', 'FFFF00'];
      return ['Not found', ''];
    };

    const noBankRows: PTNoBankRow[] = noBankDf.map((br) => {
      const first  = cv(br['First Name']);
      const last   = cv(br['Last Name']);
      const pfull  = `${first} ${last}`.trim();
      const svcId  = cv(br['Service ID']   || serviceId);
      const svcNm  = cv(br['Service Name'] || serviceName);
      const pn     = norm(pfull);
      const gflM   = gflByName[pn];
      const children = gflM ? cv(gflM[0]['Child Names']) : '';
      const [noteText, noteColor] = getNote(pfull);

      return {
        serviceId: svcId, serviceName: svcNm,
        parentFullName: pfull, childrenFullName: children,
        notes: noteText, noteColor, gatewayReference: '',
      };
    });

    if (noBankRows.length > 0) {
      const wb  = new ExcelJS.Workbook();
      const ws  = wb.addWorksheet('No Banking Report');
      ws.views  = [{ state: 'frozen', ySplit: 1 }];

      const headers = [
        'Service ID', 'Service Name', 'Parent Full Name',
        'Children Full Name', 'Notes', 'Gateway Reference',
      ];

      const hRow = ws.addRow(headers);
      hRow.eachCell((cell) => applyHeader(cell));
      hRow.height = 28;

      noBankRows.forEach((rd, idx) => {
        const ri    = idx + 2;
        const rowBg = ri % 2 === 0 ? 'EEF3FB' : 'FFFFFF';
        const values = [
          rd.serviceId, rd.serviceName, rd.parentFullName,
          rd.childrenFullName, rd.notes, rd.gatewayReference,
        ];
        const r = ws.addRow(values);
        r.eachCell({ includeEmpty: true }, (cell, colNum) => {
          if (colNum === 5) { // Notes column
            const nc = rd.noteColor;
            applyData(cell, nc || rowBg, !!nc);
          } else {
            applyData(cell, rowBg);
          }
        });
      });

      autofit(ws);

      const buf         = await wb.xlsx.writeBuffer();
      noBankingBase64   = Buffer.from(buf).toString('base64');
      noBankingFilename = `${safeSvc}_No_BankingReport.xlsx`;
    }
  }

  return {
    serviceName,
    tokenCsvBase64,
    tokenCsvFilename,
    dupReviewBase64,
    dupReviewFilename,
    noBankingBase64,
    noBankingFilename,
    summary: {
      validTokens:    validTokens.length,
      dupGatewayRows: dupGatewayRows.length,
      issNoGw:        issNoGw.length,
      issNoParent:    issNoParent.length,
      issChildDiff:   issChildDiff.length,
      noBankingCount,
    },
    issues: { noGw: issNoGw, noParent: issNoParent, childDiff: issChildDiff },
  };
}

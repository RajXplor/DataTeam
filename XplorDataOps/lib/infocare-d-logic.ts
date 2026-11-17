/**
 * Infocare > D Migration Logic
 *
 * Stitching is HORIZONTAL: File A provides left-hand columns,
 * File B provides right-hand columns for the SAME person.
 * Rows are matched by First Name + Last Name; index-based fallback
 * if no name match is found.
 */

// ─────────────────────────────────────────────────────────────
// OUTPUT HEADER DEFINITIONS
// ─────────────────────────────────────────────────────────────

export const CHILDREN_HEADERS = [
  'Row','First Name','Last Name','NSN','Birth Date','Allergies','Alt Address',
  'Alt City','Application Date','Category 1','Category 2','Category 3','Category 4',
  'Diseases','Comments','Doctor','Dr Address','Dr Phone','Ethnicity 1','Ethnicity 2',
  'Ethnicity 3','Gender','Language 1','Language 2','Language 3','ID','IMM15','IMM48',
  'Iwi 1','Iwi 2','Iwi 3','Learned','Leaving Date','Medical','Middle Name',
  'Official First','Official Last','Official Middle','Official Middle2','Reason','Ref',
  'Address','City','Routines','School','Diet','English','Starting Date',
  'Booked Times Mon','Booked Times Tue','Booked Times Wed','Booked Times Thu',
  'Booked Times Fri','Booked Times Sat','Booked Times Sun',
  'Mon20 Hours','Tue20 Hours','Wed20 Hours','Thu20 Hours','Fri20 Hours',
  'Sat20 Hours','Sun20 Hours','EComments','DCT$','DCT%','Fees','Funding',
  'Rooms Mon','Rooms Tue','Rooms Wed','Rooms Thu','Rooms Fri','Rooms Sat','Rooms Sun',
  'Special','WINZ Amount','WINZ Ends','WINZ Hours','WINZ No','WINZ Starts',
  'Legal documents','Authorisation agreem','Terms of trade',
  'Centre information','Informed of charter',
] as const;

export const STAFF_HEADERS = [
  'First Name','Last Name','Payroll ID','Address','Allergies','Bank Account',
  'Birth Date','City','Comments','ECE Date','Email','First Aid Expiry','Gender',
  'Job','Birth Date','ID','ID Type','IRD','Leaving Date','Middle Name','Mobile',
  'Perm','Police Ends','Cert Start','Cert End','Reg','Reg No','Primary Date',
  'Starting Date','Telephone','Tax Code','EC1 Name','EC1 Address','EC1 Daytime',
  'EC1 Evening','EC1 Mobile','EC1 Email','EC2 Name','EC2 Address','EC2 Daytime',
  'EC2 Evening','EC2 Mobile','EC2 Email','Ethnicity1','Ethnicity2','Ethnicity3',
] as const;

export const CONTACTS_HEADERS = [
  'Child','Contact First','Contact Last','Relationship','Daytime','Address','City',
  'Country','Mobile','Email','Prim','Emer','Cond','Coll','Evening','Fin','ID',
  'ID Type','Comments','Middle Name','Occupation','SMS','Title',
] as const;

// ─────────────────────────────────────────────────────────────
// COLUMN INDEX CONSTANTS
// ─────────────────────────────────────────────────────────────

// Children (index 0 = Row counter)
const CHILDREN_DATE_COLS      = [4, 8, 26, 27, 32, 48, 77, 80];
const CHILDREN_PHONE_COL      = 17;
const CHILDREN_LEAVING_COL    = 32;
const CHILDREN_FNAME_COL      = 1;
const CHILDREN_LNAME_COL      = 2;
const CHILDREN_ETHNICITY_COLS = [18, 19, 20];
const CHILDREN_LANGUAGE_COLS  = [22, 23, 24];

// Staff (index 0 = First Name)
const STAFF_PHONE_COLS        = [20, 29, 33, 34, 35, 39, 40, 41];
const STAFF_IDTYPE_COL        = 16;
const STAFF_DATE_COLS         = [6, 9, 11, 14, 18, 22, 23, 24, 27, 28];
const STAFF_ETHNICITY_COLS    = [43, 44, 45];

// Contacts
const CONTACTS_PHONE_COLS = [4, 8, 14];
const CONTACTS_CHILD_COL  = 0;

// ─────────────────────────────────────────────────────────────
// ETHNICITY & LANGUAGE MAPPING
// ─────────────────────────────────────────────────────────────

const ETHNICITY_MAP: Record<string, string> = {
  'Other European':           'European',
  'Other Southeast Asian':    'Southeast Asian',
  'New Zealander':            'NZ European / Pakeha',
  'South African European':   'Other South African',
  'Other Asian':              'Asian',
  'Pacific Peoples':          'Pacific Peoples',
  'Zimbabwean European':      'Zimbabwean',
  'Malaysian Indian':         'Indian',
  'Sudanese':                 'African',
  'Lao':                      'Laotian',
  'Caribbean':                '',
  'Other Zimbabwean':         'Zimbabwean',
  'Response Unidentifiable':  'Other Ethnicity',
};

const LANGUAGE_MAP: Record<string, string> = {
  'Punjabi':                   'Panjabi',
  'Tagalog':                   'Tagalog (Filipino)',
  'Northern Chinese':          'Northern Chinese (Mandarin)',
  'Yue':                       'Yue (Cantonese)',
  'Solomon Islands Languages': 'Solomon Islands Languages (Non-Central-Pacific)',
  'Other Niger-Congo':         'Other Niger-Congo not further defined',
  'Mon-Khmer':                 'Mon-Khmer not further defined',
  'Sign Language':             'Sign Language not further defined',
};

function mapEthnicity(val: string): string {
  const v = val.trim();
  return v in ETHNICITY_MAP ? ETHNICITY_MAP[v] : v;
}
function mapLanguage(val: string): string {
  const v = val.trim();
  return v in LANGUAGE_MAP ? LANGUAGE_MAP[v] : v;
}

// ─────────────────────────────────────────────────────────────
// DATE UTILITIES
// ─────────────────────────────────────────────────────────────

const MONTHS_OUT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_IN: Record<string, number> = {
  jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
  january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,
  october:9,november:10,december:11,
};

function parseDate(val: string): Date | null {
  const v = val.trim();
  if (!v) return null;
  const dmy = v.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{2,4})$/);
  if (dmy) {
    const mo = MONTH_IN[dmy[2].toLowerCase().slice(0, 3)];
    if (mo !== undefined) {
      const yr = dmy[3].length === 4 ? parseInt(dmy[3])
        : parseInt(dmy[3]) > 50 ? 1900 + parseInt(dmy[3]) : 2000 + parseInt(dmy[3]);
      return new Date(yr, mo, parseInt(dmy[1]));
    }
  }
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const yr = slash[3].length === 4 ? parseInt(slash[3])
      : parseInt(slash[3]) > 50 ? 1900 + parseInt(slash[3]) : 2000 + parseInt(slash[3]);
    return new Date(yr, parseInt(slash[2]) - 1, parseInt(slash[1]));
  }
  return null;
}

function formatDate(val: string): string {
  const v = val.trim();
  if (!v) return v;
  const d = parseDate(v);
  if (!d || isNaN(d.getTime())) return v;
  return `${d.getDate()}-${MONTHS_OUT[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function isWithinLast12Months(val: string): boolean {
  const v = val.trim();
  if (!v) return true;
  const d = parseDate(v);
  if (!d || isNaN(d.getTime())) return true;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  return d >= cutoff;
}

// ─────────────────────────────────────────────────────────────
// PHONE UTILITIES
// ─────────────────────────────────────────────────────────────

function cleanPhone(val: string): string {
  const v = val.trim();
  if (!v) return '';
  const digits = v.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('64') && digits.length >= 10) return '0' + digits.slice(2);
  if (digits.startsWith('0')) return digits;
  return '0' + digits;
}

// ─────────────────────────────────────────────────────────────
// CSV PARSING
// ─────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQ = false, i = 0;
  const len = text.length;
  while (i < len) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i+1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQ = true; i++; continue; }
    if (ch === ',') { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { if (text[i+1] === '\n') i++; row.push(field); field = ''; rows.push(row); row = []; i++; continue; }
    if (ch === '\n') { row.push(field); field = ''; rows.push(row); row = []; i++; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every(c => c === '')) rows.pop();
  return rows;
}

function parseInfocareRows(buffer: Buffer): string[][] {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  return parseCSV(text).slice(6).filter(row => row.some(c => c.trim() !== ''));
}

/**
 * Parses File B (Staff 2, Children 2, etc.) and strips out any empty/spacer
 * columns where the header in row 6 is blank, preventing column shifts.
 */
function parseInfocareFileB(buffer: Buffer): string[][] {
  const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const allRows = parseCSV(text);
  if (allRows.length <= 5) {
    return allRows.slice(6).filter(row => row.some(c => c.trim() !== ''));
  }
  const headerRow = allRows[5];
  const validIndices: number[] = [];
  headerRow.forEach((h, idx) => {
    if (h.trim() !== '') {
      validIndices.push(idx);
    }
  });

  const dataRows = allRows.slice(6).filter(row => row.some(c => c.trim() !== ''));
  return dataRows.map(row => validIndices.map(i => row[i] ?? ''));
}

// ─────────────────────────────────────────────────────────────
// HORIZONTAL STITCH
// ─────────────────────────────────────────────────────────────

function stitchHorizontal(
  rowsA: string[][],
  rowsB: string[][],
  fnIdxA: number,
  lnIdxA: number,
  fnIdxB: number,
  lnIdxB: number,
  skipFromB: number,
): string[][] {
  const mapB = new Map<string, number>();
  if (fnIdxB >= 0 && lnIdxB >= 0) {
    rowsB.forEach((row, idx) => {
      const key = `${(row[fnIdxB] ?? '').trim().toLowerCase()}||${(row[lnIdxB] ?? '').trim().toLowerCase()}`;
      if (key !== '||') mapB.set(key, idx);
    });
  }

  const merged = rowsA.map((rowA, idxA) => {
    let idxB = -1;
    if (fnIdxB >= 0 && lnIdxB >= 0) {
      const key = `${(rowA[fnIdxA] ?? '').trim().toLowerCase()}||${(rowA[lnIdxA] ?? '').trim().toLowerCase()}`;
      idxB = mapB.get(key) ?? -1;
    }

    if (idxB === -1 && idxA < rowsB.length) idxB = idxA;

    if (idxB === -1 || !rowsB[idxB]) return rowA;

    return [...rowA, ...rowsB[idxB].slice(skipFromB)];
  });

  return merged;
}

// ─────────────────────────────────────────────────────────────
// CSV OUTPUT BUILDER
// ─────────────────────────────────────────────────────────────

function csvCell(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n'))
    return '"' + val.replace(/"/g, '""') + '"';
  return val;
}

function buildCSV(headers: readonly string[], dataRows: string[][]): string {
  const lines: string[] = [
    'User,Support', 'Centre,Centre Name', 'Date,Date', 'Mode,Basic', ',',
    headers.map(csvCell).join(','),
  ];
  for (const row of dataRows) {
    lines.push(Array.from({ length: headers.length }, (_, i) => csvCell(row[i] ?? '')).join(','));
  }
  return '\uFEFF' + lines.join('\r\n');
}

// ─────────────────────────────────────────────────────────────
// CHILDREN PROCESSING
// ─────────────────────────────────────────────────────────────

export function processChildrenFiles(
  bufferA: Buffer | undefined,
  bufferB: Buffer | undefined,
  filterPast = false,
): string[][] {
  const rowsA = bufferA ? parseInfocareRows(bufferA) : [];
  if (!bufferA) return [];

  let combined: string[][];
  if (bufferB && rowsA.length > 0) {
    const rowsB = parseInfocareFileB(bufferB);
    combined = stitchHorizontal(
      rowsA, rowsB,
      1, 2,   
      -1, -1, 
      0,      
    );
  } else {
    combined = rowsA;
  }

  for (const row of combined) {
    for (const col of CHILDREN_DATE_COLS)      { if (row[col] !== undefined) row[col] = formatDate(row[col]); }
    if (row[CHILDREN_PHONE_COL] !== undefined)  row[CHILDREN_PHONE_COL] = cleanPhone(row[CHILDREN_PHONE_COL]);
    for (const col of CHILDREN_ETHNICITY_COLS) { if (row[col] !== undefined) row[col] = mapEthnicity(row[col]); }
    for (const col of CHILDREN_LANGUAGE_COLS)  { if (row[col] !== undefined) row[col] = mapLanguage(row[col]); }
  }

  const filtered = filterPast
    ? combined.filter(row => isWithinLast12Months(row[CHILDREN_LEAVING_COL] ?? ''))
    : combined;

  return filtered.map((row, i) => { const out = [...row]; out[0] = String(i + 1); return out; });
}

export function buildChildNameSet(rows: string[][]): Set<string> {
  const s = new Set<string>();
  for (const row of rows) {
    const fn = (row[CHILDREN_FNAME_COL] ?? '').trim();
    const ln = (row[CHILDREN_LNAME_COL] ?? '').trim();
    if (fn || ln) s.add(`${fn} ${ln}`.trim());
  }
  return s;
}

// ─────────────────────────────────────────────────────────────
// STAFF PROCESSING
// ─────────────────────────────────────────────────────────────

const ID_TYPE_TO_OTHER = new Set(['Passport', 'Birth Certificate']);

export function processStaffFiles(
  bufferA: Buffer | undefined,
  bufferB: Buffer | undefined,
): string[][] {
  const rowsA = bufferA ? parseInfocareRows(bufferA) : [];
  if (!bufferA) return [];

  let combined: string[][];
  if (bufferB && rowsA.length > 0) {
    const rowsB = parseInfocareFileB(bufferB);
    combined = stitchHorizontal(
      rowsA, rowsB,
      0, 1,   
      -1, -1, 
      0,      
    );
  } else {
    combined = rowsA;
  }

  for (const row of combined) {
    for (const col of STAFF_PHONE_COLS)        { if (row[col] !== undefined) row[col] = cleanPhone(row[col]); }
    for (const col of STAFF_DATE_COLS)         { if (row[col] !== undefined) row[col] = formatDate(row[col]); }
    if (row[STAFF_IDTYPE_COL] !== undefined) {
      const t = row[STAFF_IDTYPE_COL].trim();
      if (t && ID_TYPE_TO_OTHER.has(t)) row[STAFF_IDTYPE_COL] = 'Other';
    }
    for (const col of STAFF_ETHNICITY_COLS)   { if (row[col] !== undefined) row[col] = mapEthnicity(row[col]); }
  }

  return combined;
}

// ─────────────────────────────────────────────────────────────
// CONTACTS PROCESSING
// ─────────────────────────────────────────────────────────────

export function processContactFile(buffer: Buffer | undefined, childNames: Set<string>): string[][] {
  if (!buffer) return [];
  const rows = parseInfocareRows(buffer);
  const filtered = childNames.size > 0
    ? rows.filter(row => { const c = (row[CONTACTS_CHILD_COL] ?? '').trim(); return c && childNames.has(c); })
    : rows;
  return filtered.map(row => {
    for (const col of CONTACTS_PHONE_COLS) { if (row[col] !== undefined) row[col] = cleanPhone(row[col]); }
    return row;
  });
}

// ─────────────────────────────────────────────────────────────
// RESULT TYPES & INPUT TYPE
// ─────────────────────────────────────────────────────────────

export interface InfocareDFileOutput { filename: string; csvBase64: string; rowCount: number; }
export interface InfocareDResult    { files: InfocareDFileOutput[]; summary: Record<string, number>; }

export interface InfocareDInput {
  childCurrentA?: Buffer;  childCurrentB?: Buffer;
  childWaitlistA?: Buffer; childWaitlistB?: Buffer;
  childPastA?: Buffer;     childPastB?: Buffer;
  childFutureA?: Buffer;   childFutureB?: Buffer;
  staffA?: Buffer;         staffB?: Buffer;
  contactAllPast?: Buffer;    contactAllCurrent?: Buffer;    contactAllFuture?: Buffer;
  contactBpPast?: Buffer;     contactBpCurrent?: Buffer;     contactBpFuture?: Buffer;
}

// ─────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────

export function processInfocareD(input: InfocareDInput): InfocareDResult {
  const files:   InfocareDFileOutput[] = [];
  const summary: Record<string, number> = {};

  const childDefs = [
    { kA: 'childCurrentA'  as keyof InfocareDInput, kB: 'childCurrentB'  as keyof InfocareDInput, name: 'ChildrenCurrent',  past: false },
    { kA: 'childWaitlistA' as keyof InfocareDInput, kB: 'childWaitlistB' as keyof InfocareDInput, name: 'ChildrenWaitlist', past: false },
    { kA: 'childPastA'     as keyof InfocareDInput, kB: 'childPastB'     as keyof InfocareDInput, name: 'ChildrenPast',    past: true  },
    { kA: 'childFutureA'   as keyof InfocareDInput, kB: 'childFutureB'   as keyof InfocareDInput, name: 'ChildrenFuture',  past: false },
  ];
  const allChildRows: string[][] = [];
  for (const d of childDefs) {
    const bufA = input[d.kA] as Buffer | undefined;
    const bufB = input[d.kB] as Buffer | undefined;
    if (!bufA && !bufB) continue;
    const rows = processChildrenFiles(bufA, bufB, d.past);
    allChildRows.push(...rows);
    const csv = buildCSV(CHILDREN_HEADERS, rows);
    files.push({ filename: `${d.name}_Import.csv`, csvBase64: Buffer.from(csv,'utf-8').toString('base64'), rowCount: rows.length });
    summary[d.name] = rows.length;
  }

  if (input.staffA || input.staffB) {
    const rows = processStaffFiles(input.staffA, input.staffB);
    const csv  = buildCSV(STAFF_HEADERS, rows);
    files.push({ filename: 'Staff_Import.csv', csvBase64: Buffer.from(csv,'utf-8').toString('base64'), rowCount: rows.length });
    summary['Staff'] = rows.length;
  }

  const childNames = buildChildNameSet(allChildRows);
  const contactDefs = [
    { k: 'contactAllPast'     as keyof InfocareDInput, name: 'ContactAllPast'            },
    { k: 'contactAllCurrent' as keyof InfocareDInput, name: 'ContactAllCurrent'      },
    { k: 'contactAllFuture'  as keyof InfocareDInput, name: 'ContactAllFuture'         },
    { k: 'contactBpPast'     as keyof InfocareDInput, name: 'ContactBillPayerPast'    },
    { k: 'contactBpCurrent'  as keyof InfocareDInput, name: 'ContactBillPayerCurrent' },
    { k: 'contactBpFuture'   as keyof InfocareDInput, name: 'ContactBillPayerFuture'  },
  ];
  for (const d of contactDefs) {
    const buf = input[d.k] as Buffer | undefined;
    if (!buf) continue;
    const rows = processContactFile(buf, childNames);
    const csv  = buildCSV(CONTACTS_HEADERS, rows);
    files.push({ filename: `${d.name}_Import.csv`, csvBase64: Buffer.from(csv,'utf-8').toString('base64'), rowCount: rows.length });
    summary[d.name] = rows.length;
  }

  return { files, summary };
}
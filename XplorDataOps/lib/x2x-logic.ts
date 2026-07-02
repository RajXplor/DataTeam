/**
 * X2X Migration Logic — TypeScript port of X2X_automation.py v4
 * All helpers, constants, and processing algorithms are preserved exactly.
 * File I/O is replaced with Buffer-based in-memory processing.
 */

import { readSpreadsheetRows } from './file-parsing';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

export const IMPORT_COLUMNS = [
  'ServiceID', 'Service_Name', 'Child_Legacy_Id', 'Child_First_Name',
  'Child_Middle_Name', 'Child_Last_Name', 'Gender', 'DOB',
  'Special_Circumstances', 'School', 'Class', 'Consents_Photos',
  'Status', 'Address', 'Suburb', 'Country', 'State', 'PostCode',
  'Religion', 'Language', 'Cultural_Background', 'Cultural_Requirements',
  'Indigenous_Status', 'Medicare_Number', 'Medicare_Expiry_Date',
  'Ambulance_Cover_Number', 'Health_Care_Centre', 'Medical_Practitioner_Name',
  'Medical_Practitioner_Phone', 'Medical_Practitioner_Address',
  'Medical_Conditions', 'Prescribed_Medications', 'Allergies_by_choice',
  'Medical_Allergies', 'Diet', 'Epipen/Anipen', 'Child_CRN', 'Room_Name',
  'Enrolment_Start_Date', 'Enrolment_Parent_First', 'Enrolment_Parent_Last',
  'Enrolment_Parent_CRN',
  'Parent1_Title', 'Parent1_First_Name', 'Parent1_Middle_Name',
  'Parent1_Last_Name', 'Parent1_CRN', 'Parent1_Legacy_Account_ID',
  'Parent1_Gender', 'Parent1_DOB', 'Parent1_Email', 'Parent1_Contact_Mobile',
  'Parent1_Contact_Home', 'Parent1_Address_1', 'Parent1_Address_2',
  'Parent1_Suburb', 'Parent1_State', 'Parent1_Post_Code',
  'Parent1_Indigenous_Status', 'Parent1_Language', 'Parent1_Cultural_Background',
  'Parent1_Work_Email', 'Parent1_Work_Phone', 'Parent1_Work_Address',
  'Parent1_Work_Suburb', 'Parent1_Work_Postcode', 'Parent1_Work_Country',
  'Parent1_Work_State',
  'Parent2_Legacy_Account_ID', 'Parent2_Title', 'Parent2_First_Name',
  'Parent2_Middle_Name', 'Parent2_Last_Name', 'Parent2_CRN',
  'Parent2_Gender', 'Parent2_DOB', 'Parent2_Email', 'Parent2_Contact_Mobile',
  'Parent2_Contact_Home', 'Parent2_Address_1', 'Parent2_Address_2',
  'Parent2_Suburb', 'Parent2_State', 'Parent2_Post_Code',
  'Parent2_Indigenous_Status', 'Parent2_Language', 'Parent2_Cultural_Background',
  'Parent2_Work_Email', 'Parent2_Work_Phone', 'Parent2_Work_Address',
  'Parent2_Work_Suburb', 'Parent2_Work_Postcode', 'Parent2_Work_Country',
  'Parent2_Work_State',
  ...buildECColumnNames(),
] as const;

function buildECColumnNames(): string[] {
  const fields = [
    'LegacyID', 'First_Name', 'Last_Name', 'Contact_Number',
    'Address', 'Suburb', 'Postcode', 'Country', 'State', 'Email',
    'Emergency_Contact', 'Medical_Nominee', 'Collection_Nominee', 'Excursion_Nominee',
  ];
  const cols: string[] = [];
  for (let n = 1; n <= 5; n++) {
    for (const f of fields) {
      cols.push(`EmergencyContact${n}_${f}`);
    }
  }
  return cols;
}

const EC_PROFILE_FIELDS = [
  'LegacyID', 'First_Name', 'Last_Name', 'Contact_Number',
  'Address', 'Suburb', 'Postcode', 'Country', 'State', 'Email',
  'Emergency_Contact', 'Medical_Nominee', 'Collection_Nominee', 'Excursion_Nominee',
];

const MONTH_ABBR: Record<string, number> = {
  jan: 1,  january: 1,
  feb: 2,  february: 2,
  mar: 3,  march: 3,
  apr: 4,  april: 4,
  may: 5,
  jun: 6,  june: 6,
  jul: 7,  july: 7,
  aug: 8,  august: 8,
  sep: 9,  sept: 9,  september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS — exact translations of Python helpers
// ─────────────────────────────────────────────────────────────

/** _v(val) — clean string, discard nan/none/0 */
function _v(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (['nan', 'none', '0'].includes(s.toLowerCase())) return '';
  return s;
}

/** _date(val) — parse to DD/MM/YYYY, dayfirst */
function _date(val: unknown): string {
  const s = _v(val);
  if (!s) return '';
  const dt = parseFlexDate(s);
  if (dt) return formatDDMMYYYY(dt);
  return s;
}

/** _postcode(val) — strict 4-digit Australian postcode */
function _postcode(val: unknown): string {
  const s = _v(val);
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  if (!digits || digits === '0000') return '';
  return digits.padStart(4, '0').slice(0, 4);
}

/** _phone(val) — leading 0, digits only, handle Excel float */
function _phone(val: unknown): string {
  const s = _v(val);
  if (!s) return '';
  let working = s;
  // Collapse Excel float / scientific notation — mirrors Python's str(int(float(s))),
  // which raises ValueError (caught, falls through unchanged) for anything that isn't
  // a clean numeric string end-to-end. JS's parseFloat() parses only a leading numeric
  // prefix and silently ignores trailing junk (parseFloat("0400 111 222") === 400), which
  // would corrupt space- or punctuation-formatted numbers like "(02) 9876 5432" or
  // "0400 111 222". Number() requires the *entire* trimmed string to be numeric, matching
  // Python's float() strictness.
  const asNum = Number(s);
  if (!isNaN(asNum) && isFinite(asNum)) {
    working = String(Math.round(asNum));
  }
  const digits = working.replace(/\D/g, '');
  if (!digits) return '';
  // Remove international +61 prefix
  let result = digits;
  if (result.startsWith('61') && result.length === 11) {
    result = '0' + result.slice(2);
  }
  // Ensure leading 0
  if (!result.startsWith('0')) {
    result = '0' + result;
  }
  return result;
}

/** _yn(val) — "yes"→"Y", "no"→"N" */
function _yn(val: unknown): string {
  const s = _v(val).toLowerCase();
  if (s === 'yes') return 'Y';
  if (s === 'no') return 'N';
  return _v(val);
}

/** _ec_perm(val) — "yes"→1, else "" */
function _ec_perm(val: unknown): string | number {
  if (_v(val).toLowerCase() === 'yes') return 1;
  return '';
}

/** _norm(s) — lowercase + strip */
function _norm(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s).trim().toLowerCase();
}

/** _medicare(val) — digits only, longest run wins */
function _medicare(val: unknown): string {
  const s = _v(val);
  if (!s) return '';
  const nums = s.match(/\d+/g);
  if (!nums || nums.length === 0) return '';
  return nums.reduce((a, b) => (b.length > a.length ? b : a));
}

/** _medicare_date(val) — handles Oct-29, standard dates, pure digits → today */
function _medicare_date(val: unknown): string {
  const today = new Date();
  const s = _v(val);
  if (!s) return '';

  // Pure digits → use today
  if (/^\d+$/.test(s.trim())) {
    return formatDDMMYYYY(today);
  }

  // Month-DD pattern: e.g. "Oct-29" or "Oct 29"
  const monthDayMatch = s.trim().match(/^([A-Za-z]{2,9})[^A-Za-z0-9]*(\d{1,2})$/i);
  if (monthDayMatch) {
    const monthStr = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    if (MONTH_ABBR[monthStr] && day >= 1 && day <= 31) {
      const monthNum = MONTH_ABBR[monthStr];
      try {
        const dt = new Date(today.getFullYear(), monthNum - 1, day);
        if (!isNaN(dt.getTime()) && dt.getDate() === day) {
          return formatDDMMYYYY(dt);
        }
      } catch {
        // fall through
      }
    }
  }

  // Standard date parse
  const dt = parseFlexDate(s);
  if (dt) return formatDDMMYYYY(dt);

  // Fallback to today
  return formatDDMMYYYY(today);
}

/** _safe_filename(name) — replace spaces with _, strip specials */
function _safe_filename(name: string): string {
  const s = name.trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
  return s || 'Service';
}

// ─────────────────────────────────────────────────────────────
// DATE PARSING UTILITIES
// ─────────────────────────────────────────────────────────────

function formatDDMMYYYY(dt: Date): string {
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Flexible date parser, dayfirst preference (mirrors pandas dayfirst=True) */
function parseFlexDate(s: string): Date | null {
  if (!s) return null;
  s = s.trim();

  // DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY or DD.MM.YYYY
  let m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) {
    const d1 = parseInt(m[1]), d2 = parseInt(m[2]), y = parseInt(m[3]);
    // Try dayfirst: day=d1, month=d2
    const dt1 = new Date(y, d2 - 1, d1);
    if (!isNaN(dt1.getTime()) && dt1.getDate() === d1 && dt1.getMonth() === d2 - 1) return dt1;
    // Try monthfirst: month=d1, day=d2
    const dt2 = new Date(y, d1 - 1, d2);
    if (!isNaN(dt2.getTime()) && dt2.getDate() === d2 && dt2.getMonth() === d1 - 1) return dt2;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (!isNaN(dt.getTime()) && dt.getDate() === d) return dt;
  }

  // DD MMM YYYY or D MMM YYYY
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (m) {
    const d = parseInt(m[1]);
    const mo = MONTH_ABBR[m[2].toLowerCase()];
    const y = parseInt(m[3]);
    if (mo) {
      const dt = new Date(y, mo - 1, d);
      if (!isNaN(dt.getTime()) && dt.getDate() === d) return dt;
    }
  }

  // MMM DD, YYYY
  m = s.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mo = MONTH_ABBR[m[1].toLowerCase()];
    const d = parseInt(m[2]);
    const y = parseInt(m[3]);
    if (mo) {
      const dt = new Date(y, mo - 1, d);
      if (!isNaN(dt.getTime()) && dt.getDate() === d) return dt;
    }
  }

  // Native Date (last resort — can be ambiguous)
  const native = new Date(s);
  if (!isNaN(native.getTime())) return native;

  return null;
}

// ─────────────────────────────────────────────────────────────
// FILE READING UTILITY
// ─────────────────────────────────────────────────────────────

// File reading is now handled by lib/file-parsing.ts's readSpreadsheetRows(),
// which parses CSV as pure text (no SheetJS date/type auto-guessing) and
// reads genuine binary Excel date cells via their unambiguous stored serial.

// ─────────────────────────────────────────────────────────────
// RESULT TYPES
// ─────────────────────────────────────────────────────────────

export interface EcDupFull {
  child: string;
  i: number;
  j: number;
  ecJName: string;
  ecIName: string;
}

export interface EcDupPartial {
  child: string;
  i: number;
  j: number;
  field: string;
  value: string;
  ecJName: string;
  ecIName: string;
}

export interface Parent1Log {
  childName: string;
  childLegacy: string;
  parentName: string;
  autoId: string;
}

export interface MissingGenderEntry {
  row: number;
  name: string;
}

export interface X2XResult {
  csvBase64: string;
  filename: string;
  summary: {
    childrenProcessed: number;
    uniqueECPersons: number;
    childrenWithEC: number;
    ecProfilesDeleted: number;
    ecFieldsCleared: number;
    parent1AutoCreated: number;
    missingGenderCount: number;
    oldServiceId: string;
  };
  ecDupFull: EcDupFull[];
  ecDupPartial: EcDupPartial[];
  parent1Log: Parent1Log[];
  missingGender: MissingGenderEntry[];
}

// ─────────────────────────────────────────────────────────────
// MAIN PROCESS FUNCTION
// ─────────────────────────────────────────────────────────────

export function processX2X(
  childrenBuffer: Buffer,
  ecBuffer: Buffer,
  newServiceId: string,
  newServiceName: string,
): X2XResult {
  // ── STEP 1: Load children data ────────────────────────────
  let children = readSpreadsheetRows(childrenBuffer);

  // Truncate to "Payment Details 2" column or 112 cols
  const firstChild = children[0] ?? {};
  const allKeys = Object.keys(firstChild);
  const pay2Idx = allKeys.indexOf('Payment Details 2');
  const maxCols = pay2Idx >= 0 ? pay2Idx + 1 : 112;
  const keepKeys = allKeys.slice(0, maxCols);
  children = children.map((row) => {
    const out: Record<string, string> = {};
    for (const k of keepKeys) out[k] = row[k] ?? '';
    return out;
  });

  const oldServiceId = _v(children[0]?.['XplorServiceID'] ?? '');

  // ── STEP 2: Load Emergency Contacts data ──────────────────
  let ecRows = readSpreadsheetRows(ecBuffer);

  // Filter rows where EC First Name is present
  ecRows = ecRows.filter((r) => {
    const fn = _v(r['Emergency Contact First Name']);
    return fn !== '';
  });

  // Build _child_key and _ec_full_name
  type EcRow = {
    [key: string]: string | number;
    _child_key: string;
    _ec_full_name: string;
    _ec_num: number;
  };

  const ecWithMeta: EcRow[] = [];
  const ecNumCounter: Record<string, number> = {};

  for (const row of ecRows) {
    const childKey = `${_v(row['Child First Name'])} ${_v(row['Child Last Name'])}`.trim();
    const ecFullName = `${_v(row['Emergency Contact First Name'])} ${_v(row['Emergency Contact Last Name'] ?? '')}`.trim();
    ecNumCounter[childKey] = (ecNumCounter[childKey] ?? 0) + 1;
    ecWithMeta.push({
      ...row,
      _child_key: childKey,
      _ec_full_name: ecFullName,
      _ec_num: ecNumCounter[childKey],
    });
  }

  // Build unique EC legacy ID map
  const uniqueEcNames: string[] = [];
  const seenNames = new Set<string>();
  for (const ec of ecWithMeta) {
    if (!seenNames.has(ec._ec_full_name)) {
      seenNames.add(ec._ec_full_name);
      uniqueEcNames.push(ec._ec_full_name);
    }
  }

  const ecLegacyIdMap = new Map<string, string>();
  uniqueEcNames.forEach((name, idx) => {
    const i = idx + 1;
    const seq = i < 100 ? String(i).padStart(2, '0') : String(i);
    ecLegacyIdMap.set(name, `${oldServiceId}${seq}`);
  });

  // Group ECs by child key
  const ecByChild: Record<string, EcRow[]> = {};
  for (const ec of ecWithMeta) {
    if (!ecByChild[ec._child_key]) ecByChild[ec._child_key] = [];
    ecByChild[ec._child_key].push(ec);
  }

  // ── STEP 3: Build import rows ─────────────────────────────
  function getPrimaryCarer(row: Record<string, string>): [string, string, string] {
    for (const n of ['1', '2']) {
      if (_v(row[`IsPrimaryCarer ${n}`]).toLowerCase() === 'yes') {
        return [
          _v(row[`FirstName ${n}`]),
          _v(row[`LastName ${n}`]),
          _v(row[`Parent CRN ${n}`]),
        ];
      }
    }
    return ['', '', ''];
  }

  function ecField(ecs: EcRow[], n: number, field: string): string | number {
    const ecRow = ecs.find((e) => e._ec_num === n);
    if (!ecRow) return '';

    switch (field) {
      case 'LegacyID':          return ecLegacyIdMap.get(ecRow._ec_full_name) ?? '';
      case 'First_Name':        return _v(ecRow['Emergency Contact First Name']);
      case 'Last_Name':         return _v(ecRow['Emergency Contact Last Name']);
      case 'Contact_Number':    return _phone(ecRow['Emergency Contact Number']);
      case 'Address': {
        const a1 = _v(ecRow['Emergency Contact Address']);
        const a2 = _v(ecRow['Emergency Contact Address 2']);
        return a2 ? `${a1} ${a2}`.trim() : a1;
      }
      case 'Suburb':            return _v(ecRow['Emergency Contact Suburb']);
      case 'Postcode':          return ''; // not in EC report
      case 'Country':           return _v(ecRow['Emergency Contact Country']);
      case 'State':             return _v(ecRow['Emergency Contact State']);
      case 'Email':             return _v(ecRow['Emergency Contact Email']);
      case 'Emergency_Contact': return _ec_perm(ecRow['Emergency Contact']);
      case 'Medical_Nominee':   return _ec_perm(ecRow['Medical']);
      case 'Collection_Nominee':return _ec_perm(ecRow['Collection']);
      case 'Excursion_Nominee': return _ec_perm(ecRow['Excursion']);
      default:                  return '';
    }
  }

  // Build EC column block for a given slot n
  function buildECBlock(ecs: EcRow[], n: number): Record<string, string | number> {
    const block: Record<string, string | number> = {};
    for (const f of EC_PROFILE_FIELDS) {
      block[`EmergencyContact${n}_${f}`] = ecField(ecs, n, f);
    }
    return block;
  }

  const importRows: Record<string, string | number>[] = [];

  for (const c of children) {
    const childKey = `${_v(c['ChildFirst'])} ${_v(c['ChildLast'])}`.trim();
    const [pcFirst, pcLast, pcCrn] = getPrimaryCarer(c);
    const ecs = ecByChild[childKey] ?? [];

    const row: Record<string, string | number> = {
      ServiceID:                    newServiceId,
      Service_Name:                 newServiceName,
      Child_Legacy_Id:              _v(c['ChildID']),
      Child_First_Name:             _v(c['ChildFirst']),
      Child_Middle_Name:            _v(c['ChildMiddle']),
      Child_Last_Name:              _v(c['ChildLast']),
      Gender:                       _v(c['Gender']),
      DOB:                          _date(c['DOB']),
      Special_Circumstances:        _v(c['Special Circumstances']),
      School:                       _v(c['School']),
      Class:                        _v(c['Class']),
      Consents_Photos:              _yn(c['Consents Photos & Videos']),
      Status:                       _v(c['Child Status']),
      Address:                      _v(c['Address']),
      Suburb:                       _v(c['Suburb']),
      Country:                      _v(c['Country']),
      State:                        _v(c['State']),
      PostCode:                     _postcode(c['Postcode']),
      Religion:                     _v(c['Religion']),
      Language:                     _v(c['Language']),
      Cultural_Background:          _v(c['Cultural Background']),
      Cultural_Requirements:        _v(c['Cultural Requirements']),
      Indigenous_Status:            _v(c['Indigenous Status']),
      Medicare_Number:              _medicare(c['Medicare Number']),
      Medicare_Expiry_Date:         _medicare_date(c['Medicare Expiry Date']),
      Ambulance_Cover_Number:       _v(c['Ambulance Cover Number']),
      Health_Care_Centre:           _v(c['Health Care Centre']),
      Medical_Practitioner_Name:    _v(c['Medical Practitioner Name']),
      Medical_Practitioner_Phone:   _phone(c['Medical Practitioner Phone']),
      Medical_Practitioner_Address: _v(c['Medical Practitioner Address']),
      Medical_Conditions:           _v(c['Medical Conditions']),
      Prescribed_Medications:       _v(c['Prescribed Medications']),
      Allergies_by_choice:          _v(c['Allergies by choice']),
      Medical_Allergies:            _v(c['Medical Allergies']),
      Diet:                         _v(c['Diet']),
      'Epipen/Anipen':              _v(c['Epipen/Anipen']),
      Child_CRN:                    _v(c['Child CRN']),
      Room_Name:                    _v(c['RoomName']),
      Enrolment_Start_Date:         _date(c['Enrolment Start Date']),
      Enrolment_Parent_First:       pcFirst,
      Enrolment_Parent_Last:        pcLast,
      Enrolment_Parent_CRN:         pcCrn,

      Parent1_Title:                _v(c['Title 1']),
      Parent1_First_Name:           _v(c['FirstName 1']),
      Parent1_Middle_Name:          _v(c['MiddleName 1']),
      Parent1_Last_Name:            _v(c['LastName 1']),
      Parent1_CRN:                  _v(c['Parent CRN 1']),
      Parent1_Legacy_Account_ID:    _v(c['ParentID 1']),
      Parent1_Gender:               _v(c['Gender 1']),
      Parent1_DOB:                  _date(c['Parent DOB 1']),
      Parent1_Email:                _v(c['Email 1']),
      Parent1_Contact_Mobile:       _phone(c['Mobile 1']),
      Parent1_Contact_Home:         _phone(c['Contact No 1']),
      Parent1_Address_1:            _v(c['Address Line 1 1']),
      Parent1_Address_2:            _v(c['Address Line 2 1']),
      Parent1_Suburb:               _v(c['Suburb 1']),
      Parent1_State:                _v(c['State 1']),
      Parent1_Post_Code:            _postcode(c['Postcode 1']),
      Parent1_Indigenous_Status:    _v(c['Indigenous Status 1']),
      Parent1_Language:             _v(c['Language 1']),
      Parent1_Cultural_Background:  _v(c['Cultural Background 1']),
      Parent1_Work_Email:           _v(c['Work Email 1']),
      Parent1_Work_Phone:           _phone(c['Work Phone 1']),
      Parent1_Work_Address:         _v(c['Work Address 1']),
      Parent1_Work_Suburb:          _v(c['Work Suburb 1']),
      Parent1_Work_Postcode:        _postcode(c['Work Postcode 1']),
      Parent1_Work_Country:         _v(c['Work Country 1']),
      Parent1_Work_State:           _v(c['Work State 1']),

      Parent2_Legacy_Account_ID:    _v(c['ParentID 2']),
      Parent2_Title:                _v(c['Title 2']),
      Parent2_First_Name:           _v(c['FirstName 2']),
      Parent2_Middle_Name:          _v(c['MiddleName 2']),
      Parent2_Last_Name:            _v(c['LastName 2']),
      Parent2_CRN:                  _v(c['Parent CRN 2']),
      Parent2_Gender:               _v(c['Gender 2']),
      Parent2_DOB:                  _date(c['Parent DOB 2']),
      Parent2_Email:                _v(c['Email 2']),
      Parent2_Contact_Mobile:       _phone(c['Mobile 2']),
      Parent2_Contact_Home:         _phone(c['Contact No 2']),
      Parent2_Address_1:            _v(c['Address Line 1 2']),
      Parent2_Address_2:            _v(c['Address Line 2 2']),
      Parent2_Suburb:               _v(c['Suburb 2']),
      Parent2_State:                _v(c['State 2']),
      Parent2_Post_Code:            _postcode(c['Postcode 2']),
      Parent2_Indigenous_Status:    _v(c['Indigenous Status 2']),
      Parent2_Language:             _v(c['Language 2']),
      Parent2_Cultural_Background:  _v(c['Cultural Background 2']),
      Parent2_Work_Email:           _v(c['Work Email 2']),
      Parent2_Work_Phone:           _phone(c['Work Phone 2']),
      Parent2_Work_Address:         _v(c['Work Address 2']),
      Parent2_Work_Suburb:          _v(c['Work Suburb 2']),
      Parent2_Work_Postcode:        _postcode(c['Work Postcode 2']),
      Parent2_Work_Country:         _v(c['Work Country 2']),
      Parent2_Work_State:           _v(c['Work State 2']),

      ...buildECBlock(ecs, 1),
      ...buildECBlock(ecs, 2),
      ...buildECBlock(ecs, 3),
      ...buildECBlock(ecs, 4),
      ...buildECBlock(ecs, 5),
    };

    // Replace stray "0" values
    for (const [k, v] of Object.entries(row)) {
      if (v === '0' || v === 0) row[k] = '';
    }

    importRows.push(row);
  }

  // ── STEP 4: EC Duplicate Check ────────────────────────────
  const ecDupFull: EcDupFull[] = [];
  const ecDupPartial: EcDupPartial[] = [];
  let fullDeletes = 0;
  let partialClears = 0;

  for (const row of importRows) {
    const childName = `${row['Child_First_Name']} ${row['Child_Last_Name']}`.trim();

    for (let i = 1; i <= 4; i++) {
      const iFn = `EmergencyContact${i}_First_Name`;
      const iLn = `EmergencyContact${i}_Last_Name`;
      const iPh = `EmergencyContact${i}_Contact_Number`;
      const iEm = `EmergencyContact${i}_Email`;

      const iFirst = _norm(row[iFn]);
      const iLast  = _norm(row[iLn]);
      const iPhone = _norm(row[iPh]);
      const iEmail = _norm(row[iEm]);

      if (!iFirst) continue;

      const iDisplay = `${row[iFn]} ${row[iLn]}`.trim();

      for (let j = i + 1; j <= 5; j++) {
        const jFn = `EmergencyContact${j}_First_Name`;
        const jLn = `EmergencyContact${j}_Last_Name`;
        const jPh = `EmergencyContact${j}_Contact_Number`;
        const jEm = `EmergencyContact${j}_Email`;

        const jFirst = _norm(row[jFn]);
        const jLast  = _norm(row[jLn]);
        const jPhone = _norm(row[jPh]);
        const jEmail = _norm(row[jEm]);

        if (!jFirst) continue;

        const jDisplay   = `${row[jFn]} ${row[jLn]}`.trim();
        const nameMatch  = iFirst === jFirst && iLast === jLast;
        const phoneMatch = !!(iPhone && jPhone && iPhone === jPhone);
        const emailMatch = !!(iEmail && jEmail && iEmail === jEmail);

        if (nameMatch) {
          ecDupFull.push({ child: childName, i, j, ecJName: String(jDisplay), ecIName: String(iDisplay) });
          for (const f of EC_PROFILE_FIELDS) {
            row[`EmergencyContact${j}_${f}`] = '';
          }
          fullDeletes++;
        } else {
          if (phoneMatch) {
            const origVal = String(row[jPh]);
            ecDupPartial.push({
              child: childName, i, j, field: 'Phone',
              value: origVal, ecJName: String(jDisplay), ecIName: String(iDisplay),
            });
            row[jPh] = '';
            partialClears++;
          }
          if (emailMatch) {
            const origVal = String(row[jEm]);
            ecDupPartial.push({
              child: childName, i, j, field: 'Email',
              value: origVal, ecJName: String(jDisplay), ecIName: String(iDisplay),
            });
            row[jEm] = '';
            partialClears++;
          }
        }
      }
    }
  }

  // ── STEP 5: Missing Parent 1 — Auto-Create ────────────────
  const parent1Log: Parent1Log[] = [];
  let p1Counter = 0;

  for (const row of importRows) {
    if (String(row['Parent1_First_Name'] ?? '').trim() !== '') continue;
    p1Counter++;
    const autoId = `9999_${String(p1Counter).padStart(4, '0')}`;
    const childFirst  = String(row['Child_First_Name'] ?? '');
    const childLast   = String(row['Child_Last_Name']  ?? '');
    const childLegacy = String(row['Child_Legacy_Id']  ?? '');

    row['Parent1_First_Name']        = 'Parent First';
    row['Parent1_Last_Name']         = childLast;
    row['Parent1_Gender']            = 'Female';
    row['Parent1_Legacy_Account_ID'] = autoId;

    parent1Log.push({
      childName:   `${childFirst} ${childLast}`.trim(),
      childLegacy,
      parentName:  `Parent First ${childLast}`.trim(),
      autoId,
    });
  }

  // ── Missing Gender tracking ───────────────────────────────
  const missingGender: MissingGenderEntry[] = [];
  importRows.forEach((row, idx) => {
    if (String(row['Gender'] ?? '').trim() === '') {
      missingGender.push({
        row: idx + 2, // CSV row number (1-based header + 1)
        name: `${row['Child_First_Name']} ${row['Child_Last_Name']}`.trim(),
      });
    }
  });

  // ── STEP 6: Build CSV in memory ───────────────────────────
  const columnList = [...IMPORT_COLUMNS] as string[];
  const csvLines: string[] = [columnList.join(',')];

  for (const row of importRows) {
    const values = columnList.map((col) => {
      const val = row[col] ?? '';
      const s = String(val);
      // Quote cells containing commas, quotes, or newlines
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    csvLines.push(values.join(','));
  }

  const csvContent = '\uFEFF' + csvLines.join('\r\n'); // UTF-8 BOM
  const csvBase64 = Buffer.from(csvContent, 'utf-8').toString('base64');

  const childrenWithEC = importRows.filter(
    (r) => String(r['EmergencyContact1_First_Name'] ?? '').trim() !== '',
  ).length;

  const safeName = _safe_filename(newServiceName);

  return {
    csvBase64,
    filename: `${safeName}_PC_Import.csv`,
    summary: {
      childrenProcessed:   importRows.length,
      uniqueECPersons:     ecLegacyIdMap.size,
      childrenWithEC,
      ecProfilesDeleted:   fullDeletes,
      ecFieldsCleared:     partialClears,
      parent1AutoCreated:  parent1Log.length,
      missingGenderCount:  missingGender.length,
      oldServiceId,
    },
    ecDupFull,
    ecDupPartial,
    parent1Log,
    missingGender,
  };
}

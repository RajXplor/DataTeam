import { cleanValue } from './cleanValue'
import { normalisePhone } from './phone'
import { normalisePostcode } from './postcode'
import { formatDate, formatYN } from './dateUtils'
import { cleanMedicareNumber, parseMedicareExpiry } from './medicare'
import { deduplicateECs } from './ecDedup'
import { applyParent1 } from './parent1'
import { AuditEvent, AuditReport, MigrationResult } from '../types/audit'
import { EC_PROFILE_FIELDS, IMPORT_COLUMNS } from '../constants'
import { safeFilename } from '../utils'

type Row = Record<string, string>

function cv(row: Row, key: string): string {
  return cleanValue(row[key] ?? '')
}

function ecPerm(val: string | number | undefined): string {
  return cleanValue(String(val ?? '')).toLowerCase() === 'yes' ? '1' : ''
}

/**
 * Full migration pipeline — TypeScript port of the Python process() function.
 * Runs entirely client-side; onStep is called for UI progress updates.
 */
export async function runMigration(
  childRows: Row[],
  ecRows: Row[],
  newServiceId: string,
  newServiceName: string,
  onStep: (msg: string) => void,
): Promise<MigrationResult> {

  // ── Step 1: Trim child columns to Payment Details 2 boundary ──────────────
  onStep('Trimming children data to relevant columns…')
  const trimmedChildren: Row[] = childRows.map(r => {
    const entries = Object.entries(r)
    const idx = entries.findIndex(([k]) => k.trim() === 'Payment Details 2')
    const cutoff = idx >= 0 ? idx + 1 : 112
    return Object.fromEntries(entries.slice(0, cutoff).map(([k, v]) => [k.trim(), v]))
  })

  const oldServiceId = cleanValue(trimmedChildren[0]?.['XplorServiceID'] ?? '')

  // ── Step 2: Build EC lookup ───────────────────────────────────────────────
  onStep('Building Emergency Contact lookup…')

  const filteredEC = ecRows
    .map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), String(v ?? '')])) as Row)
    .filter(r => r['Emergency Contact First Name'].trim() !== '')

  // Assign _child_key, _ec_full_name per row
  const childECCount: Record<string, number> = {}
  const ecProcessed: ECRow[] = filteredEC.map(r => {
    const ck = `${r['Child First Name'].trim()} ${r['Child Last Name'].trim()}`.trim()
    childECCount[ck] = (childECCount[ck] ?? 0) + 1
    const fn = `${r['Emergency Contact First Name'].trim()} ${r['Emergency Contact Last Name'].trim()}`.trim()
    return { ...r, _child_key: ck, _ec_full_name: fn, _ec_num: childECCount[ck] } as ECRow
  })

  // Build unique-name → legacy ID map
  const seenNames: string[] = []
  const ecLegacyMap: Record<string, string> = {}
  for (const r of ecProcessed) {
    if (!ecLegacyMap[r._ec_full_name]) {
      seenNames.push(r._ec_full_name)
      const seq = String(seenNames.length).padStart(2, '0')
      ecLegacyMap[r._ec_full_name] = `${oldServiceId}${seq}`
    }
  }

  // Group by child key
  const ecByChild: Record<string, typeof ecProcessed> = {}
  for (const r of ecProcessed) {
    if (!ecByChild[r._child_key]) ecByChild[r._child_key] = []
    ecByChild[r._child_key].push(r)
  }

  // ── Step 3: Primary carer helper ──────────────────────────────────────────
  function getPrimaryCarer(row: Row): [string, string, string] {
    for (const n of ['1', '2']) {
      if (cleanValue(row[`IsPrimaryCarer ${n}`]).toLowerCase() === 'yes') {
        return [cv(row, `FirstName ${n}`), cv(row, `LastName ${n}`), cv(row, `Parent CRN ${n}`)]
      }
    }
    return ['', '', '']
  }

  // ── Step 4: EC field resolver ─────────────────────────────────────────────
  type ECRow = Record<string, string> & { _child_key: string; _ec_full_name: string; _ec_num: number }

  function ecField(ecs: ECRow[], n: number, field: string): string {
    const found = ecs.find(e => e._ec_num === n)
    if (!found) return ''
    if (field === 'LegacyID')        return ecLegacyMap[found._ec_full_name] ?? ''
    if (field === 'First_Name')      return cleanValue(found['Emergency Contact First Name'])
    if (field === 'Last_Name')       return cleanValue(found['Emergency Contact Last Name'])
    if (field === 'Contact_Number')  return normalisePhone(found['Emergency Contact Number'])
    if (field === 'Address') {
      const a1 = cleanValue(found['Emergency Contact Address'])
      const a2 = cleanValue(found['Emergency Contact Address 2'])
      return a2 ? `${a1} ${a2}`.trim() : a1
    }
    if (field === 'Suburb')              return cleanValue(found['Emergency Contact Suburb'])
    if (field === 'Postcode')            return ''
    if (field === 'Country')             return cleanValue(found['Emergency Contact Country'])
    if (field === 'State')               return cleanValue(found['Emergency Contact State'])
    if (field === 'Email')               return cleanValue(found['Emergency Contact Email'])
    if (field === 'Emergency_Contact')   return ecPerm(found['Emergency Contact'])
    if (field === 'Medical_Nominee')     return ecPerm(found['Medical'])
    if (field === 'Collection_Nominee')  return ecPerm(found['Collection'])
    if (field === 'Excursion_Nominee')   return ecPerm(found['Excursion'])
    return ''
  }

  // ── Step 5: Build import rows ─────────────────────────────────────────────
  onStep('Building import rows…')
  const importRows: Row[] = []

  for (const c of trimmedChildren) {
    const childKey  = `${cv(c, 'ChildFirst')} ${cv(c, 'ChildLast')}`.trim()
    const [pcFirst, pcLast, pcCrn] = getPrimaryCarer(c)
    const ecs = ecByChild[childKey] ?? []

    const row: Row = {
      ServiceID:                    newServiceId,
      Service_Name:                 newServiceName,
      Child_Legacy_Id:              cv(c, 'ChildID'),
      Child_First_Name:             cv(c, 'ChildFirst'),
      Child_Middle_Name:            cv(c, 'ChildMiddle'),
      Child_Last_Name:              cv(c, 'ChildLast'),
      Gender:                       cv(c, 'Gender'),
      DOB:                          formatDate(c['DOB']),
      Special_Circumstances:        cv(c, 'Special Circumstances'),
      School:                       cv(c, 'School'),
      Class:                        cv(c, 'Class'),
      Consents_Photos:              formatYN(c['Consents Photos & Videos']),
      Status:                       cv(c, 'Child Status'),
      Address:                      cv(c, 'Address'),
      Suburb:                       cv(c, 'Suburb'),
      Country:                      cv(c, 'Country'),
      State:                        cv(c, 'State'),
      PostCode:                     normalisePostcode(c['Postcode']),
      Religion:                     cv(c, 'Religion'),
      Language:                     cv(c, 'Language'),
      Cultural_Background:          cv(c, 'Cultural Background'),
      Cultural_Requirements:        cv(c, 'Cultural Requirements'),
      Indigenous_Status:            cv(c, 'Indigenous Status'),
      Medicare_Number:              cleanMedicareNumber(c['Medicare Number']),
      Medicare_Expiry_Date:         parseMedicareExpiry(c['Medicare Expiry Date']),
      Ambulance_Cover_Number:       cv(c, 'Ambulance Cover Number'),
      Health_Care_Centre:           cv(c, 'Health Care Centre'),
      Medical_Practitioner_Name:    cv(c, 'Medical Practitioner Name'),
      Medical_Practitioner_Phone:   normalisePhone(c['Medical Practitioner Phone']),
      Medical_Practitioner_Address: cv(c, 'Medical Practitioner Address'),
      Medical_Conditions:           cv(c, 'Medical Conditions'),
      Prescribed_Medications:       cv(c, 'Prescribed Medications'),
      Allergies_by_choice:          cv(c, 'Allergies by choice'),
      Medical_Allergies:            cv(c, 'Medical Allergies'),
      Diet:                         cv(c, 'Diet'),
      'Epipen/Anipen':              cv(c, 'Epipen/Anipen'),
      Child_CRN:                    cv(c, 'Child CRN'),
      Room_Name:                    cv(c, 'RoomName'),
      Enrolment_Start_Date:         formatDate(c['Enrolment Start Date']),
      Enrolment_Parent_First:       pcFirst,
      Enrolment_Parent_Last:        pcLast,
      Enrolment_Parent_CRN:         pcCrn,
      // Parent 1
      Parent1_Title:                cv(c, 'Title 1'),
      Parent1_First_Name:           cv(c, 'FirstName 1'),
      Parent1_Middle_Name:          cv(c, 'MiddleName 1'),
      Parent1_Last_Name:            cv(c, 'LastName 1'),
      Parent1_CRN:                  cv(c, 'Parent CRN 1'),
      Parent1_Legacy_Account_ID:    cv(c, 'ParentID 1'),
      Parent1_Gender:               cv(c, 'Gender 1'),
      Parent1_DOB:                  formatDate(c['Parent DOB 1']),
      Parent1_Email:                cv(c, 'Email 1'),
      Parent1_Contact_Mobile:       normalisePhone(c['Mobile 1']),
      Parent1_Contact_Home:         normalisePhone(c['Contact No 1']),
      Parent1_Address_1:            cv(c, 'Address Line 1 1'),
      Parent1_Address_2:            cv(c, 'Address Line 2 1'),
      Parent1_Suburb:               cv(c, 'Suburb 1'),
      Parent1_State:                cv(c, 'State 1'),
      Parent1_Post_Code:            normalisePostcode(c['Postcode 1']),
      Parent1_Indigenous_Status:    cv(c, 'Indigenous Status 1'),
      Parent1_Language:             cv(c, 'Language 1'),
      Parent1_Cultural_Background:  cv(c, 'Cultural Background 1'),
      Parent1_Work_Email:           cv(c, 'Work Email 1'),
      Parent1_Work_Phone:           normalisePhone(c['Work Phone 1']),
      Parent1_Work_Address:         cv(c, 'Work Address 1'),
      Parent1_Work_Suburb:          cv(c, 'Work Suburb 1'),
      Parent1_Work_Postcode:        normalisePostcode(c['Work Postcode 1']),
      Parent1_Work_Country:         cv(c, 'Work Country 1'),
      Parent1_Work_State:           cv(c, 'Work State 1'),
      // Parent 2
      Parent2_Legacy_Account_ID:    cv(c, 'ParentID 2'),
      Parent2_Title:                cv(c, 'Title 2'),
      Parent2_First_Name:           cv(c, 'FirstName 2'),
      Parent2_Middle_Name:          cv(c, 'MiddleName 2'),
      Parent2_Last_Name:            cv(c, 'LastName 2'),
      Parent2_CRN:                  cv(c, 'Parent CRN 2'),
      Parent2_Gender:               cv(c, 'Gender 2'),
      Parent2_DOB:                  formatDate(c['Parent DOB 2']),
      Parent2_Email:                cv(c, 'Email 2'),
      Parent2_Contact_Mobile:       normalisePhone(c['Mobile 2']),
      Parent2_Contact_Home:         normalisePhone(c['Contact No 2']),
      Parent2_Address_1:            cv(c, 'Address Line 1 2'),
      Parent2_Address_2:            cv(c, 'Address Line 2 2'),
      Parent2_Suburb:               cv(c, 'Suburb 2'),
      Parent2_State:                cv(c, 'State 2'),
      Parent2_Post_Code:            normalisePostcode(c['Postcode 2']),
      Parent2_Indigenous_Status:    cv(c, 'Indigenous Status 2'),
      Parent2_Language:             cv(c, 'Language 2'),
      Parent2_Cultural_Background:  cv(c, 'Cultural Background 2'),
      Parent2_Work_Email:           cv(c, 'Work Email 2'),
      Parent2_Work_Phone:           normalisePhone(c['Work Phone 2']),
      Parent2_Work_Address:         cv(c, 'Work Address 2'),
      Parent2_Work_Suburb:          cv(c, 'Work Suburb 2'),
      Parent2_Work_Postcode:        normalisePostcode(c['Work Postcode 2']),
      Parent2_Work_Country:         cv(c, 'Work Country 2'),
      Parent2_Work_State:           cv(c, 'Work State 2'),
    }

    // Emergency Contacts 1–5
    for (let n = 1; n <= 5; n++) {
      for (const f of EC_PROFILE_FIELDS) {
        row[`EmergencyContact${n}_${f}`] = ecField(ecs, n, f)
      }
    }

    // Clean stray "0" values (mirroring Python replace({0: ""}) step)
    for (const key of Object.keys(row)) {
      if (row[key] === '0') row[key] = ''
    }

    importRows.push(row)
  }

  // ── Step 6: EC deduplication ──────────────────────────────────────────────
  onStep('Deduplicating Emergency Contacts…')
  const ecAuditEvents: AuditEvent[] = []
  const deduped = deduplicateECs(importRows as Record<string, string>[], ecAuditEvents)

  // ── Step 7: Parent 1 check ────────────────────────────────────────────────
  onStep('Checking Parent 1 records…')
  const p1AuditEvents: AuditEvent[] = []
  const withParent1 = applyParent1(deduped, p1AuditEvents)

  // ── Step 8: Missing gender ────────────────────────────────────────────────
  onStep('Scanning for missing Gender values…')
  const genderEvents: AuditEvent[] = []
  withParent1.forEach((row, idx) => {
    if (!String(row['Gender'] ?? '').trim()) {
      genderEvents.push({
        type:          'missing_gender',
        childName:     `${row['Child_First_Name'] ?? ''} ${row['Child_Last_Name'] ?? ''}`.trim(),
        childLegacyId: row['Child_Legacy_Id'] ?? '',
        csvRow:        idx + 2,
      })
    }
  })

  // ── Build audit report ────────────────────────────────────────────────────
  const audit: AuditReport = {
    ecFullDeletes:  ecAuditEvents.filter(e => e.type === 'ec_full_delete'),
    ecPartialClears: ecAuditEvents.filter(e => e.type !== 'ec_full_delete'),
    parent1Created: p1AuditEvents,
    missingGender:  genderEvents,
  }

  // ── Order output by IMPORT_COLUMNS ───────────────────────────────────────
  const orderedRows = withParent1.map(row => {
    const ordered: Row = {}
    for (const col of IMPORT_COLUMNS) ordered[col] = row[col] ?? ''
    return ordered
  })

  const childrenWithEC = orderedRows.filter(
    r => String(r['EmergencyContact1_First_Name'] ?? '').trim() !== '',
  ).length

  return {
    rows: orderedRows,
    audit,
    stats: {
      childrenCount:   orderedRows.length,
      uniqueECPersons: seenNames.length,
      childrenWithEC,
      ecFullDeletes:   audit.ecFullDeletes.length,
      ecPartialClears: audit.ecPartialClears.length,
      parent1Created:  audit.parent1Created.length,
      missingGender:   audit.missingGender.length,
      oldServiceId,
    },
    outputFilename: `${safeFilename(newServiceName)}_PC_Import.csv`,
  }
}

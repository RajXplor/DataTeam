# X2X Migration Automation

**Automated data transformation tool for migrating children and emergency contact records from Xplor/QikKids into the PC Import format.**

Built and maintained by [7GoneInsane](https://github.com/7goneinsane) · Current version: `v4`

---

## Overview

This script reads your exported Xplor/QikKids data files, cleans and transforms every field to match the PC Import specification, runs a full data quality audit, and produces a ready-to-import CSV — all in one double-click.

No technical knowledge required. No renaming of files. No manual formatting.

---

## Features

| Area | What it does |
|---|---|
| 📁 **Auto file detection** | Finds input files by keyword — no fixed filenames needed |
| 📞 **Phone normalisation** | Strips spaces and symbols, adds leading `0`, outputs 10 digits — handles Excel float format |
| 📮 **Postcode cleaning** | Enforces strict 4-digit format, preserves NT postcodes (e.g. `0800`) |
| 📅 **Date standardisation** | All dates formatted as `dd/mm/yyyy` |
| 🏥 **Medicare Number** | Strips reference text (`Ref no.`, `NO:`, `REF:`) — returns digits only |
| 🗓️ **Medicare Expiry Date** | Handles `Oct-29`, `12/12/2025`, and unrecognised values (falls back to today) |
| 👤 **Emergency Contact deduplication** | Full profile delete or field-level clear, with a detailed audit trail |
| 🧑‍🤝‍🧑 **Parent 1 auto-creation** | Generates a placeholder Parent 1 where none exists, flagged for review |
| 📄 **Named output file** | Output saved as `{ServiceName}_PC_Import.csv` |
| 📋 **Audit report** | Printed to the console on every run — EC changes, parent creation, missing gender |

---

## Requirements

- Python 3.9 or later
- The following Python packages (install once):

```bash
pip install pandas openpyxl xlrd
```

---

## Input Files

Place both files in the **same folder as the script**. They will be detected automatically — no renaming needed.

| File | Name must contain | Accepted formats |
|---|---|---|
| Children data | `child_data_master` | `.csv` `.xlsx` `.xlsm` `.xls` |
| Emergency contacts | `Emergency_contact_reports` | `.csv` `.xlsx` `.xlsm` `.xls` |

**Valid filename examples**

```
child_data_master.csv
2025_child_data_master.xlsx
Emergency_contact_reports_Jan2025.csv
backup_Emergency_contact_reports.xlsx
```

---

## How to Run

**Option 1 — Double-click (recommended for non-technical users)**

Just double-click `X2X_automation.py`. You will be prompted to enter:

```
New Service ID    : [type here]
New Service Name  : [type here]
```

The script will find your files, process everything, and print the results.

**Option 2 — Command line**

```bash
python X2X_automation.py
```

With optional arguments:

```bash
python X2X_automation.py \
  --children path/to/child_data_master.csv \
  --ec path/to/Emergency_contact_reports.xlsx \
  --service_id XP123 \
  --service_name "Sunshine Early Learning" \
  --output custom_output.csv
```

---

## Output

A single CSV file saved in the same folder as the script:

```
{ServiceName}_PC_Import.csv
```

For example, if your service name is `Sunshine Early Learning` the output will be:

```
Sunshine_Early_Learning_PC_Import.csv
```

---

## Data Cleaning Rules

### Phone Numbers
All phone fields are normalised to **10 digits, leading `0`, no spaces or symbols**.

| Input | Output |
|---|---|
| `0412 345 678` | `0412345678` |
| `04-12-34-56-78` | `0412345678` |
| `+61 412 345 678` | `0412345678` |
| `412345678.0` *(Excel float)* | `0412345678` |
| `4.12345678E+08` *(Excel scientific)* | `0412345678` |

Applies to: `Medical_Practitioner_Phone`, `Parent1_Contact_Mobile`, `Parent1_Contact_Home`, `Parent1_Work_Phone`, `Parent2_Contact_Mobile`, `Parent2_Contact_Home`, `Parent2_Work_Phone`, `EmergencyContact1–5_Contact_Number`

### Medicare Number
Returns digits only — strips all trailing reference text.

| Input | Output |
|---|---|
| `6298893672 Ref no. 2` | `6298893672` |
| `NO: 6235457157  REF:5` | `6235457157` |

### Medicare Expiry Date
| Input | Output |
|---|---|
| `12/12/2025` | `12/12/2025` |
| `Oct-29` | `29/10/2026` |
| `Sept-29` | `29/09/2026` |
| `May-28` | `28/05/2026` |
| `92029` *(unrecognised)* | today's date |

---

## Audit Report

After every run, the console prints a full audit covering three areas:

### 1 — Emergency Contact Duplicates

Compares all EC slots for each child. EC1 is the reference — any later slot is checked against it.

- **Full duplicate** (same first + last name) → entire later profile deleted
- **Partial duplicate** (same phone or email, different name) → that field only is cleared

Every change is listed with the child name, which slots were compared, and what was removed.

### 2 — Parent 1 Auto-Created ⚠️

If a child has no Parent 1 record, a placeholder is inserted:

| Field | Value |
|---|---|
| First Name | `Parent First` |
| Last Name | Child's last name |
| Gender | `Female` |
| Legacy Account ID | `AP1-0001` (auto-incremented) |

**These records must be reviewed and corrected before importing.** They are flagged prominently in the console output.

### 3 — Missing Gender

Lists the exact cell reference in the output CSV (e.g. `G14`) for any child with no gender value, so you can fill them in quickly before importing.

---

## Folder Structure

```
📁 your-migration-folder/
├── X2X_automation.py                         ← the script
├── child_data_master.csv                     ← input (any name containing keyword)
├── Emergency_contact_reports.xlsx            ← input (any name containing keyword)
└── Sunshine_Early_Learning_PC_Import.csv     ← output (auto-generated)
```

---

## After Running

Before importing into the new service, check:

1. **Review all auto-created Parent 1 records** — listed in the console and flagged clearly
2. **Fill in any blank Gender cells** — the audit tells you exactly which rows
3. **Verify postcodes** look correct (4 digits)
4. **Save the CSV as UTF-8** if re-saving from Excel
5. **Import** into the new service

---

## Version History

| Version | Changes |
|---|---|
| `v4` | Fixed Excel float phone bug · Added Medicare number + expiry date cleaning · ServiceName output filename |
| `v3` | Phone leading-0 logic · Strict 4-digit postcodes · ServiceName output prefix |
| `v2` | Auto file detection · EC duplicate removal · Parent 1 auto-creation · Audit report |
| `v1` | Initial release |

---

## Support

Raise an issue in this repository or contact the maintainer directly.

---

*Developed by 7GoneInsane · For internal migration use only*

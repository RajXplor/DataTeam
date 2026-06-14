# 💳 Parent Token & No Banking Report Generator

> Automates parent token matching and no-banking identification for childcare service migrations on the Xplor platform.

Developed by **7GONEINSANE**

---

## Overview

This tool reads your raw Xplor export files, matches parent records across multiple data sources, and produces three clean outputs — a token import CSV ready for upload, a duplicate gateway review sheet, and a no-banking report — all without touching a single formula in Excel.

---

## Quick Start

1. Place `ParentToken_Report_Generator.py` and `RUN PARENT TOKEN GENERATOR.bat` in a folder
2. Drop your input files into the same folder (see [Input Files](#input-files) below)
3. Double-click **`RUN PARENT TOKEN GENERATOR.bat`**
4. Enter `Yes` or `No` when prompted about the bank summary file
5. Collect your output files from the same folder

> **Python required.** The `.bat` file auto-installs `pandas` and `openpyxl` if they are missing.

---

## Input Files

Files are **auto-detected by name** — no renaming required. The script scans the folder and matches by keyword, so date-stamped filenames like `guardian_financial_account_list_2026-04-16_01_16_25.csv` are found automatically.

| Keyword matched | Example filename | Required |
|---|---|:---:|
| `payment_plan` | `Larmenier_OSHC_payment_plan_import.csv` | ✅ |
| `ds` + `token` | `Larmenier_OSHC_DS_TOKENS.csv` | ✅ |
| `guardian_financial` | `guardian_financial_account_list_2026-...csv` | ✅ |
| `parent_bank` | `parent_bank_details_summary_report_...csv` | Optional |

Supported formats: `.csv`, `.xlsx`, `.xlsm`, `.xls`

---

## Output Files

| File | Description |
|---|---|
| `ParentToken_Import_{ServiceName}.csv` | Two-column CSV — `Parent ID` and `Token` — ready to import |
| `{ServiceName}_DuplicateGateway_Review.xlsx` | Parents with more than one gateway reference flagged for manual review |
| `{ServiceName}_No_BankingReport.xlsx` | Parents with no banking details on file, with colour-coded notes |

---

## Matching Logic

The script processes every row in the payment plan and applies the following logic in order:

```
Payment plan row
       │
       ├─ Parent has 2+ gateway refs?
       │       └─ → Duplicate Gateway Review sheet (excluded from import)
       │
       ├─ Gateway reference found in DS Tokens?
       │       └─ No → logged to console, excluded from import
       │
       ├─ Parent name found in Guardian Financial Account list?
       │       └─ No → logged to console with reason, excluded from import
       │
       ├─ Child name matches the Guardian list entry?
       │       └─ No → logged to console, excluded from import
       │
       └─ All checks passed → written to ParentToken_Import.csv ✅
```

---

## No Banking Report

Generated when you answer **Yes** to the bank summary prompt.

The script reads only rows where `Bank Details (Y/N)` = `No` from the bank summary file, then looks up each parent's children from the guardian list and applies the following colour-coded notes:

| Note | Colour | Condition |
|---|:---:|---|
| `Review` | 🟡 Yellow | Parent exists in DS Tokens with a valid gateway |
| `Cancelled - No billing since 31/12/2019` | 🟠 Orange | Parent's DS Token entry shows `N/a` or a cancelled (`XXXDONOTBILL`) gateway |
| `Not found` | — | Parent not found anywhere in DS Tokens |

> `Gateway Reference` column is intentionally left blank for manual completion.

---

## Report Formatting

Both Excel outputs use:
- **Font:** Aptos 11pt
- **Alignment:** All cells centred horizontally and vertically
- **Column widths:** Auto-fitted to content (no manual adjustment needed)
- **Row heights:** Auto-fitted based on text wrap
- **Header row:** Dark navy background, white bold text
- **Freeze panes:** Header row frozen for easy scrolling

---

## Requirements

- Python 3.8 or later
- `pandas`
- `openpyxl`

Install dependencies manually if needed:

```bash
pip install pandas openpyxl
```

---

## Folder Structure

```
📁 your-folder/
│
├── ParentToken_Report_Generator.py
├── RUN PARENT TOKEN GENERATOR.bat
│
├── Larmenier_OSHC_payment_plan_import.csv        ← input
├── Larmenier_OSHC_DS_TOKENS.csv                  ← input
├── guardian_financial_account_list_...csv         ← input
├── parent_bank_details_summary_report_...csv      ← input (optional)
│
├── ParentToken_Import_Larmenier_OSHC.csv          ← output
├── Larmenier_OSHC_DuplicateGateway_Review.xlsx    ← output
└── Larmenier_OSHC_No_BankingReport.xlsx           ← output
```

---

## Console Output

The script prints a colour-coded summary as it runs — including the service name, any excluded records with their reasons, and final counts:

```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  💳  PARENT TOKENS  &  NO BANKING REPORT GENERATOR
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ──────────────────────────────────────────────────────────────────
    Knox Children and Family Centre Wantirna South
  ──────────────────────────────────────────────────────────────────

  ...

  ✅  SUCCESS  —  Script finished without errors

  📄 Results:
       ✅  Valid tokens in ParentToken_Import_Knox.csv  :  132
       🔁  Duplicate gateway rows (review file)        :  0

  ❌ Excluded from ParentToken_Import:
       Gateway not found in DS Tokens     :  5
       Parent not found in guardian list  :  3
       Child name does not match          :  0
```

---
"""
PARENT TOKEN & NO BANKING REPORT GENERATOR
===========================================
Developed by 7GONEINSANE

INPUT FILES (place in same folder — auto-detected by name):
  - *payment_plan*         e.g. Larmenier_OSHC_payment_plan_import.csv
  - *DS*TOKEN* or *token*  e.g. Larmenier_OSHC_DS_TOKENS.csv
  - *guardian_financial*   e.g. guardian_financial_account_list_2026-...csv
  - *parent_bank*          e.g. parent_bank_details_summary_report_...csv (optional)

OUTPUTS:
  - ParentToken_Import.csv
  - {ServiceName}_DuplicateGateway_Review.xlsx
  - {ServiceName}_No_BankingReport.xlsx
"""

import sys
import re
from pathlib import Path

# Ensure Windows CMD renders Unicode correctly
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ─────────────────────────────────────────────────────────────
# UI HELPERS
# ─────────────────────────────────────────────────────────────
W = 66

def _bar(ch="═"):    print("  ╔" + ch * W + "╗")
def _bot(ch="═"):    print("  ╚" + ch * W + "╝")
def _mid(ch="─"):    print("  ╠" + ch * W + "╣")
def _row(text=""):
    inner = f"  {text}"
    print("  ║ " + inner.ljust(W - 1) + "║")


def divider():       print("  " + "─" * (W + 2))
def step(n, t, lbl): print(f"\n  ◈  [{n}/{t}]  {lbl}")

def info(label, val=""):
    if val:
        dots = "·" * max(2, 46 - len(label))
        print(f"       {label} {dots} {val}")
    else:
        print(f"       {label}")

def warn(msg):  print(f"       ⚠  {msg}")
def good(msg):  print(f"       ✓  {msg}")
def err(msg):   print(f"       ✗  {msg}")

# ─────────────────────────────────────────────────────────────
# DEVELOPED BY 7GONEINSANE
# ─────────────────────────────────────────────────────────────
print("\n" + "━"*46)
print("💳 PARENT TOKENS & NO BANKING REPORT GENERATOR")
print("━"*46)
print()

# ─────────────────────────────────────────────────────────────
# STEP 1 — PACKAGES
# ─────────────────────────────────────────────────────────────
step(1, 6, "Checking packages")
try:
    import pandas as pd
    from openpyxl import Workbook
    from openpyxl.styles import PatternFill, Font, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    good("pandas + openpyxl are ready")
except ImportError as e:
    err(f"Missing package: {e}")
    err("Fix: pip install pandas openpyxl --break-system-packages")
    print()
    input("  Press Enter to exit...")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────
# STEP 2 — AUTO-DETECT INPUT FILES
# ─────────────────────────────────────────────────────────────
step(2, 6, "Detecting input files")

script_folder = Path(__file__).parent


def find_file(folder, *keywords):
    """
    Return the first file in folder whose lowercase name
    contains ALL of the given keywords.
    Supports .csv, .xlsx, .xlsm, .xls
    """
    valid_ext = {".csv", ".xlsx", ".xlsm", ".xls"}
    for f in sorted(folder.iterdir()):
        if f.suffix.lower() not in valid_ext:
            continue
        name_lower = f.name.lower()
        if all(k.lower() in name_lower for k in keywords):
            return f
    return None


def read_any(path):
    """
    Read a CSV or Excel file into a DataFrame regardless of extension.
    Also handles CSV files that have a 1-2 line report-title preamble
    (detected when the first line is a quoted string with no commas).
    """
    ext = path.suffix.lower()
    if ext in (".xlsx", ".xlsm", ".xls"):
        return pd.read_excel(path, dtype=str)
    # CSV — detect preamble rows (e.g. "Parent Bank Details Summary Report")
    with open(path, "r", encoding="utf-8-sig", errors="replace") as fh:
        first_line = fh.readline()
    has_preamble = (
        first_line.startswith('"')
        and "," not in first_line.replace('"', "").strip()
    )
    skip = 2 if has_preamble else 0
    return pd.read_csv(path, dtype=str, skiprows=skip, encoding="utf-8-sig")


# Locate the three required files
pp_path  = find_file(script_folder, "payment_plan")
ds_path  = (
    find_file(script_folder, "ds", "token")
    or find_file(script_folder, "ds_token")
)
gfl_path = find_file(script_folder, "guardian_financial")

missing = False
for label, path in [
    ("Payment plan file  ", pp_path),
    ("DS Tokens file     ", ds_path),
    ("Guardian list file ", gfl_path),
]:
    if path:
        good(f"{label} → {path.name}")
    else:
        err(f"{label} → NOT FOUND")
        missing = True

if missing:
    print()
    warn(f"Place missing files in:  {script_folder}")
    print()
    input("  Press Enter to exit...")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────
# STEP 3 — LOAD DATA
# ─────────────────────────────────────────────────────────────
step(3, 6, "Loading data")

pp  = read_any(pp_path);  pp.columns  = pp.columns.str.strip()
ds  = read_any(ds_path);  ds.columns  = ds.columns.str.strip()
gfl = read_any(gfl_path); gfl.columns = gfl.columns.str.strip()

info("Payment plan rows ", f"{len(pp):,}")
info("DS token rows     ", f"{len(ds):,}")
info("Guardian list rows", f"{len(gfl):,}")

service_name = (
    pp["Service_Name"].dropna().iloc[0].strip()
    if "Service_Name" in pp.columns else "Service"
)
service_id   = (
    pp["Service_ID"].dropna().iloc[0].strip()
    if "Service_ID" in pp.columns else ""
)
info("Service name      ", service_name)

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def cv(val):
    """Return stripped string; empty string for NaN/None."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return ""
    return str(val).strip()


def norm(s):
    """Lowercase + collapse whitespace — used for fuzzy name matching."""
    return re.sub(r"\s+", " ", cv(s).lower()).strip()


def child_in_gfl(pp_child_fullname, gfl_children_csv):
    """
    True when pp_child_fullname (case-insensitive) appears anywhere
    in the comma-separated GFL child list.
    e.g. "Angus Absolom" found in "Angus Absolom, Evie Absolom"
    """
    gfl_kids = [norm(c) for c in gfl_children_csv.split(",")]
    return norm(pp_child_fullname) in gfl_kids


def ds_client_to_norm(client_str):
    """
    DS Client column is stored as "Last, First".
    Convert to normalised "first last" for name matching.
    """
    s = cv(client_str)
    if "," in s:
        last, first = s.split(",", 1)
        return norm(first.strip() + " " + last.strip())
    return norm(s)


# ─────────────────────────────────────────────────────────────
# BUILD LOOKUP TABLES
# ─────────────────────────────────────────────────────────────

# GFL  →  normalised holder name  :  list of GFL rows
gfl["_hn"] = gfl["Account Holder"].apply(norm)
gfl_by_name: dict = {}
for _, row in gfl.iterrows():
    gfl_by_name.setdefault(row["_hn"], []).append(row)

# DS  →  UPPERCASE club/gateway number  :  DS row
#         (skip XXXDONOTBILL entries — those are cancelled)
ds["_cu"] = ds["Club Number"].apply(lambda v: cv(v).upper())
ds_by_gw: dict = {}
for _, row in ds.iterrows():
    key = row["_cu"]
    if key and not key.upper().startswith("XXX"):
        ds_by_gw[key] = row

# DS cancelled set  (by normalised client name — used for No Banking notes)
ds_by_client: dict = {}
for _, row in ds.iterrows():
    key = ds_client_to_norm(cv(row["Client"]))
    if key:
        ds_by_client.setdefault(key, []).append(row)

# PP  →  add helper columns
pp["_pf"] = pp["Parent_First_Name"].apply(cv) + " " + pp["Parent_Last_Name"].apply(cv)
pp["_cf"] = pp["Child_First_Name"].apply(cv)  + " " + pp["Child_Last_Name"].apply(cv)
pp["_pn"] = pp["_pf"].apply(norm)
pp["_cn"] = pp["_cf"].apply(norm)
pp["_gu"] = pp["Gateway_Reference"].apply(lambda v: cv(v).upper())

# ─────────────────────────────────────────────────────────────
# STEP 4 — PROCESS PAYMENT PLAN
# ─────────────────────────────────────────────────────────────
step(4, 6, "Processing payment plan rows")

valid_tokens      = []   # → ParentToken_Import.csv
iss_no_gw         = []   # gateway not found in DS
iss_no_parent     = []   # parent name not found in GFL
iss_child_diff    = []   # parent in GFL but child doesn't match
dup_gateway_rows  = []   # parent has 2+ different gateways

# Identify parents who have multiple distinct gateway refs
gw_per_parent = pp.groupby("_pn")["_gu"].nunique()
dup_parent_set = set(gw_per_parent[gw_per_parent > 1].index)

for i, row in pp.iterrows():
    csv_row     = i + 2          # row number in source CSV
    parent_full = cv(row["_pf"])
    parent_norm = row["_pn"]
    child_full  = cv(row["_cf"])
    gateway     = row["_gu"]
    svc_display = cv(row.get("Service_Name", service_name))

    # ── CASE 1: Parent has duplicate (multiple) gateways ─────────────────
    # These go to the review sheet, NOT to token import
    if parent_norm in dup_parent_set:
        dsr    = ds_by_gw.get(gateway)
        token  = cv(dsr["Adfit No"])     if dsr is not None else "NOT FOUND IN DS"
        ds_acc = cv(dsr["Account code"]) if dsr is not None else ""
        gfl_id = cv(gfl_by_name[parent_norm][0]["ID"]) if parent_norm in gfl_by_name else "NOT IN GFL"
        dup_gateway_rows.append({
            "PP Row"             : csv_row,
            "Service Name"       : svc_display,
            "GFL Parent ID"      : gfl_id,
            "Parent Full Name"   : parent_full,
            "Child Name"         : child_full,
            "Gateway Reference"  : cv(row["Gateway_Reference"]),
            "DS Token (Adfit No)": token,
            "DS Account Code"    : ds_acc,
            "Review Note"        : "DUPLICATE — same parent has more than one gateway reference",
        })
        continue  # excluded from token import

    # ── CASE 2: Gateway reference not found in DS Tokens ─────────────────
    if gateway not in ds_by_gw:
        iss_no_gw.append({
            "PP Row"          : csv_row,
            "Parent Full Name": parent_full,
            "Child Name"      : child_full,
            "Gateway Ref"     : cv(row["Gateway_Reference"]),
            "Service"         : svc_display,
            "Issue"           : "Gateway reference not found in DS Tokens",
        })
        continue  # excluded from token import

    # ── CASE 3: Parent full name not found in guardian list ──────────────
    if parent_norm not in gfl_by_name:
        # Try to find the child under a DIFFERENT parent in GFL
        child_hits = [
            r for _, r in gfl.iterrows()
            if row["_cn"] in norm(cv(r["Child Names"]))
        ]
        if child_hits:
            found_holder = cv(child_hits[0]["Account Holder"])
            found_id     = cv(child_hits[0]["ID"])
            reason = (
                f"Child '{child_full}' was found in GFL under "
                f"'{found_holder}' (ID {found_id}) — "
                f"but parent name '{parent_full}' is different"
            )
        else:
            reason = (
                f"Parent '{parent_full}' and child '{child_full}' "
                f"were not found anywhere in the guardian list"
            )
        dsr = ds_by_gw[gateway]
        iss_no_parent.append({
            "PP Row"          : csv_row,
            "Parent Full Name": parent_full,
            "Child Name"      : child_full,
            "Gateway Ref"     : cv(row["Gateway_Reference"]),
            "DS Token"        : cv(dsr["Adfit No"]),
            "Service"         : svc_display,
            "Issue"           : reason,
        })
        continue  # excluded from token import

    # ── CASE 4: Parent found in GFL but child name doesn't match ─────────
    gfl_match  = gfl_by_name[parent_norm][0]
    gfl_kids   = cv(gfl_match["Child Names"])
    gfl_pid    = cv(gfl_match["ID"])

    if not child_in_gfl(child_full, gfl_kids):
        iss_child_diff.append({
            "PP Row"          : csv_row,
            "Parent Full Name": parent_full,
            "Child in PP"     : child_full,
            "GFL Children"    : gfl_kids,
            "GFL Parent ID"   : gfl_pid,
            "Gateway Ref"     : cv(row["Gateway_Reference"]),
            "Service"         : svc_display,
            "Issue"           : "Parent matched in GFL but child name does not match",
        })
        continue  # excluded from token import

    # ── VALID MATCH ───────────────────────────────────────────────────────
    dsr   = ds_by_gw[gateway]
    token = cv(dsr["Adfit No"])
    valid_tokens.append({
        "Parent ID": gfl_pid,
        "Token"    : token,
    })

# ── Summary counts ────────────────────────────────────────────
print()
info("Valid token imports         ", f"{len(valid_tokens):,}")
info("Duplicate gateways (review) ", f"{len(dup_gateway_rows):,}")
info("Gateways not in DS (excluded)", f"{len(iss_no_gw):,}")
info("Parents not in GFL (excluded)", f"{len(iss_no_parent):,}")
info("Child mismatches (excluded)  ", f"{len(iss_child_diff):,}")

# ── Print issue details in the console ───────────────────────
all_issues_count = len(iss_no_gw) + len(iss_no_parent) + len(iss_child_diff)

if iss_no_gw:
    print()
    divider()
    info(" GATEWAYS NOT FOUND IN DS TOKENS")
    divider()
    for x in iss_no_gw:
        print(f"       Row {x['PP Row']:>3}  {x['Parent Full Name']:<28}  {x['Child Name']}")
        print(f"              Gateway: {x['Gateway Ref']}")

if iss_no_parent:
    print()
    divider()
    info(" PARENTS / CHILDREN NOT FOUND IN GUARDIAN LIST")
    divider()
    for x in iss_no_parent:
        print(f"       Row {x['PP Row']:>3}  {x['Parent Full Name']:<28}  {x['Child Name']}")
        print(f"              {x['Issue']}")

if iss_child_diff:
    print()
    divider()
    info(" CHILD NAME MISMATCHES")
    divider()
    for x in iss_child_diff:
        print(f"       Row {x['PP Row']:>3}  {x['Parent Full Name']:<28}  PP child: {x['Child in PP']}")
        print(f"              GFL children: {x['GFL Children']}")

if all_issues_count > 0:
    divider()

# ─────────────────────────────────────────────────────────────
# STEP 5 — WRITE OUTPUT FILES
# ─────────────────────────────────────────────────────────────
step(5, 6, "Writing output files")

safe_svc = service_name.replace(" ", "_").replace("/", "-")

# ── Excel style helpers ───────────────────────────────────────
def mk_border(color="CCCCCC"):
    s = Side(style="thin", color=color)
    return Border(left=s, right=s, top=s, bottom=s)

def apply_header(cell, bg="1F3864", fg="FFFFFF"):
    cell.fill      = PatternFill("solid", fgColor=bg)
    cell.font      = Font(bold=True, color=fg, size=10)
    cell.border    = mk_border()
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

def apply_data(cell, bg="FFFFFF", bold=False, center=False):
    cell.fill      = PatternFill("solid", fgColor=bg)
    cell.font      = Font(bold=bold, size=10)
    cell.border    = mk_border()
    cell.alignment = Alignment(
        wrap_text=True, vertical="top",
        horizontal="center" if center else "left"
    )

def add_title_row(ws, text, ncols, bg="0D1F3C"):
    ws.merge_cells(
        start_row=1, start_column=1,
        end_row=1,   end_column=ncols
    )
    c           = ws.cell(row=1, column=1, value=text)
    c.fill      = PatternFill("solid", fgColor=bg)
    c.font      = Font(bold=True, color="FFFFFF", size=13)
    c.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

def auto_col_widths(ws, max_width=55):
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        best = max((len(str(c.value or "")) for c in col), default=10)
        ws.column_dimensions[col_letter].width = min(best + 4, max_width)


# ── A) ParentToken_Import.csv ─────────────────────────────────
token_out = script_folder / "ParentToken_Import.csv"
if valid_tokens:
    pd.DataFrame(valid_tokens).to_csv(
        token_out, index=False, encoding="utf-8-sig"
    )
    good(f"ParentToken_Import.csv          ({len(valid_tokens)} rows)")
else:
    warn("No valid rows — ParentToken_Import.csv was not created")


# ── B) Duplicate Gateway Review (xlsx) ───────────────────────
if dup_gateway_rows:
    dup_out  = script_folder / f"{safe_svc}_DuplicateGateway_Review.xlsx"
    wb_dup   = Workbook()
    ws_dup   = wb_dup.active
    ws_dup.title = "Duplicate Gateway Review"

    headers = list(dup_gateway_rows[0].keys())
    add_title_row(ws_dup, f"{service_name} — Duplicate Gateway Review", len(headers))
    ws_dup.row_dimensions[2].height = 22

    for ci, h in enumerate(headers, 1):
        apply_header(ws_dup.cell(row=2, column=ci, value=h))

    for ri, rd in enumerate(dup_gateway_rows, 3):
        row_bg = "FFF9E6" if ri % 2 == 0 else "FFFEF7"
        for ci, h in enumerate(headers, 1):
            c = ws_dup.cell(row=ri, column=ci, value=rd[h])
            if h == "Review Note":
                apply_data(c, bg="FFCC00", bold=True)
            else:
                apply_data(c, bg=row_bg)

    auto_col_widths(ws_dup)
    ws_dup.freeze_panes = "A3"
    wb_dup.save(dup_out)
    good(f"{dup_out.name}  ({len(dup_gateway_rows)} rows)")


# ─────────────────────────────────────────────────────────────
# STEP 6 — NO BANKING REPORT
# ─────────────────────────────────────────────────────────────
step(6, 6, "No Banking Report")
print()
divider()
print("  Is the parent_bank_details_summary_report")
print("  uploaded to this folder?")
divider()
print()
response = input("  Enter Yes or No: ").strip().lower()
print()

if response not in ("yes", "y"):
    info("Banking report skipped")
else:
    bank_path = (
        find_file(script_folder, "parent_bank")
        or find_file(script_folder, "bank_detail")
    )
    if not bank_path:
        err("Bank details file not found — report skipped")
        err(f"Expected in: {script_folder}")
    else:
        good(f"Bank file → {bank_path.name}")
        bank = read_any(bank_path)
        bank.columns = bank.columns.str.strip()
        info("Bank rows", f"{len(bank):,}")

        # Build set of parents WHO HAVE banking
        bank["_fn"] = (
            bank["First Name"].apply(cv) + " " + bank["Last Name"].apply(cv)
        ).apply(norm)
        has_banking = set(bank["_fn"])

        # Build No Banking rows from GFL
        no_bank_rows = []
        for _, gr in gfl.iterrows():
            holder   = cv(gr["Account Holder"])
            holder_n = norm(holder)
            gfl_id   = cv(gr["ID"])
            gfl_kids = cv(gr["Child Names"])
            svc2     = cv(gr.get("Service", service_name))

            if holder_n == "demo parent":
                continue  # skip placeholder row
            if holder_n in has_banking:
                continue  # they have banking — skip

            # ── Determine Note and colour ─────────────────────────────
            ds_ents   = ds_by_client.get(holder_n, [])
            all_canc  = (
                bool(ds_ents)
                and all(cv(dr["Club Number"]).upper().startswith("XXX")
                        for dr in ds_ents)
            )
            has_valid = any(
                not cv(dr["Club Number"]).upper().startswith("XXX")
                for dr in ds_ents
            )
            pp_rows   = pp[pp["_pn"] == holder_n]
            child_display = (
                ", ".join(cv(r["_cf"]) for _, r in pp_rows.iterrows())
                if len(pp_rows) > 0 else gfl_kids
            )

            if all_canc:
                note   = "Cancelled - No billing since 31/12/2019"
                note_c = "F4B942"   # orange
            elif has_valid or len(pp_rows) > 0:
                note   = "Review"
                note_c = "FFFF00"   # yellow
            else:
                note   = "Not found"
                note_c = ""

            no_bank_rows.append({
                "Service Name"    : svc2 or service_name,
                "ParentID"        : gfl_id,
                "Parent Full Name": holder,
                "Child Name"      : child_display,
                "Account Name"    : "",   # no banking = no account name
                "Notes"           : note,
                "_note_color"     : note_c,
                "Gateway Reference": "",  # intentionally left empty
            })

        info("Parents without banking", f"{len(no_bank_rows):,}")

        # Write No Banking xlsx
        nb_out = script_folder / f"{safe_svc}_No_BankingReport.xlsx"
        wb_nb  = Workbook()
        ws_nb  = wb_nb.active
        ws_nb.title = "No Banking Report"

        display_cols = [
            "Service Name", "ParentID", "Parent Full Name",
            "Child Name", "Account Name", "Notes", "Gateway Reference",
        ]
        col_widths = [22, 14, 28, 34, 22, 44, 38]

        add_title_row(ws_nb, f"{service_name} — No Banking Report", len(display_cols))
        ws_nb.row_dimensions[2].height = 22

        for ci, h in enumerate(display_cols, 1):
            apply_header(ws_nb.cell(row=2, column=ci, value=h))

        for ri, rd in enumerate(no_bank_rows, 3):
            row_bg = "EEF3FB" if ri % 2 == 0 else "FFFFFF"
            for ci, col in enumerate(display_cols, 1):
                val = rd.get(col, "")
                c   = ws_nb.cell(row=ri, column=ci, value=val)
                if col == "Notes":
                    nc = rd.get("_note_color", "")
                    if nc:
                        apply_data(c, bg=nc, bold=True)
                    else:
                        apply_data(c, bg=row_bg)
                else:
                    apply_data(c, bg=row_bg)

        for ci, width in enumerate(col_widths, 1):
            ws_nb.column_dimensions[get_column_letter(ci)].width = width

        ws_nb.freeze_panes = "A3"
        wb_nb.save(nb_out)
        good(f"{nb_out.name}  ({len(no_bank_rows)} rows)")

# ─────────────────────────────────────────────────────────────
# FINAL SUMMARY
# ─────────────────────────────────────────────────────────────
print("\n" + "━"*45)
print("✅ SUCCESS")
print("🚀 Script finished without errors.")
print("━"*45)
print()
print("  Results:")
print(f"    ✓  Valid tokens in ParentToken_Import.csv  :  {len(valid_tokens)}")
print(f"    ⚑  Duplicate gateway rows (review file)   :  {len(dup_gateway_rows)}")
print()
print("  Excluded from ParentToken_Import.csv:")
print(f"    ✗  Gateway not found in DS Tokens         :  {len(iss_no_gw)}")
print(f"    ✗  Parent not found in guardian list      :  {len(iss_no_parent)}")
print(f"    ✗  Child name does not match              :  {len(iss_child_diff)}")
print()
input("  Press Enter to close...")

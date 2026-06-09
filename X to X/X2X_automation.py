"""
🛠️  DEVELOPED BY 7GONEINSANE
X2X Migration Script  v2
==================================================================================
Inputs  (place in the same folder as this script — NO renaming required):
  · Any CSV/Excel file with  "child_data_master"         anywhere in its filename
  · Any CSV/Excel file with  "Emergency_contact_reports" anywhere in its filename
    Supported formats: .csv  .xlsx  .xlsm  .xls

Required (prompted at runtime):
  · New Service ID
  · New Service Name

Output:
  · PC_import.csv  (ready to import into new service)
"""
# ──────────────────────────────────────────────────────────────────────────────
# What's new in v2:
# ✔  Auto-detects input files by name pattern — no fixed filenames needed
# ✔  Removes duplicate EC profiles (full delete or field-level clear)
# ✔  Auto-creates a placeholder Parent 1 where none exists
# ✔  Professional formatted output with full audit report
# ──────────────────────────────────────────────────────────────────────────────

import argparse
import sys
from pathlib import Path

import pandas as pd

IMPORT_COLUMNS = [
    "ServiceID", "Service_Name", "Child_Legacy_Id", "Child_First_Name",
    "Child_Middle_Name", "Child_Last_Name", "Gender", "DOB",
    "Special_Circumstances", "School", "Class", "Consents_Photos",
    "Status", "Address", "Suburb", "Country", "State", "PostCode",
    "Religion", "Language", "Cultural_Background", "Cultural_Requirements",
    "Indigenous_Status", "Medicare_Number", "Medicare_Expiry_Date",
    "Ambulance_Cover_Number", "Health_Care_Centre", "Medical_Practitioner_Name",
    "Medical_Practitioner_Phone", "Medical_Practitioner_Address",
    "Medical_Conditions", "Prescribed_Medications", "Allergies_by_choice",
    "Medical_Allergies", "Diet", "Epipen/Anipen", "Child_CRN", "Room_Name",
    "Enrolment_Start_Date", "Enrolment_Parent_First", "Enrolment_Parent_Last",
    "Enrolment_Parent_CRN",

    "Parent1_Title", "Parent1_First_Name", "Parent1_Middle_Name",
    "Parent1_Last_Name", "Parent1_CRN", "Parent1_Legacy_Account_ID",
    "Parent1_Gender", "Parent1_DOB", "Parent1_Email", "Parent1_Contact_Mobile",
    "Parent1_Contact_Home", "Parent1_Address_1", "Parent1_Address_2",
    "Parent1_Suburb", "Parent1_State", "Parent1_Post_Code",
    "Parent1_Indigenous_Status", "Parent1_Language", "Parent1_Cultural_Background",
    "Parent1_Work_Email", "Parent1_Work_Phone", "Parent1_Work_Address",
    "Parent1_Work_Suburb", "Parent1_Work_Postcode", "Parent1_Work_Country",
    "Parent1_Work_State",

    "Parent2_Legacy_Account_ID", "Parent2_Title", "Parent2_First_Name",
    "Parent2_Middle_Name", "Parent2_Last_Name", "Parent2_CRN",
    "Parent2_Gender", "Parent2_DOB", "Parent2_Email", "Parent2_Contact_Mobile",
    "Parent2_Contact_Home", "Parent2_Address_1", "Parent2_Address_2",
    "Parent2_Suburb", "Parent2_State", "Parent2_Post_Code",
    "Parent2_Indigenous_Status", "Parent2_Language", "Parent2_Cultural_Background",
    "Parent2_Work_Email", "Parent2_Work_Phone", "Parent2_Work_Address",
    "Parent2_Work_Suburb", "Parent2_Work_Postcode", "Parent2_Work_Country",
    "Parent2_Work_State",

    "EmergencyContact1_LegacyID", "EmergencyContact1_First_Name",
    "EmergencyContact1_Last_Name", "EmergencyContact1_Contact_Number",
    "EmergencyContact1_Address", "EmergencyContact1_Suburb",
    "EmergencyContact1_Postcode", "EmergencyContact1_Country",
    "EmergencyContact1_State", "EmergencyContact1_Email",
    "EmergencyContact1_Emergency_Contact", "EmergencyContact1_Medical_Nominee",
    "EmergencyContact1_Collection_Nominee", "EmergencyContact1_Excursion_Nominee",
    "EmergencyContact2_LegacyID", "EmergencyContact2_First_Name",
    "EmergencyContact2_Last_Name", "EmergencyContact2_Contact_Number",
    "EmergencyContact2_Address", "EmergencyContact2_Suburb",
    "EmergencyContact2_Postcode", "EmergencyContact2_Country",
    "EmergencyContact2_State", "EmergencyContact2_Email",
    "EmergencyContact2_Emergency_Contact", "EmergencyContact2_Medical_Nominee",
    "EmergencyContact2_Collection_Nominee", "EmergencyContact2_Excursion_Nominee",
    "EmergencyContact3_LegacyID", "EmergencyContact3_First_Name",
    "EmergencyContact3_Last_Name", "EmergencyContact3_Contact_Number",
    "EmergencyContact3_Address", "EmergencyContact3_Suburb",
    "EmergencyContact3_Postcode", "EmergencyContact3_Country",
    "EmergencyContact3_State", "EmergencyContact3_Email",
    "EmergencyContact3_Emergency_Contact", "EmergencyContact3_Medical_Nominee",
    "EmergencyContact3_Collection_Nominee", "EmergencyContact3_Excursion_Nominee",
    "EmergencyContact4_LegacyID", "EmergencyContact4_First_Name",
    "EmergencyContact4_Last_Name", "EmergencyContact4_Contact_Number",
    "EmergencyContact4_Address", "EmergencyContact4_Suburb",
    "EmergencyContact4_Postcode", "EmergencyContact4_Country",
    "EmergencyContact4_State", "EmergencyContact4_Email",
    "EmergencyContact4_Emergency_Contact", "EmergencyContact4_Medical_Nominee",
    "EmergencyContact4_Collection_Nominee", "EmergencyContact4_Excursion_Nominee",
    "EmergencyContact5_LegacyID", "EmergencyContact5_First_Name",
    "EmergencyContact5_Last_Name", "EmergencyContact5_Contact_Number",
    "EmergencyContact5_Address", "EmergencyContact5_Suburb",
    "EmergencyContact5_Postcode", "EmergencyContact5_Country",
    "EmergencyContact5_State", "EmergencyContact5_Email",
    "EmergencyContact5_Emergency_Contact", "EmergencyContact5_Medical_Nominee",
    "EmergencyContact5_Collection_Nominee", "EmergencyContact5_Excursion_Nominee",
]

EC_PROFILE_FIELDS = [
    "LegacyID", "First_Name", "Last_Name", "Contact_Number",
    "Address", "Suburb", "Postcode", "Country", "State", "Email",
    "Emergency_Contact", "Medical_Nominee", "Collection_Nominee", "Excursion_Nominee",
]


SEP   = "  " + "═" * 86   # major section separator
LINE  = "  " + "─" * 64   # minor separator
ALERT = "  " + "■" * 64   # urgent alert border

def _v(val):
    """Return clean string or empty string for NaN/None/0."""
    if val is None:
        return ""
    s = str(val).strip()
    if s.lower() in ("nan", "none", "0"):
        return ""
    return s

def _date(val):
    """Parse any date and return dd/mm/yyyy string."""
    s = _v(val)
    if not s:
        return ""
    try:
        return pd.to_datetime(s, dayfirst=True).strftime("%d/%m/%Y")
    except Exception:
        return s

def _postcode(val):
    """Ensure postcode is 4 digits (NT postcodes start with 0)."""
    s = _v(val)
    if not s or s == "0000":
        return ""
    try:
        return str(int(float(s))).zfill(4)
    except Exception:
        return s

def _phone(val):
    """Strip leading 0 from Australian phone numbers."""
    s = _v(val)
    if not s:
        return ""
    if s.startswith("0"):
        s = s[1:]
    return s

def _yn(val):
    """Convert Yes/No to Y/N."""
    s = _v(val).lower()
    if s == "yes":
        return "Y"
    if s == "no":
        return "N"
    return _v(val)

def _ec_perm(val):
    """Convert 'yes'→1, 'no'→blank for EC permission columns."""
    if _v(val).lower() == "yes":
        return 1
    return ""

def _norm(s):
    """Normalise a string for comparison: strip whitespace and lowercase."""
    if s is None:
        return ""
    return str(s).strip().lower()

def _load(path, **kwargs):
    """Load a CSV or Excel file as a string-typed DataFrame."""
    p = Path(path)
    if not p.exists():
        print(f"\n  ❌  ERROR: File not found → {path}")
        input("  Press Enter to exit...")
        sys.exit(1)
    ext = p.suffix.lower()
    if ext == ".xls":
        return pd.read_excel(path, dtype=str, engine="xlrd", **kwargs)
    if ext in (".xlsx", ".xlsm"):
        return pd.read_excel(path, dtype=str, **kwargs)
    return pd.read_csv(path, dtype=str, **kwargs)

# ──────────────────────────────────────────────────────────────────────────────
# FILE AUTO-DETECTION
# ──────────────────────────────────────────────────────────────────────────────
def find_file(folder, pattern, label):
    """
    Find a CSV/Excel file in *folder* whose filename stem contains *pattern*
    (case-insensitive).  Supports .csv .xlsx .xlsm .xls
    Exits with a clear message if nothing is found.
    """
    exts = {".csv", ".xlsx", ".xlsm", ".xls"}
    folder = Path(folder)
    matches = sorted(
        f for f in folder.iterdir()
        if f.is_file()
        and f.suffix.lower() in exts
        and pattern.lower() in f.stem.lower()
    )
    if not matches:
        print(f"\n  ❌  ERROR: No {label} file found.")
        print(f"     Searched  : {folder.resolve()}")
        print(f"     Looking for a .csv / .xlsx / .xls file containing '{pattern}' in its name.")
        print(f"     Valid name examples:")
        print(f"       ✔  {pattern}.csv")
        print(f"       ✔  2024_{pattern}.xlsx")
        print(f"       ✔  {pattern}_jan2025.csv")
        input("\n  Press Enter to exit...")
        sys.exit(1)
    if len(matches) > 1:
        print(f"\n  ⚠️   Multiple {label} files found:")
        for m in matches:
            print(f"       · {m.name}")
        print(f"  Using first match: {matches[0].name}")
    return str(matches[0])

# ──────────────────────────────────────────────────────────────────────────────
# MAIN PROCESS
# ──────────────────────────────────────────────────────────────────────────────
def process(
    children_path: str,
    ec_path: str,
    new_service_id: str,
    new_service_name: str,
    output_path: str = None,
):
    base_dir = Path(children_path).parent
    if output_path is None:
        output_path = str(base_dir / "PC_import.csv")

    print(f"\n  📂  Step 1  ·  Loading Children data ...")
    ch = _load(children_path)
    ch.columns = ch.columns.str.strip()

    pay2_col = "Payment Details 2"
    if pay2_col in ch.columns:
        cutoff = ch.columns.get_loc(pay2_col) + 1
        ch = ch.iloc[:, :cutoff]
    else:
        ch = ch.iloc[:, :112]

    old_service_id = (
        _v(ch.iloc[0].get("XplorServiceID", ""))
        if "XplorServiceID" in ch.columns else ""
    )
    print(f"      ✅  {len(ch)} children loaded  |  Old Service ID: {old_service_id or '(not found)'}")

    print(f"\n  📋  Step 2  ·  Loading Emergency Contacts ...")
    ec = _load(ec_path)
    ec.columns = ec.columns.str.strip()

    ec = ec[
        ec["Emergency Contact First Name"].notna()
        & (ec["Emergency Contact First Name"].str.strip() != "")
    ].copy()
    ec = ec.reset_index(drop=True)

    ec["_child_key"] = (
        ec["Child First Name"].str.strip() + " " + ec["Child Last Name"].str.strip()
    )
    ec["_ec_full_name"] = (
        ec["Emergency Contact First Name"].str.strip()
        + " "
        + ec["Emergency Contact Last Name"].fillna("").str.strip()
    ).str.strip()
    ec["_ec_num"] = ec.groupby("_child_key").cumcount() + 1

    unique_ec_names = ec["_ec_full_name"].drop_duplicates().reset_index(drop=True)
    ec_legacy_id_map = {}
    for i, name in enumerate(unique_ec_names, start=1):
        seq = str(i).zfill(2) if i < 100 else str(i)
        ec_legacy_id_map[name] = f"{old_service_id}{seq}"

    ec_by_child = {}
    for _, row in ec.iterrows():
        key = row["_child_key"]
        ec_by_child.setdefault(key, []).append(row)

    print(f"      ✅  {len(ec)} EC rows loaded  |  {len(ec_legacy_id_map)} unique EC persons assigned Legacy IDs")

    def get_primary_carer(row):
        for n in ["1", "2"]:
            if _v(row.get(f"IsPrimaryCarer {n}", "")).lower() == "yes":
                return (
                    _v(row.get(f"FirstName {n}", "")),
                    _v(row.get(f"LastName {n}", "")),
                    _v(row.get(f"Parent CRN {n}", "")),
                )
        return ("", "", "")

    print(f"\n  🔧  Step 3  ·  Building import rows ...")
    import_rows = []

    for _, c in ch.iterrows():
        child_key = f"{_v(c.get('ChildFirst', ''))} {_v(c.get('ChildLast', ''))}".strip()
        pc_first, pc_last, pc_crn = get_primary_carer(c)
        ecs = ec_by_child.get(child_key, [])

        def ec_field(n, field):
            ec_rows_n = [e for e in ecs if e["_ec_num"] == n]
            if not ec_rows_n:
                return ""
            row = ec_rows_n[0]
            if field == "LegacyID":
                return ec_legacy_id_map.get(row["_ec_full_name"], "")
            if field == "First_Name":
                return _v(row.get("Emergency Contact First Name", ""))
            if field == "Last_Name":
                return _v(row.get("Emergency Contact Last Name", ""))
            if field == "Contact_Number":
                return _v(row.get("Emergency Contact Number", ""))
            if field == "Address":
                addr  = _v(row.get("Emergency Contact Address", ""))
                addr2 = _v(row.get("Emergency Contact Address 2", ""))
                return f"{addr} {addr2}".strip() if addr2 else addr
            if field == "Suburb":             return _v(row.get("Emergency Contact Suburb", ""))
            if field == "Postcode":           return ""   # not present in EC report
            if field == "Country":            return _v(row.get("Emergency Contact Country", ""))
            if field == "State":              return _v(row.get("Emergency Contact State", ""))
            if field == "Email":              return _v(row.get("Emergency Contact Email", ""))
            if field == "Emergency_Contact":  return _ec_perm(row.get("Emergency Contact", "no"))
            if field == "Medical_Nominee":    return _ec_perm(row.get("Medical", "no"))
            if field == "Collection_Nominee": return _ec_perm(row.get("Collection", "no"))
            if field == "Excursion_Nominee":  return _ec_perm(row.get("Excursion", "no"))
            return ""

        row_data = {
            "ServiceID":                    new_service_id,
            "Service_Name":                 new_service_name,

            "Child_Legacy_Id":              _v(c.get("ChildID", "")),
            "Child_First_Name":             _v(c.get("ChildFirst", "")),
            "Child_Middle_Name":            _v(c.get("ChildMiddle", "")),
            "Child_Last_Name":              _v(c.get("ChildLast", "")),
            "Gender":                       _v(c.get("Gender", "")),
            "DOB":                          _date(c.get("DOB", "")),
            "Special_Circumstances":        _v(c.get("Special Circumstances", "")),
            "School":                       _v(c.get("School", "")),
            "Class":                        _v(c.get("Class", "")),
            "Consents_Photos":              _yn(c.get("Consents Photos & Videos", "")),
            "Status":                       _v(c.get("Child Status", "")),
            "Address":                      _v(c.get("Address", "")),
            "Suburb":                       _v(c.get("Suburb", "")),
            "Country":                      _v(c.get("Country", "")),
            "State":                        _v(c.get("State", "")),
            "PostCode":                     _postcode(c.get("Postcode", "")),
            "Religion":                     _v(c.get("Religion", "")),
            "Language":                     _v(c.get("Language", "")),
            "Cultural_Background":          _v(c.get("Cultural Background", "")),
            "Cultural_Requirements":        _v(c.get("Cultural Requirements", "")),
            "Indigenous_Status":            _v(c.get("Indigenous Status", "")),
            "Medicare_Number":              _v(c.get("Medicare Number", "")),
            "Medicare_Expiry_Date":         _date(c.get("Medicare Expiry Date", "")),
            "Ambulance_Cover_Number":       _v(c.get("Ambulance Cover Number", "")),
            "Health_Care_Centre":           _v(c.get("Health Care Centre", "")),
            "Medical_Practitioner_Name":    _v(c.get("Medical Practitioner Name", "")),
            "Medical_Practitioner_Phone":   _phone(c.get("Medical Practitioner Phone", "")),
            "Medical_Practitioner_Address": _v(c.get("Medical Practitioner Address", "")),
            "Medical_Conditions":           _v(c.get("Medical Conditions", "")),
            "Prescribed_Medications":       _v(c.get("Prescribed Medications", "")),
            "Allergies_by_choice":          _v(c.get("Allergies by choice", "")),
            "Medical_Allergies":            _v(c.get("Medical Allergies", "")),
            "Diet":                         _v(c.get("Diet", "")),
            "Epipen/Anipen":                _v(c.get("Epipen/Anipen", "")),
            "Child_CRN":                    _v(c.get("Child CRN", "")),
            "Room_Name":                    _v(c.get("RoomName", "")),
            "Enrolment_Start_Date":         _date(c.get("Enrolment Start Date", "")),
            "Enrolment_Parent_First":       pc_first,
            "Enrolment_Parent_Last":        pc_last,
            "Enrolment_Parent_CRN":         pc_crn,
  
            "Parent1_Title":                _v(c.get("Title 1", "")),
            "Parent1_First_Name":           _v(c.get("FirstName 1", "")),
            "Parent1_Middle_Name":          _v(c.get("MiddleName 1", "")),
            "Parent1_Last_Name":            _v(c.get("LastName 1", "")),
            "Parent1_CRN":                  _v(c.get("Parent CRN 1", "")),
            "Parent1_Legacy_Account_ID":    _v(c.get("ParentID 1", "")),
            "Parent1_Gender":               _v(c.get("Gender 1", "")),
            "Parent1_DOB":                  _date(c.get("Parent DOB 1", "")),
            "Parent1_Email":                _v(c.get("Email 1", "")),
            "Parent1_Contact_Mobile":       _phone(c.get("Mobile 1", "")),
            "Parent1_Contact_Home":         _phone(c.get("Contact No 1", "")),
            "Parent1_Address_1":            _v(c.get("Address Line 1 1", "")),
            "Parent1_Address_2":            _v(c.get("Address Line 2 1", "")),
            "Parent1_Suburb":               _v(c.get("Suburb 1", "")),
            "Parent1_State":                _v(c.get("State 1", "")),
            "Parent1_Post_Code":            _postcode(c.get("Postcode 1", "")),
            "Parent1_Indigenous_Status":    _v(c.get("Indigenous Status 1", "")),
            "Parent1_Language":             _v(c.get("Language 1", "")),
            "Parent1_Cultural_Background":  _v(c.get("Cultural Background 1", "")),
            "Parent1_Work_Email":           _v(c.get("Work Email 1", "")),
            "Parent1_Work_Phone":           _phone(c.get("Work Phone 1", "")),
            "Parent1_Work_Address":         _v(c.get("Work Address 1", "")),
            "Parent1_Work_Suburb":          _v(c.get("Work Suburb 1", "")),
            "Parent1_Work_Postcode":        _postcode(c.get("Work Postcode 1", "")),
            "Parent1_Work_Country":         _v(c.get("Work Country 1", "")),
            "Parent1_Work_State":           _v(c.get("Work State 1", "")),

            "Parent2_Legacy_Account_ID":    _v(c.get("ParentID 2", "")),
            "Parent2_Title":                _v(c.get("Title 2", "")),
            "Parent2_First_Name":           _v(c.get("FirstName 2", "")),
            "Parent2_Middle_Name":          _v(c.get("MiddleName 2", "")),
            "Parent2_Last_Name":            _v(c.get("LastName 2", "")),
            "Parent2_CRN":                  _v(c.get("Parent CRN 2", "")),
            "Parent2_Gender":               _v(c.get("Gender 2", "")),
            "Parent2_DOB":                  _date(c.get("Parent DOB 2", "")),
            "Parent2_Email":                _v(c.get("Email 2", "")),
            "Parent2_Contact_Mobile":       _phone(c.get("Mobile 2", "")),
            "Parent2_Contact_Home":         _phone(c.get("Contact No 2", "")),
            "Parent2_Address_1":            _v(c.get("Address Line 1 2", "")),
            "Parent2_Address_2":            _v(c.get("Address Line 2 2", "")),
            "Parent2_Suburb":               _v(c.get("Suburb 2", "")),
            "Parent2_State":                _v(c.get("State 2", "")),
            "Parent2_Post_Code":            _postcode(c.get("Postcode 2", "")),
            "Parent2_Indigenous_Status":    _v(c.get("Indigenous Status 2", "")),
            "Parent2_Language":             _v(c.get("Language 2", "")),
            "Parent2_Cultural_Background":  _v(c.get("Cultural Background 2", "")),
            "Parent2_Work_Email":           _v(c.get("Work Email 2", "")),
            "Parent2_Work_Phone":           _phone(c.get("Work Phone 2", "")),
            "Parent2_Work_Address":         _v(c.get("Work Address 2", "")),
            "Parent2_Work_Suburb":          _v(c.get("Work Suburb 2", "")),
            "Parent2_Work_Postcode":        _postcode(c.get("Work Postcode 2", "")),
            "Parent2_Work_Country":         _v(c.get("Work Country 2", "")),
            "Parent2_Work_State":           _v(c.get("Work State 2", "")),

            **{
                f"EmergencyContact{n}_{f}": ec_field(n, f)
                for n in range(1, 6)
                for f in EC_PROFILE_FIELDS
            },
        }
        import_rows.append(row_data)

    import_df = pd.DataFrame(import_rows, columns=IMPORT_COLUMNS)
    import_df = import_df.replace({"0": "", 0: ""})
    print(f"      ✅  {len(import_df)} import rows built")

    # ────────────── EC Duplicate Check ───────────────────────────────────────────
    print(f"\n  🔍  Step 4  ·  Checking for EC duplicates ...")

    ec_dup_full    = []   # list of dicts for full-delete report
    ec_dup_partial = []   # list of dicts for partial-clear report
    full_deletes   = 0
    partial_clears = 0

    for idx in import_df.index:
        child_name = (
            f"{import_df.at[idx, 'Child_First_Name']} "
            f"{import_df.at[idx, 'Child_Last_Name']}"
        ).strip()

        for i in range(1, 5):   
            i_fn = f"EmergencyContact{i}_First_Name"
            i_ln = f"EmergencyContact{i}_Last_Name"
            i_ph = f"EmergencyContact{i}_Contact_Number"
            i_em = f"EmergencyContact{i}_Email"

            i_first = _norm(import_df.at[idx, i_fn])
            i_last  = _norm(import_df.at[idx, i_ln])
            i_phone = _norm(import_df.at[idx, i_ph])
            i_email = _norm(import_df.at[idx, i_em])

            if not i_first:
                continue

            i_display = (
                f"{import_df.at[idx, i_fn]} {import_df.at[idx, i_ln]}".strip()
            )

            for j in range(i + 1, 6):
                j_fn = f"EmergencyContact{j}_First_Name"
                j_ln = f"EmergencyContact{j}_Last_Name"
                j_ph = f"EmergencyContact{j}_Contact_Number"
                j_em = f"EmergencyContact{j}_Email"

                j_first = _norm(import_df.at[idx, j_fn])
                j_last  = _norm(import_df.at[idx, j_ln])
                j_phone = _norm(import_df.at[idx, j_ph])
                j_email = _norm(import_df.at[idx, j_em])

                if not j_first:
                    continue

                j_display   = (
                    f"{import_df.at[idx, j_fn]} {import_df.at[idx, j_ln]}".strip()
                )
                name_match  = (i_first == j_first and i_last == j_last)
                phone_match = bool(i_phone and j_phone and i_phone == j_phone)
                email_match = bool(i_email and j_email and i_email == j_email)

                if name_match:

                    ec_dup_full.append({
                        "child":     child_name,
                        "i":         i,
                        "j":         j,
                        "ec_j_name": j_display,
                        "ec_i_name": i_display,
                    })
                    for f in EC_PROFILE_FIELDS:
                        import_df.at[idx, f"EmergencyContact{j}_{f}"] = ""
                    full_deletes += 1

                else:

                    if phone_match:
                        orig_val = import_df.at[idx, j_ph]
                        ec_dup_partial.append({
                            "child":     child_name,
                            "i":         i,
                            "j":         j,
                            "field":     "Phone",
                            "value":     orig_val,
                            "ec_j_name": j_display,
                            "ec_i_name": i_display,
                        })
                        import_df.at[idx, j_ph] = ""
                        partial_clears += 1

                    if email_match:
                        orig_val = import_df.at[idx, j_em]
                        ec_dup_partial.append({
                            "child":     child_name,
                            "i":         i,
                            "j":         j,
                            "field":     "Email",
                            "value":     orig_val,
                            "ec_j_name": j_display,
                            "ec_i_name": i_display,
                        })
                        import_df.at[idx, j_em] = ""
                        partial_clears += 1

    if ec_dup_full or ec_dup_partial:
        print(f"      ⚠️   {full_deletes} EC profile(s) fully deleted  "
              f"|  {partial_clears} field(s) cleared")
    else:
        print(f"      ✅  No EC duplicates found")

    # ──────Missing Parent 1 — Auto-Create ───────────────────────────────
    print(f"\n  👤  Step 5  ·  Checking Parent 1 profiles ...")
    parent1_log = []
    p1_counter  = 0

    for idx in import_df[import_df["Parent1_First_Name"].str.strip() == ""].index:
        p1_counter += 1
        auto_id      = f"9999_{p1_counter:04d}"
        child_first  = import_df.at[idx, "Child_First_Name"]
        child_last   = import_df.at[idx, "Child_Last_Name"]
        child_legacy = import_df.at[idx, "Child_Legacy_Id"]

        import_df.at[idx, "Parent1_First_Name"]        = "Parent First"
        import_df.at[idx, "Parent1_Last_Name"]         = child_last
        import_df.at[idx, "Parent1_Gender"]            = "Female"
        import_df.at[idx, "Parent1_Legacy_Account_ID"] = auto_id

        parent1_log.append({
            "child_name":   f"{child_first} {child_last}".strip(),
            "child_legacy": child_legacy,
            "parent_name":  f"Parent First {child_last}".strip(),
            "auto_id":      auto_id,
        })

    if parent1_log:
        print(f"      ⚠️   {len(parent1_log)} child(ren) had no Parent 1 — placeholders created")
    else:
        print(f"      ✅  All children have a Parent 1 record")

    missing_gender = []
    for idx in import_df[import_df["Gender"].str.strip() == ""].index:
        csv_row = idx + 2
        name = (
            f"{import_df.at[idx, 'Child_First_Name']} "
            f"{import_df.at[idx, 'Child_Last_Name']}"
        ).strip()
        missing_gender.append((csv_row, name))

    print(f"\n  💾  Step 6  ·  Saving output ...")
    import_df.to_csv(output_path, index=False, encoding="utf-8-sig")
    ec_count = (import_df["EmergencyContact1_First_Name"] != "").sum()
    print(f"      ✅  Saved → {output_path}")

    # ═══════════════════════════════════════════════════════════════════════════
    #  AUDIT REPORTS
    # ═══════════════════════════════════════════════════════════════════════════
    if ec_dup_full or ec_dup_partial:
        print(f"\n{LINE}")
        print(f"  🔍  EC DUPLICATE REPORT")
        print(LINE)

        if ec_dup_full:
            print(f"\n  ❌  FULL PROFILES DELETED  ({len(ec_dup_full)} record(s))")
            print(f"  {'─' * 60}")
            for d in ec_dup_full:
                print(f"\n  👶  Child   :  {d['child']}")
                print(f"      EC{d['j']}    :  ENTIRE PROFILE DELETED")
                print(f"      Was    :  {d['ec_j_name']}")
                print(f"      Reason :  Exact duplicate of EC{d['i']} — {d['ec_i_name']}")

        if ec_dup_partial:
            print(f"\n  ✂️   PARTIAL FIELDS CLEARED  ({len(ec_dup_partial)} field(s))")
            print(f"  {'─' * 60}")
            for d in ec_dup_partial:
                print(f"\n  👶  Child    :  {d['child']}")
                print(f"      EC{d['j']}     :  {d['field']} field cleared")
                print(f"      Profile :  {d['ec_j_name']}")
                print(f"      Was     :  {d['value']}")
                print(f"      Reason  :  {d['field']} matched EC{d['i']} ({d['ec_i_name']}) — different person")
        print(f"{SEP}")

    if parent1_log:
        print(f"\n  {'■' * 86}")
        print(f"  !! ACTION REQUIRED  —  REVIEW THE {len(parent1_log)} RECORD(S) BELOW BEFORE IMPORTING !!")
        print(SEP)
        print()
        print(f"  The following children had NO Parent 1 record in the source data.")
        print(f"  A PLACEHOLDER Parent 1 has been auto-created using these values:")
        print()
        print(f"    ·  First Name  :  \"Parent First\"")
        print(f"    ·  Last Name   :  Child's last name")
        print(f"    ·  Gender      :  Female")
        print(f"    ·  Legacy ID   :  Auto-generated  (AP1-XXXX format)")
        print()

        col_n   = 4
        col_ch  = 28
        col_id  = 18
        col_par = 26
        col_aid = 12
        print(
            f"  {'#':<{col_n}}  "
            f"{'Child Name':<{col_ch}}  "
            f"{'Child Legacy ID':<{col_id}}  "
            f"{'Auto Parent 1 Name':<{col_par}}  "
            f"{'Auto Legacy ID':<{col_aid}}"
        )
        print(
            f"  {'─'*col_n}  {'─'*col_ch}  "
            f"{'─'*col_id}  {'─'*col_par}  {'─'*col_aid}"
        )
        for n, p in enumerate(parent1_log, 1):
            print(
                f"  {n:<{col_n}}  "
                f"{p['child_name']:<{col_ch}}  "
                f"{p['child_legacy']:<{col_id}}  "
                f"{p['parent_name']:<{col_par}}  "
                f"{p['auto_id']:<{col_aid}}"
            )
        print(f"\n  {'=' * 100}")

    if missing_gender:
        print(f"\n{LINE}")
        print(f"  ⚠️   MISSING GENDER  —  MANUAL UPDATE REQUIRED  ({len(missing_gender)} children)")
        print(LINE)
        print(f"\n  Open PC_import.csv and type  Male  or  Female  in Column G:\n")
        print(f"  {'Cell':<12}  Child Name")
        print(f"  {'─'*12}  {'─'*32}")
        for csv_row, name in missing_gender:
            print(f"  G{csv_row:<11}  {name}")

    # ──────── Final Summary ──────────────────────────────────────────────────────────
    p1_flag  = "   ⚠️  REVIEW REQUIRED" if parent1_log   else "   ✅"
    gen_flag = "   ⚠️  UPDATE REQUIRED" if missing_gender else "   ✅"

    print(SEP)
    print(f"\n  📊  SUMMARY")
    print(f"  {'─' * 46}")
    print(f"  👶  Children processed              :  {len(import_df)}")
    print(f"  👥  Unique EC persons assigned       :  {len(ec_legacy_id_map)}")
    print(f"  ✅  Children with at least 1 EC      :  {ec_count}")
    print(f"  ❌  EC profiles deleted  (full)      :  {full_deletes}")
    print(f"  ✂️   EC fields cleared   (partial)   :  {partial_clears}")
    print(f"  👤  Parent 1 auto-created            :  {len(parent1_log)}{p1_flag}")
    print(f"  ⚠️   Missing Gender (review)          :  {len(missing_gender)}{gen_flag}")
    print(f"\n  💾  Output  →  {output_path}")
    print(f"\n  {'■' * 64}")
    print(f"  📋  NEXT STEPS")
    print(f"  1.  Review auto-created Parent 1 records  (listed above).")
    print(f"  2.  Fill in any blank Gender cells in Column G.")
    print(f"  3.  Verify phone numbers and postcodes are in accurate format.")

# ──────────────────────────────────────────────────────────────────────────────
# CLI ENTRY POINT
# ──────────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="X2X Migration: build PC_import.csv from Children + EC reports"
    )
    parser.add_argument(
        "--children", default=None,
        help="Path to Children data file (auto-detected if omitted)"
    )
    parser.add_argument(
        "--ec", default=None,
        help="Path to Emergency Contacts file (auto-detected if omitted)"
    )
    parser.add_argument("--service_id",   default=None, help="New Service ID")
    parser.add_argument("--service_name", default=None, help="New Service Name")
    parser.add_argument(
        "--output", default="PC_import.csv",
        help="Output filename (default: PC_import.csv)"
    )
    args = parser.parse_args()

    folder = Path(__file__).resolve().parent
    children_path = args.children or find_file(folder, "child_data_master",         "Children data")
    ec_path       = args.ec       or find_file(folder, "Emergency_contact_reports",  "Emergency Contacts")
    sid           = args.service_id   or input("Enter NEW Service ID   : ").strip()
    snam          = args.service_name or input("Enter NEW Service Name : ").strip()

    process(
        children_path    = children_path,
        ec_path          = ec_path,
        new_service_id   = sid,
        new_service_name = snam,
        output_path      = args.output,
    )

# ──────────────────────────────────────────────────────────────────────────────
# DIRECT RUN
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":

    print()
    print("  ═══════════════════════════════════════════════════════════════")
    print("  🚀  X2X MIGRATION  ·  PARENT | CHILD IMPORT FILE GENERATOR  v2")
    print("  ═══════════════════════════════════════════════════════════════")
    print()

    folder = Path(__file__).resolve().parent

    print("  📂  Searching for input files ...")
    children_path = find_file(folder, "child_data_master",         "Children data")
    ec_path       = find_file(folder, "Emergency_contact_reports",  "Emergency Contacts")
    print(f"      ✅  Children file  :  {Path(children_path).name}")
    print(f"      ✅  EC file        :  {Path(ec_path).name}")
    print()

    print("  🔑  Enter the destination service details:")
    print()
    sid  = input("      New Service ID    : ").strip()
    snam = input("      New Service Name  : ").strip()

    process(
        children_path    = children_path,
        ec_path          = ec_path,
        new_service_id   = sid,
        new_service_name = snam,
        output_path      = str(folder / "PC_import.csv"),
    )
    input("\n  Press Enter to close ...")
    
# Next fix -> 
# All the mobile numbers should be leading with 0 and should be 10 digits no special characters or spaces.
# Add ServiceName infront of the PC_Import.csv file name. e.g. ServiceName_PC_Import.csv
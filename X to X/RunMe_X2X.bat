@echo off
cd /d "%~dp0"
echo ============================================
echo   AUTOMATION by 7goneinsane
echo ============================================
echo.

REM Check Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python from https://python.org/downloads
    echo Make sure to tick "Add Python to PATH" during install.
    pause
    exit /b 1
)

REM Install required packages silently if not already present
echo Checking required packages...
pip install pandas openpyxl --quiet --disable-pip-version-check
echo.

REM Check that input files exist
if not exist "Children_data.csv" (
    echo ERROR: Children_data.csv not found in this folder.
    echo Please place Children_data.csv in the same folder as this file.
    pause
    exit /b 1
)

if not exist "Emergency_contacts_data.xlsx" (
    echo ERROR: Emergency_contacts_data.xlsx not found in this folder.
    echo Please place Emergency_contacts_data.xlsx in the same folder as this file.
    pause
    exit /b 1
)

echo Input files found.
echo.

REM Run the migration script - will prompt for Service ID and Name
python x2x_migration.py

echo.
if %errorlevel%==0 (
    echo ============================================
    echo   SUCCESS!  PC_import.csv is ready.
    echo ============================================
    echo.
    echo Remember to:
    echo   1. Open PC_import.csv
    echo   2. Fill in any blank Gender cells ^(Column G^)
    echo   3. Verify postcodes are 4 digits
    echo   4. Save as CSV UTF-8
    echo   5. Import into the new service
) else (
    echo ============================================
    echo   Something went wrong. See error above.
    echo ============================================
)
echo.
pause

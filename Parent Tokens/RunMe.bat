@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR]  Python not found.
    echo           Install from https://python.org/downloads
    echo           Tick "Add Python to PATH" during install.
    echo.
    pause & exit /b 1
)

pip install pandas openpyxl --quiet --disable-pip-version-check

python ParentToken_Report_Generator.py

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR]  Script failed. See output above.
    echo.
    pause
)
@echo off
:: setup-hip-agent.bat
:: Automates the setup of the HIP Card Scan Agent and HIP TIME Auto-Connect as Windows Scheduled Tasks.
:: Run this script as Administrator.

cd /d "%~dp0"

echo ===================================================
echo  EBCI Nexus - HIP Card Sync 24/7 Windows Setup
echo ===================================================
echo Current Directory: %cd%

:: 1. Verify Node.js and sqlcmd exist
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found. Please install Node.js from https://nodejs.org/ first.
    pause
    exit /b 1
)

where sqlcmd >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] sqlcmd was not found in PATH. SQL Server command-line tools might be needed.
)

:: 2. Setup .env file if not exists
cd ..
if not exist .env (
    if exist .env.local (
        echo Copying .env.local to .env ...
        copy .env.local .env
    ) else (
        echo [WARNING] No .env or .env.local file found.
    )
)
cd scripts

:: 3. Create Task 1: Auto start & connect HIP TIME 4.0
echo.
echo [1/2] Creating Task "EBCI_HIP_Time_Auto"...
schtasks /create /tn "EBCI_HIP_Time_Auto" /tr "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File \"%~dp0start-hip-time-auto.ps1\"" /sc onlogon /f /rl highest

:: 4. Create Task 2: Continuous SQL Sync Loop
echo.
echo [2/2] Creating Task "EBCI_HIP_SQL_Sync"...
schtasks /create /tn "EBCI_HIP_SQL_Sync" /tr "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File \"%~dp0run-hip-sql-sync-loop.ps1\"" /sc onlogon /f /rl highest

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo  Setup Completed Successfully!
    echo ===================================================
    echo 1. HIP TIME 4.0 will auto-connect at Windows logon.
    echo 2. EBCI SQL Sync will automatically sync card scans every 60s.
    echo.
    echo Starting the sync loop immediately...
    schtasks /run /tn "EBCI_HIP_SQL_Sync"
    echo.
    echo To monitor sync status:
    echo   Get-Content -Tail 20 -Wait ..\hip-sql-sync.log
    echo ===================================================
) else (
    echo [ERROR] Failed to create scheduled tasks. Please ensure you right-click and "Run as administrator".
)

pause

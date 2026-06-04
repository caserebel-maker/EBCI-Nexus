@echo off
:: setup-hip-agent.bat
:: Automates the setup of the HIP Card Scan Agent as a Windows Task Scheduler task.
:: Run this script as Administrator.

cd /d "%~dp0"

echo === EBCI Nexus HIP Card Agent Windows Setup ===
echo Directory: %cd%

:: 1. Verify files exist
if not exist hip-card-agent.mjs (
    echo [ERROR] hip-card-agent.mjs not found in scripts directory.
    pause
    exit /b 1
)

:: 2. Verify node.exe is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found. Please install Node.js from https://nodejs.org/ first.
    pause
    exit /b 1
)

:: 3. Setup .env file if not exists
cd ..
if not exist .env (
    if exist .env.local (
        echo Copying .env.local to .env ...
        copy .env.local .env
    ) else (
        echo [WARNING] No .env or .env.local file found. Please create a .env file with necessary variables.
    )
)
cd scripts

:: 4. Create Task in Task Scheduler to run at user logon
echo Creating Windows Scheduled Task "EBCI_HIP_Agent"...
schtasks /create /tn "EBCI_HIP_Agent" /tr "wscript.exe \"%~dp0run-silent.vbs\"" /sc onlogon /f

if %errorlevel% equ 0 (
    echo.
    echo === Setup Completed Successfully ===
    echo The agent is scheduled to start automatically when you log into Windows.
    echo.
    echo To start the agent immediately, run:
    echo   schtasks /run /tn "EBCI_HIP_Agent"
    echo.
    echo To stop the agent, run:
    echo   taskkill /f /im node.exe
    echo.
    echo To view live logs:
    echo   type "..\logs\hip-agent.log"
    echo ====================================
) else (
    echo [ERROR] Failed to create scheduled task. Please make sure to run this script as Administrator.
)

pause

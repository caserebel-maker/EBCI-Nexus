@echo off
:: Redirects directory to where the batch script is located
cd /d "%~dp0\.."

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Create logs directory if not exists
if not exist logs (
    mkdir logs
)

echo [%date% %time%] Starting EBCI HIP Card Agent... >> logs\hip-agent.log
node scripts\hip-card-agent.mjs watch >> logs\hip-agent.log 2>&1
echo [%date% %time%] Agent stopped with code %errorlevel% >> logs\hip-agent.log

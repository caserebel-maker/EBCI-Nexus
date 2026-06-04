@echo off
set "REPO_ROOT=%~dp0.."
cd /d "%REPO_ROOT%"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\scripts\run-hip-sql-sync.ps1"

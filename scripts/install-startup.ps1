$ScriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentPath = Join-Path $ScriptsDir "sql-sync-agent.ps1"

# Find Startup folder path
$StartupPath = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$BatchPath = Join-Path $StartupPath "EBCI_Nexus_Sync.bat"

# Create batch script content
$Content = @"
@echo off
start /min powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "$AgentPath"
"@

# Write to startup batch file
Set-Content -Path $BatchPath -Value $Content

Write-Host "--- Windows Startup Folder Setup Successful ---"
Write-Host "Batch File: $BatchPath"
Write-Host "It will run sql-sync-agent.ps1 in the background automatically on every login."

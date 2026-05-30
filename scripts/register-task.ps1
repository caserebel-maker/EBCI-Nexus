$ScriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentPath = Join-Path $ScriptsDir "sql-sync-agent.ps1"

# Create action to execute PowerShell script in hidden window
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AgentPath`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

# Register the task to run under the active user's logon
Register-ScheduledTask -TaskName "EBCI_Nexus_SQL_Sync" -Action $Action -Trigger $Trigger -Settings $Settings -Force

Write-Host "--- Windows Task Scheduler Registered Successfully ---"
Write-Host "Task Name: EBCI_Nexus_SQL_Sync"
Write-Host "Trigger: At Log On of the user"
Write-Host "Command: PowerShell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$AgentPath`""

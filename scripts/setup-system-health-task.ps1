$ErrorActionPreference = 'Stop'

$scriptPath = 'C:\EBCI-Nexus\scripts\report-system-health.ps1'
$taskName = 'EBCI_System_Health_Report'

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Please run this script from an elevated PowerShell window (Run as administrator).'
    }
}

Assert-Administrator

$pwsh = Get-Command 'pwsh.exe' -ErrorAction SilentlyContinue
$runner = if ($pwsh -and $pwsh.Source) { $pwsh.Source } else { 'PowerShell.exe' }

$action = New-ScheduledTaskAction `
    -Execute $runner `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$minuteTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Minutes 1)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -MultipleInstances IgnoreNew `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger @($logonTrigger, $minuteTrigger) `
    -Settings $settings `
    -Description 'Report office HIP sync machine health to EBCI Nexus every minute.' `
    -RunLevel Highest `
    -Force | Out-Null

Start-ScheduledTask -TaskName $taskName

Get-ScheduledTask -TaskName $taskName |
    Select-Object TaskName, State |
    Format-Table -AutoSize

Write-Host ''
Write-Host "Done. $taskName is registered with highest privileges."

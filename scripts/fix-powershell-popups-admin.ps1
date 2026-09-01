$ErrorActionPreference = 'Stop'

$RepoRoot = 'C:\EBCI-Nexus'
$LogPath = Join-Path $RepoRoot 'fix-powershell-popups.log'

function Write-FixLog {
    param([string] $Message)
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $LogPath -Value "[$stamp] $Message"
}

function Set-TaskHidden {
    param(
        [Parameter(Mandatory = $true)][string] $TaskName,
        [Parameter(Mandatory = $true)][string] $Execute,
        [Parameter(Mandatory = $true)][string] $Arguments
    )

    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    $task.Actions = New-ScheduledTaskAction -Execute $Execute -Argument $Arguments
    $task.Settings.Hidden = $true
    Set-ScheduledTask -InputObject $task | Out-Null
    Write-FixLog "Updated scheduled task $TaskName to run hidden."
}

try {
    $healthTask = Get-ScheduledTask -TaskName 'EBCI_System_Health_Report' -ErrorAction SilentlyContinue
    if ($healthTask) {
        Disable-ScheduledTask -TaskName 'EBCI_System_Health_Report' | Out-Null
        Write-FixLog 'Disabled scheduled task EBCI_System_Health_Report because the hidden sync loop reports health without spawning a visible PowerShell window.'
    }

    Set-TaskHidden `
        -TaskName 'EBCI_Nightly_Hibernate_2200' `
        -Execute 'PowerShell.exe' `
        -Arguments '-WindowStyle Hidden -NoProfile -Command "Start-Sleep -Seconds 5; shutdown.exe /h"'

    $wakeTask = Get-ScheduledTask -TaskName 'EBCI_Daily_Wake_0500' -ErrorAction SilentlyContinue
    if ($wakeTask) {
        $wakeTask.Settings.Hidden = $true
        Set-ScheduledTask -InputObject $wakeTask | Out-Null
        Write-FixLog 'Updated scheduled task EBCI_Daily_Wake_0500 to run hidden.'
    }

    Write-FixLog 'PowerShell popup scheduled-task fix completed.'
} catch {
    Write-FixLog "ERROR: $($_.Exception.Message)"
    throw
}

$ErrorActionPreference = 'Stop'

$taskPrefix = 'EBCI'
$hibernateTaskName = "${taskPrefix}_Nightly_Hibernate_2200"
$wakeTaskName = "${taskPrefix}_Daily_Wake_0500"

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Please run this script from an elevated PowerShell window (Run as administrator).'
    }
}

Assert-Administrator

# Hibernate behaves like power-off for heat/noise, while still allowing Windows
# wake timers to resume the machine at 05:00. A full shutdown cannot be woken by
# Windows on many PCs; that requires BIOS/UEFI RTC power-on support.
powercfg.exe /hibernate on | Out-Null
powercfg.exe /SETACVALUEINDEX SCHEME_CURRENT SUB_SLEEP STANDBYIDLE 0 | Out-Null
powercfg.exe /SETDCVALUEINDEX SCHEME_CURRENT SUB_SLEEP STANDBYIDLE 0 | Out-Null
powercfg.exe /SETACVALUEINDEX SCHEME_CURRENT SUB_SLEEP HIBERNATEIDLE 0 | Out-Null
powercfg.exe /SETDCVALUEINDEX SCHEME_CURRENT SUB_SLEEP HIBERNATEIDLE 0 | Out-Null
powercfg.exe /SETACVALUEINDEX SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null
powercfg.exe /SETDCVALUEINDEX SCHEME_CURRENT SUB_SLEEP RTCWAKE 1 | Out-Null
powercfg.exe /SETACVALUEINDEX SCHEME_CURRENT SUB_VIDEO VIDEOIDLE 300 | Out-Null
powercfg.exe /SETDCVALUEINDEX SCHEME_CURRENT SUB_VIDEO VIDEOIDLE 300 | Out-Null
powercfg.exe /SETACTIVE SCHEME_CURRENT | Out-Null

$hibernateAction = New-ScheduledTaskAction `
    -Execute 'PowerShell.exe' `
    -Argument '-NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; shutdown.exe /h"'
$hibernateTrigger = New-ScheduledTaskTrigger -Daily -At '22:00'
$hibernateSettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $hibernateTaskName `
    -Action $hibernateAction `
    -Trigger $hibernateTrigger `
    -Settings $hibernateSettings `
    -Description 'Hibernate this machine daily at 22:00 to reduce heat while allowing the 05:00 wake timer.' `
    -Force | Out-Null

$wakeAction = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c exit 0'
$wakeTrigger = New-ScheduledTaskTrigger -Daily -At '05:00'
$wakeSettings = New-ScheduledTaskSettingsSet `
    -WakeToRun `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

Register-ScheduledTask `
    -TaskName $wakeTaskName `
    -Action $wakeAction `
    -Trigger $wakeTrigger `
    -Settings $wakeSettings `
    -Description 'Wake this machine daily at 05:00 so HIP TIME and EBCI Nexus sync can resume.' `
    -Force | Out-Null

Get-ScheduledTask -TaskName "${taskPrefix}_*" |
    Select-Object TaskName, State |
    Sort-Object TaskName |
    Format-Table -AutoSize

Write-Host ''
Write-Host 'Done. The machine will hibernate at 22:00 and wake at 05:00 daily.'
Write-Host 'HIP TIME and the EBCI Nexus sync are already configured in the user Startup folder.'

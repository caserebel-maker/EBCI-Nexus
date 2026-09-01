$ErrorActionPreference = 'Continue'

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $ScriptDir) { $ScriptDir = "C:\EBCI-Nexus\scripts" }
$ScriptPath = Join-Path $ScriptDir 'run-hip-sql-sync.ps1'
$HealthScriptPath = Join-Path $ScriptDir 'report-system-health.ps1'
$RepoRoot = Split-Path -Parent $ScriptDir
$LoopLog = Join-Path $RepoRoot 'hip-sql-sync-loop.log'
$LoopPidFile = Join-Path $RepoRoot '.hip-sql-sync-loop.pid'
$HealthIntervalSeconds = 60
$LastHealthReportAt = (Get-Date).AddSeconds(-$HealthIntervalSeconds)
$HealthPowerShell = 'powershell.exe'

function Write-LoopLog {
    param([string] $Message)
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LoopLog -Value "[$stamp] $Message"
}

if (Test-Path $LoopPidFile) {
    $existingPid = Get-Content $LoopPidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existingPid -and $existingPid -match '^\d+$') {
        $existing = Get-CimInstance Win32_Process -Filter "ProcessId = $existingPid" -ErrorAction SilentlyContinue
        if ($existing -and $existing.CommandLine -like '*run-hip-sql-sync-loop.ps1*') {
            Write-LoopLog "Skipped: loop is already running as PID $existingPid."
            exit 0
        }
    }
}

Set-Content -Path $LoopPidFile -Value $PID
Write-LoopLog 'HIP SQL sync loop started.'

while ($true) {
    try {
        $syncProcess = Start-Process -FilePath 'powershell.exe' `
            -ArgumentList "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" `
            -WorkingDirectory $RepoRoot `
            -WindowStyle Hidden `
            -PassThru
        $syncProcess.WaitForExit()
    } catch {
        Write-LoopLog "Loop error: $($_.Exception.Message)"
    }
    if ((Test-Path -LiteralPath $HealthScriptPath) -and (((Get-Date) - $LastHealthReportAt).TotalSeconds -ge $HealthIntervalSeconds)) {
        try {
            $healthProcess = Start-Process -FilePath $HealthPowerShell `
                -ArgumentList "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$HealthScriptPath`"" `
                -WorkingDirectory $RepoRoot `
                -WindowStyle Hidden `
                -PassThru
            $healthProcess.WaitForExit()
            $LastHealthReportAt = Get-Date
        } catch {
            Write-LoopLog "System health report error: $($_.Exception.Message)"
            $LastHealthReportAt = Get-Date
        }
    }
    Start-Sleep -Seconds 2
}

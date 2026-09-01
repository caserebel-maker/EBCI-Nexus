$ErrorActionPreference = 'Continue'

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $ScriptDir) { $ScriptDir = "C:\EBCI-Nexus\scripts" }
$HealthScriptPath = Join-Path $ScriptDir 'report-system-health.ps1'
$RepoRoot = Split-Path -Parent $ScriptDir
$LoopLog = Join-Path $RepoRoot 'hip-sql-sync-loop.log'
$LoopPidFile = Join-Path $RepoRoot '.hip-sql-sync-loop.pid'
$SyncLog = Join-Path $RepoRoot 'hip-sql-sync.log'
$LockFile = Join-Path $RepoRoot '.hip-sql-sync.lock'
$HealthIntervalSeconds = 60
$LastHealthReportAt = (Get-Date).AddSeconds(-$HealthIntervalSeconds)

function Write-LoopLog {
    param([string] $Message)
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LoopLog -Value "[$stamp] $Message"
}

function Write-HipLog {
    param([string] $Message)
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $SyncLog -Value "[$stamp] $Message"
}

function Invoke-HipSqlSyncInline {
    if (Test-Path $LockFile) {
        $lockAge = (Get-Date) - (Get-Item $LockFile).LastWriteTime
        if ($lockAge.TotalMinutes -lt 10) {
            Write-HipLog 'Skipped: previous sync is still running.'
            return
        }
        Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
    }

    New-Item -Path $LockFile -ItemType File -Force | Out-Null
    try {
        Push-Location -LiteralPath $RepoRoot
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
        Write-HipLog 'Starting HIP SQL sync.'
        $output = & node scripts/hip-card-agent.mjs sql-sync --once --limit 500 2>&1
        $exitCode = $LASTEXITCODE
        foreach ($line in $output) {
            Write-HipLog $line
        }
        if ($exitCode -ne 0) {
            Write-HipLog "Failed with exit code $exitCode."
        } else {
            Write-HipLog 'Finished HIP SQL sync.'
        }
    } finally {
        Pop-Location -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
    }
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
        Invoke-HipSqlSyncInline
    } catch {
        Write-LoopLog "Loop error: $($_.Exception.Message)"
    }
    if ((Test-Path -LiteralPath $HealthScriptPath) -and (((Get-Date) - $LastHealthReportAt).TotalSeconds -ge $HealthIntervalSeconds)) {
        try {
            & $HealthScriptPath
            $LastHealthReportAt = Get-Date
        } catch {
            Write-LoopLog "System health report error: $($_.Exception.Message)"
            $LastHealthReportAt = Get-Date
        }
    }
    Start-Sleep -Seconds 2
}

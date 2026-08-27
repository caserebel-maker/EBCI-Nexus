$ErrorActionPreference = 'Continue'

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $ScriptDir) { $ScriptDir = "C:\EBCI-Nexus\scripts" }
$ScriptPath = Join-Path $ScriptDir 'run-hip-sql-sync.ps1'
$RepoRoot = Split-Path -Parent $ScriptDir
$LoopLog = Join-Path $RepoRoot 'hip-sql-sync-loop.log'
$LoopPidFile = Join-Path $RepoRoot '.hip-sql-sync-loop.pid'

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
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath
    } catch {
        Write-LoopLog "Loop error: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 60
}

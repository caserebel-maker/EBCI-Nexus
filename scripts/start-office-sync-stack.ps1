$ErrorActionPreference = 'Continue'

$RepoRoot = 'C:\EBCI-Nexus'
$ScriptDir = Join-Path $RepoRoot 'scripts'
$LogPath = Join-Path $RepoRoot 'office-sync-startup.log'
$HipScript = Join-Path $ScriptDir 'start-hip-time-auto.ps1'
$SyncLoopScript = Join-Path $ScriptDir 'run-hip-sql-sync-loop.ps1'

function Write-StartupLog {
    param([string] $Message)
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -LiteralPath $LogPath -Value "[$stamp] $Message"
}

try {
    Write-StartupLog 'Starting EBCI office sync stack.'

    if (Test-Path -LiteralPath $HipScript) {
        $hipRunning = Get-Process -Name 'HIPSchool_Zee' -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($hipRunning) {
            Write-StartupLog "HIP TIME already running as PID $($hipRunning.Id)."
        } else {
            Start-Process -FilePath 'powershell.exe' `
                -ArgumentList "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$HipScript`"" `
                -WorkingDirectory $RepoRoot `
                -WindowStyle Hidden
            Write-StartupLog 'HIP TIME auto-start dispatched.'
        }
    } else {
        Write-StartupLog "HIP auto-start script not found: $HipScript"
    }

    if (Test-Path -LiteralPath $SyncLoopScript) {
        $syncRunning = Get-CimInstance Win32_Process |
            Where-Object { $_.CommandLine -like '*run-hip-sql-sync-loop.ps1*' -and $_.ProcessId -ne $PID } |
            Select-Object -First 1
        if ($syncRunning) {
            Write-StartupLog "HIP SQL sync loop already running as PID $($syncRunning.ProcessId)."
        } else {
            Start-Process -FilePath 'powershell.exe' `
                -ArgumentList "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$SyncLoopScript`"" `
                -WorkingDirectory $RepoRoot `
                -WindowStyle Hidden
            Write-StartupLog 'HIP SQL sync loop dispatched.'
        }
    } else {
        Write-StartupLog "HIP SQL sync loop script not found: $SyncLoopScript"
    }

    Write-StartupLog 'EBCI office sync stack startup complete.'
    exit 0
} catch {
    Write-StartupLog "ERROR: $($_.Exception.Message)"
    exit 1
}

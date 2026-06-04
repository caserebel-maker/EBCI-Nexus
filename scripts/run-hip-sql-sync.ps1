$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LockFile = Join-Path $RepoRoot '.hip-sql-sync.lock'
$LogFile = Join-Path $RepoRoot 'hip-sql-sync.log'

function Write-HipLog {
    param([string] $Message)
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LogFile -Value "[$stamp] $Message"
}

if (Test-Path $LockFile) {
    $lockAge = (Get-Date) - (Get-Item $LockFile).LastWriteTime
    if ($lockAge.TotalMinutes -lt 10) {
        Write-HipLog 'Skipped: previous sync is still running.'
        exit 0
    }
    Remove-Item -LiteralPath $LockFile -Force
}

New-Item -Path $LockFile -ItemType File -Force | Out-Null
try {
    Set-Location $RepoRoot
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
    Write-HipLog 'Starting HIP SQL sync.'
    $output = & node scripts/hip-card-agent.mjs sql-sync --once --limit 500 2>&1
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) {
        Write-HipLog $line
    }
    if ($exitCode -ne 0) {
        Write-HipLog "Failed with exit code $exitCode."
        exit $exitCode
    }
    Write-HipLog 'Finished HIP SQL sync.'
} finally {
    Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
}

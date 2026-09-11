param(
    [int] $FromId = 0,
    [int] $Limit = 100
)

$ErrorActionPreference = 'Continue'

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$RepoRoot = Split-Path -Parent $ScriptDir
$LockFile = Join-Path $RepoRoot '.hip-sql-sync.lock'
$LogFile = Join-Path $RepoRoot 'hip-resync.log'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  EBCI Nexus - HIP Card Scan Resync (ดึงข้อมูลย้อนหลัง)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Set lock file so background loop skips during resync
New-Item -Path $LockFile -ItemType File -Force | Out-Null

Push-Location -LiteralPath $RepoRoot
try {
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
    $modeArgs = if ($FromId -gt 0) {
        @('sql-sync', '--drain', '--from-id', "$FromId", '--limit', "$Limit")
    } else {
        @('sql-sync', '--resync', '--limit', "$Limit")
    }
    Write-Host "กำลังเริ่มดึงข้อมูลการแตะบัตรจาก SQL Server เข้าสู่ Nexus..." -ForegroundColor Yellow
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Starting resync from ID $FromId with limit $Limit." | Add-Content -LiteralPath $LogFile
    & node scripts/hip-card-agent.mjs @modeArgs 2>&1 | Tee-Object -FilePath $LogFile -Append
    Write-Host "`nเสร็จสิ้นการดึงข้อมูลย้อนหลังเรียบร้อยแล้ว!" -ForegroundColor Green
    Write-Host "ข้อมูลแตะบัตรที่เคยตกหล่นจะถูกนำเข้าสู่ระบบ Nexus ทันที" -ForegroundColor Green
} finally {
    Pop-Location -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
}

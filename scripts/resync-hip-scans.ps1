$ErrorActionPreference = 'Continue'

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$RepoRoot = Split-Path -Parent $ScriptDir
$LockFile = Join-Path $RepoRoot '.hip-sql-sync.lock'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  EBCI Nexus - HIP Card Scan Resync (ดึงข้อมูลย้อนหลัง)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Remove lock if exists
if (Test-Path $LockFile) {
    Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
}

Push-Location -LiteralPath $RepoRoot
try {
    $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
    Write-Host "กำลังเริ่มดึงข้อมูลการแตะบัตรจาก SQL Server ทั้งหมดเข้าสู่ Nexus..." -ForegroundColor Yellow
    & node scripts/hip-card-agent.mjs sql-sync --resync --limit 500
    Write-Host "`nเสร็จสิ้นการดึงข้อมูลย้อนหลังเรียบร้อยแล้ว!" -ForegroundColor Green
    Write-Host "ข้อมูลแตะบัตรที่เคยตกหล่นจะถูกนำเข้าสู่ระบบ Nexus ทันที" -ForegroundColor Green
} finally {
    Pop-Location -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $LockFile -Force -ErrorAction SilentlyContinue
}

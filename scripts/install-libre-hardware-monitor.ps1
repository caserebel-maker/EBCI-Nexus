$ErrorActionPreference = 'Stop'

$installRoot = 'C:\Tools\LibreHardwareMonitor'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) 'ebci-lhm-install'
$releaseApi = 'https://api.github.com/repos/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest'

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null

$release = Invoke-RestMethod -Uri $releaseApi -Headers @{ 'User-Agent' = 'EBCI-Nexus-Setup' }
$asset = $release.assets |
    Where-Object { $_.name -match '\.zip$' } |
    Select-Object -First 1

if (-not $asset) {
    throw 'No zip asset found on latest LibreHardwareMonitor release.'
}

$zipPath = Join-Path $tempRoot $asset.name
$extractPath = Join-Path $tempRoot 'extract'

Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -UseBasicParsing

if (Test-Path -LiteralPath $extractPath) {
    Remove-Item -LiteralPath $extractPath -Recurse -Force
}
Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force

$resolvedInstallRoot = (Resolve-Path -LiteralPath $installRoot).Path
if ($resolvedInstallRoot -ne 'C:\Tools\LibreHardwareMonitor') {
    throw "Refusing to replace unexpected install path: $resolvedInstallRoot"
}

Get-ChildItem -LiteralPath $installRoot -Force | Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath $extractPath -Force | Move-Item -Destination $installRoot -Force

$exe = Get-ChildItem -LiteralPath $installRoot -Recurse -Filter 'LibreHardwareMonitor.exe' |
    Select-Object -First 1
if (-not $exe) {
    throw 'LibreHardwareMonitor.exe not found after extraction.'
}

[PSCustomObject]@{
    Version = $release.tag_name
    InstallPath = $installRoot
    Exe = $exe.FullName
    Download = $asset.browser_download_url
} | Format-List

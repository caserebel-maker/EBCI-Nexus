$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $PSScriptRoot

if (-not (Test-Path ".\go2rtc.exe")) {
    Write-Host "Downloading go2rtc for Windows x64..."
    curl.exe -L -o "go2rtc.zip" "https://github.com/AlexxIT/go2rtc/releases/download/v1.9.14/go2rtc_win64.zip"
    tar -xf "go2rtc.zip" -C "."
    Remove-Item "go2rtc.zip" -Force
}

# Ensure connected to EBCI Wi-Fi (for camera subnet 192.168.0.x)
$wifiStatus = netsh wlan show interfaces
if ($wifiStatus -notmatch 'SSID\s*:\s*EBCI') {
    Write-Host "Connecting to Wi-Fi SSID 'EBCI'..."
    netsh wlan connect name="EBCI" | Out-Null
    Start-Sleep -Seconds 2
}

Write-Host "Starting go2rtc with config: $PSScriptRoot\go2rtc.yaml"
$go2rtcProc = Start-Process -FilePath ".\go2rtc.exe" -ArgumentList "-config `".\go2rtc.yaml`"" -PassThru -NoNewWindow

if (Test-Path ".\cloudflared.exe") {
    Write-Host "Starting Cloudflare HTTPS tunnel..."
    Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel --url http://127.0.0.1:1984" -NoNewWindow
}

$go2rtcProc.WaitForExit()

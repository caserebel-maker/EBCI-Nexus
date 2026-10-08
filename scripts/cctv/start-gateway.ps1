$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $PSScriptRoot

# Prevent Windows from sleeping while gateway is running
try {
    powercfg /change standby-timeout-ac 0 2>$null
    powercfg /change hibernate-timeout-ac 0 2>$null
    $sleepCode = @'
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);
'@
    $ste = Add-Type -MemberDefinition $sleepCode -Name "SleepUtil" -Namespace "Win32" -PassThru -ErrorAction SilentlyContinue
    if ($ste) { $ste::SetThreadExecutionState(0x80000041) | Out-Null }
    Write-Host "[OK] Configured Windows to STAY AWAKE (Sleep Mode Disabled)" -ForegroundColor Cyan
} catch {
    # Ignore if not admin
}

# Clean up any lingering processes
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "go2rtc" -ErrorAction SilentlyContinue | Stop-Process -Force

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

if (-not (Test-Path ".\cloudflared.exe")) {
    Write-Host "Downloading cloudflared for Windows x64..."
    curl.exe -L -o "cloudflared.exe" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
}

if (Test-Path ".\cloudflared.exe") {
    Write-Host "Starting Cloudflare HTTPS tunnel..."
    Remove-Item "cloudflare.log" -Force -ErrorAction SilentlyContinue
    Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel --url http://127.0.0.1:1984 --logfile cloudflare.log" -NoNewWindow
    
    Write-Host "Waiting for Cloudflare Tunnel URL..."
    $tunnelUrl = ""
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path "cloudflare.log") {
            $log = Get-Content "cloudflare.log" -Raw
            if ($log -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com') {
                $tunnelUrl = $matches[0]
                break
            }
        }
    }
    
    if ($tunnelUrl) {
        Write-Host ""
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host ">>> CLOUDFLARE TUNNEL URL: $tunnelUrl" -ForegroundColor Green
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Copy the URL above and send to Sunny/Nexus to update cameras if needed." -ForegroundColor Yellow
    }
}

Write-Host "CCTV Gateway is ACTIVE. Keep this window OPEN." -ForegroundColor Green
$go2rtcProc.WaitForExit()

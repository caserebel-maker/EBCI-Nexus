$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $PSScriptRoot

# 1. Prevent Windows from sleeping while gateway is running
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

# 2. Ensure connected to EBCI Wi-Fi and set to auto-connect on boot
try {
    netsh wlan set profileparameter name="EBCI" connectionmode=auto 2>$null
    $wifiStatus = netsh wlan show interfaces
    if ($wifiStatus -notmatch 'SSID\s*:\s*EBCI') {
        Write-Host "Connecting to Wi-Fi SSID 'EBCI'..." -ForegroundColor Yellow
        netsh wlan connect name="EBCI" | Out-Null
        Start-Sleep -Seconds 3
    }
    Write-Host "[OK] Wi-Fi 'EBCI' connection verified" -ForegroundColor Cyan
} catch {}

# 3. Clean up any lingering processes
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "go2rtc" -ErrorAction SilentlyContinue | Stop-Process -Force

# 4. Ensure binaries exist
if (-not (Test-Path ".\go2rtc.exe")) {
    Write-Host "Downloading go2rtc for Windows x64..."
    curl.exe -L -o "go2rtc.zip" "https://github.com/AlexxIT/go2rtc/releases/download/v1.9.14/go2rtc_win64.zip"
    tar -xf "go2rtc.zip" -C "."
    Remove-Item "go2rtc.zip" -Force
}

if (-not (Test-Path ".\cloudflared.exe")) {
    Write-Host "Downloading cloudflared for Windows x64..."
    curl.exe -L -o "cloudflared.exe" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
}

# 5. Launch Node.js Gateway Supervisor
Write-Host "Starting EBCI CCTV Gateway Supervisor (Relays + go2rtc + Cloudflare + Auto-Heartbeat)..." -ForegroundColor Green
node ".\gateway-supervisor.js"

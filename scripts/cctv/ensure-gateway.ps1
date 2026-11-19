$ErrorActionPreference = 'SilentlyContinue'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$supJs = Join-Path $dir 'gateway-supervisor.js'

# 1. Fast atomic check: is supervisor already holding lock port 19850?
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect('127.0.0.1', 19850, $null, $null)
    if ($async.AsyncWaitHandle.WaitOne(250, $false) -and $tcp.Connected) {
        $tcp.EndConnect($async)
        $tcp.Close()
        exit 0
    }
    $tcp.Close()
} catch {}

# 2. If binaries are missing, delegate to full setup script
if (-not (Test-Path (Join-Path $dir 'go2rtc.exe')) -or -not (Test-Path (Join-Path $dir 'cloudflared.exe'))) {
    $fullScript = Join-Path $dir 'start-gateway.ps1'
    Start-Process -FilePath 'powershell.exe' -ArgumentList "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$fullScript`"" -WorkingDirectory $dir -WindowStyle Hidden
    exit 0
}

# 3. Launch Node.js supervisor completely detached & hidden
$nodeExe = 'C:\Program Files\nodejs\node.exe'
if (-not (Test-Path $nodeExe)) { $nodeExe = 'node.exe' }

Start-Process -FilePath $nodeExe -ArgumentList "`"$supJs`"" -WorkingDirectory $dir -WindowStyle Hidden
exit 0

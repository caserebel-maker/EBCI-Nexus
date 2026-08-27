$ErrorActionPreference = "Stop"

$hipExe = "C:\Program Files (x86)\HIP TIME\HIPSchool_Zee.exe"
$hipWorkingDirectory = Split-Path -Parent $hipExe
$logPath = "C:\EBCI-Nexus\hip-time-auto.log"

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class HipWindowAutomation
{
    [StructLayout(LayoutKind.Sequential)]
    public struct WindowRect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr window, out WindowRect rect);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr window);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr window, int command);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
}
"@

function Write-HipAutoLog {
    param([string]$Message)

    Add-Content -LiteralPath $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
}

function Invoke-LeftClick {
    param(
        [int]$X,
        [int]$Y
    )

    [void][HipWindowAutomation]::SetCursorPos($X, $Y)
    [HipWindowAutomation]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
    [HipWindowAutomation]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
}

function Test-HipDeviceConnection {
    param([int]$ProcessId)

    return [bool](Get-NetTCPConnection -RemoteAddress "192.168.1.40" -RemotePort 5005 -State Established -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -eq $ProcessId } |
        Select-Object -First 1)
}

try {
    Start-Sleep -Seconds 15

    $hipProcess = Get-Process -Name "HIPSchool_Zee" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $hipProcess) {
        $hipProcess = Start-Process -FilePath $hipExe -WorkingDirectory $hipWorkingDirectory -PassThru
        Write-HipAutoLog "Started HIP TIME (PID $($hipProcess.Id))."
    }

    for ($wait = 0; $wait -lt 30; $wait++) {
        $hipProcess.Refresh()
        if ($hipProcess.MainWindowHandle -ne 0) {
            break
        }
        Start-Sleep -Seconds 1
    }

    if ($hipProcess.MainWindowHandle -eq 0) {
        throw "HIP TIME main window was not available."
    }

    # Auto Download is enabled in HIP settings; keeping the main application
    # running is sufficient. Minimize it so it can receive scans in the
    # background without fragile coordinate-based UI automation.
    Write-HipAutoLog "HIP TIME is ready with Auto Download enabled."
    [void][HipWindowAutomation]::ShowWindow($hipProcess.MainWindowHandle, 6)
    exit 0
}
catch {
    Write-HipAutoLog "ERROR: $($_.Exception.Message)"
    exit 1
}

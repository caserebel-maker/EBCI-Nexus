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

    if (Test-HipDeviceConnection -ProcessId $hipProcess.Id) {
        Write-HipAutoLog "HIP TIME was already connected to 192.168.1.40:5005."
        exit 0
    }

    for ($attempt = 1; $attempt -le 3; $attempt++) {
        [void][HipWindowAutomation]::ShowWindow($hipProcess.MainWindowHandle, 3)
        [void][HipWindowAutomation]::SetForegroundWindow($hipProcess.MainWindowHandle)
        Start-Sleep -Milliseconds 700

        $rect = New-Object HipWindowAutomation+WindowRect
        if (-not [HipWindowAutomation]::GetWindowRect($hipProcess.MainWindowHandle, [ref]$rect)) {
            throw "Could not read HIP TIME window position."
        }

        # Open the scanner-machine screen, then press its Connect command.
        Invoke-LeftClick -X ($rect.Left + 45) -Y ($rect.Top + 65)
        Start-Sleep -Seconds 4
        Invoke-LeftClick -X ($rect.Left + 740) -Y ($rect.Top + 500)
        Start-Sleep -Seconds 20

        if (Test-HipDeviceConnection -ProcessId $hipProcess.Id) {
            Write-HipAutoLog "Connected HIP TIME to 192.168.1.40:5005 on attempt $attempt."
            [void][HipWindowAutomation]::ShowWindow($hipProcess.MainWindowHandle, 6)
            exit 0
        }

        Write-HipAutoLog "Connection attempt $attempt did not establish a session."
    }

    throw "HIP TIME could not connect to 192.168.1.40:5005 after 3 attempts."
}
catch {
    Write-HipAutoLog "ERROR: $($_.Exception.Message)"
    exit 1
}

$ErrorActionPreference = 'Stop'

try {
    Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class EbciConsoleWindow
{
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@ -ErrorAction SilentlyContinue

    $consoleWindow = [EbciConsoleWindow]::GetConsoleWindow()
    if ($consoleWindow -ne [IntPtr]::Zero) {
        [void][EbciConsoleWindow]::ShowWindow($consoleWindow, 0)
    }
} catch {
    # Best effort only. If Windows blocks window hiding, still report health.
}

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvPath = Join-Path $RepoRoot '.env.local'
$LogPath = Join-Path $RepoRoot 'system-health.log'

function Write-HealthLog {
    param([string] $Message)
    $stamp = [DateTime]::Now.ToString('yyyy-MM-dd HH:mm:ss', [Globalization.CultureInfo]::InvariantCulture)
    Add-Content -LiteralPath $LogPath -Value "[$stamp] $Message"
}

function Import-DotEnv {
    param([string] $Path)

    if (-not (Test-Path -LiteralPath $Path)) { return }
    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#') -or $line -notmatch '=') { return }
        $parts = $line -split '=', 2
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        if ($name -and -not [Environment]::GetEnvironmentVariable($name, 'Process')) {
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

function Get-TemperatureReading {
    $readings = @()

    $enableLhm = [Environment]::GetEnvironmentVariable('ENABLE_LHM_TEMPERATURE', 'Process') -eq 'true'
    $lhmLib = 'C:\Tools\LibreHardwareMonitor\LibreHardwareMonitorLib.dll'
    if ($enableLhm -and (Test-Path -LiteralPath $lhmLib)) {
        $lhmDir = Split-Path -Parent $lhmLib
        try {
            Push-Location -LiteralPath $lhmDir
            Add-Type -Path $lhmLib -ErrorAction SilentlyContinue
            $computer = [LibreHardwareMonitor.Hardware.Computer]::new()
            $computer.IsCpuEnabled = $true
            $computer.IsGpuEnabled = $true
            $computer.IsMotherboardEnabled = $true
            $computer.IsStorageEnabled = $true
            $computer.Open()

            foreach ($hardware in $computer.Hardware) {
                $hardware.Update()
                foreach ($sensor in $hardware.Sensors) {
                    if ($sensor.SensorType.ToString() -eq 'Temperature' -and $null -ne $sensor.Value) {
                        $celsius = [math]::Round([double]$sensor.Value, 1)
                        if ($celsius -gt 0 -and $celsius -lt 120) {
                            $readings += [PSCustomObject]@{
                                value = $celsius
                                source = "LibreHardwareMonitor:$($hardware.Name):$($sensor.Name)"
                                priority = Get-TemperaturePriority -Source "LibreHardwareMonitor:$($hardware.Name):$($sensor.Name)"
                            }
                        }
                    }
                }
                foreach ($sub in $hardware.SubHardware) {
                    $sub.Update()
                    foreach ($sensor in $sub.Sensors) {
                        if ($sensor.SensorType.ToString() -eq 'Temperature' -and $null -ne $sensor.Value) {
                            $celsius = [math]::Round([double]$sensor.Value, 1)
                            if ($celsius -gt 0 -and $celsius -lt 120) {
                                $readings += [PSCustomObject]@{
                                    value = $celsius
                                    source = "LibreHardwareMonitor:$($sub.Name):$($sensor.Name)"
                                    priority = Get-TemperaturePriority -Source "LibreHardwareMonitor:$($sub.Name):$($sensor.Name)"
                                }
                            }
                        }
                    }
                }
            }
            $computer.Close()
        } catch {
            Write-HealthLog "LibreHardwareMonitor temperature unavailable: $($_.Exception.Message)"
        } finally {
            Pop-Location -ErrorAction SilentlyContinue
        }
    }

    try {
        $thermalZones = Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop
        foreach ($zone in $thermalZones) {
            $celsius = [math]::Round(($zone.CurrentTemperature / 10) - 273.15, 1)
            if ($celsius -gt 0 -and $celsius -lt 120) {
                $readings += [PSCustomObject]@{
                    value = $celsius
                    source = "ACPI thermal zone (reference only, not CPU package):$($zone.InstanceName)"
                    priority = 10
                }
            }
        }
    } catch {
        Write-HealthLog "Temperature unavailable: $($_.Exception.Message)"
    }

    if ($readings.Count -eq 0) {
        return [PSCustomObject]@{ value = $null; source = $null; candidates = @() }
    }

    $best = $readings |
        Sort-Object @{ Expression = 'priority'; Descending = $true }, @{ Expression = 'value'; Descending = $true } |
        Select-Object -First 1
    return [PSCustomObject]@{
        value = [double]$best.value
        source = [string]$best.source
        candidates = $readings
    }
}

function Get-TemperaturePriority {
    param([string] $Source)

    $lower = $Source.ToLowerInvariant()
    if ($lower -match 'cpu.*(package|core|max|tdie|tctl)' -or $lower -match '(package|core|max|tdie|tctl).*cpu') {
        return 100
    }
    if ($lower -match 'gpu') {
        return 80
    }
    if ($lower -match 'storage|ssd|nvme|hdd') {
        return 65
    }
    if ($lower -match 'motherboard|mainboard|board|chipset') {
        return 50
    }
    if ($lower -match 'acpi|thermal zone') {
        return 10
    }
    return 40
}

Import-DotEnv -Path $EnvPath

$appUrl = [Environment]::GetEnvironmentVariable('NEXT_PUBLIC_APP_URL', 'Process')
if (-not $appUrl) {
    $appUrl = 'https://ebci-nexus.vercel.app'
}
$appUrl = $appUrl.TrimEnd('/')
$webhookUrl = [Environment]::GetEnvironmentVariable('NEXUS_SYSTEM_HEALTH_WEBHOOK', 'Process')
if (-not $webhookUrl) {
    $webhookUrl = "$appUrl/api/webhooks/system-health"
}

$secret = [Environment]::GetEnvironmentVariable('SYSTEM_HEALTH_WEBHOOK_SECRET', 'Process')
if (-not $secret) {
    $secret = [Environment]::GetEnvironmentVariable('CARD_SCAN_WEBHOOK_SECRET', 'Process')
}
if (-not $secret) {
    throw 'Missing SYSTEM_HEALTH_WEBHOOK_SECRET or CARD_SCAN_WEBHOOK_SECRET.'
}

$temperature = Get-TemperatureReading
$processor = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
$os = Get-CimInstance Win32_OperatingSystem
$totalMemoryKb = [double]$os.TotalVisibleMemorySize
$freeMemoryKb = [double]$os.FreePhysicalMemory
$memoryUsedPercent = if ($totalMemoryKb -gt 0) {
    [math]::Round((($totalMemoryKb - $freeMemoryKb) / $totalMemoryKb) * 100, 1)
} else {
    $null
}
$uptimeSeconds = [int64]((Get-Date) - $os.LastBootUpTime).TotalSeconds
$hipProcess = Get-Process -Name 'HIPSchool_Zee' -ErrorAction SilentlyContinue | Select-Object -First 1
$syncLoop = Get-CimInstance Win32_Process |
    Where-Object {
        $_.ProcessId -ne $PID -and
        $_.CommandLine -like '*run-hip-sql-sync-loop.ps1*'
    } |
    Select-Object -First 1
$battery = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue | Select-Object -First 1
$powerStatus = if ($battery) {
    if ($battery.BatteryStatus -eq 2) { 'AC charging/plugged' } else { "Battery status $($battery.BatteryStatus)" }
} else {
    'AC desktop/no battery'
}

$payload = [ordered]@{
    host_key = 'office-hip-sync-pc'
    host_name = $env:COMPUTERNAME
    temperature_c = $temperature.value
    temperature_source = $temperature.source
    cpu_load_percent = if ($processor.Average -ne $null) { [math]::Round([double]$processor.Average, 1) } else { $null }
    memory_used_percent = $memoryUsedPercent
    uptime_seconds = $uptimeSeconds
    hip_running = [bool]$hipProcess
    sync_loop_running = [bool]$syncLoop
    power_status = $powerStatus
    reported_at = [DateTimeOffset]::Now.ToString('o')
    raw_data = @{
        temperature_candidates = $temperature.candidates
        hip_pid = if ($hipProcess) { $hipProcess.Id } else { $null }
        sync_loop_pid = if ($syncLoop) { $syncLoop.ProcessId } else { $null }
    }
}

$body = $payload | ConvertTo-Json -Depth 6
$headers = @{ 'X-Webhook-Secret' = $secret }

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 20
    Write-HealthLog "Posted system health to $webhookUrl; success=$($response.success); temp=$($payload.temperature_c); cpu=$($payload.cpu_load_percent); mem=$($payload.memory_used_percent)"
} catch {
    Write-HealthLog "POST failed: $($_.Exception.Message)"
    throw
}

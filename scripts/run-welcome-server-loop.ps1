$ErrorActionPreference = 'Continue'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$LoopLog = Join-Path $RepoRoot 'welcome-server-loop.log'
$LoopPidFile = Join-Path $RepoRoot '.welcome-server-loop.pid'

function Write-WelcomeLog {
    param([string] $Message)
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $LoopLog -Value "[$stamp] $Message"
}

function Get-WelcomeProcess {
    Get-CimInstance Win32_Process -Filter "name='node.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like '*welcome-server.mjs*' }
}

if (Test-Path $LoopPidFile) {
    $existingPid = Get-Content $LoopPidFile -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existingPid -and $existingPid -match '^\d+$') {
        $existing = Get-CimInstance Win32_Process -Filter "ProcessId = $existingPid" -ErrorAction SilentlyContinue
        if ($existing -and $existing.CommandLine -like '*run-welcome-server-loop.ps1*') {
            Write-WelcomeLog "Skipped: welcome server loop is already running as PID $existingPid."
            exit 0
        }
    }
}

Set-Content -Path $LoopPidFile -Value $PID
Write-WelcomeLog 'Welcome TV server loop started.'

$lastExistingPid = $null

try {
    while ($true) {
        $existingServer = Get-WelcomeProcess | Select-Object -First 1
        if ($existingServer) {
            if ($lastExistingPid -ne $existingServer.ProcessId) {
                Write-WelcomeLog "Welcome server is already running as PID $($existingServer.ProcessId)."
                $lastExistingPid = $existingServer.ProcessId
            }
            Start-Sleep -Seconds 10
            continue
        }

        $lastExistingPid = $null
        Set-Location $RepoRoot
        $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
        Write-WelcomeLog 'Starting welcome-server.mjs.'

        & node welcome-server.mjs 2>&1 | ForEach-Object {
            Write-WelcomeLog ([string] $_)
        }

        Write-WelcomeLog "welcome-server.mjs exited with code $LASTEXITCODE; restarting in 5 seconds."
        Start-Sleep -Seconds 5
    }
} finally {
    Remove-Item -LiteralPath $LoopPidFile -Force -ErrorAction SilentlyContinue
    Write-WelcomeLog 'Welcome TV server loop stopped.'
}

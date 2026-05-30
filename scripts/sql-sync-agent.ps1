#!/usr/bin/env pwsh
param (
    [string]$Server = ".\SQLEXPRESS",
    [string]$Database = "Synctime",
    [string]$WebhookUrl = "",
    [string]$Secret = "",
    [int]$IntervalSeconds = 30,
    [switch]$Once,
    [switch]$ForceAll
)

$ScriptsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptsDir
if (!$RepoRoot) { $RepoRoot = "." }

# Helper to load .env files
function Load-EnvFile($FileName) {
    $FilePath = Join-Path $RepoRoot $FileName
    if (Test-Path $FilePath) {
        Get-Content $FilePath | ForEach-Object {
            $Line = $_.Trim()
            if ($Line -and !$Line.StartsWith("#") -and $Line.Contains("=")) {
                $Idx = $Line.IndexOf("=")
                $Key = $Line.Substring(0, $Idx).Trim()
                $Val = $Line.Substring($Idx + 1).Trim()
                if ($Val.StartsWith('"') -and $Val.EndsWith('"')) { $Val = $Val.Substring(1, $Val.Length - 2) }
                if ($Val.StartsWith("'") -and $Val.EndsWith("'")) { $Val = $Val.Substring(1, $Val.Length - 2) }
                if (![System.Environment]::GetEnvironmentVariable($Key)) {
                    [System.Environment]::SetEnvironmentVariable($Key, $Val)
                }
            }
        }
    }
}

Load-EnvFile ".env.local"
Load-EnvFile ".env"

# Resolve config from environment if not passed as parameters
if (!$WebhookUrl) {
    $EnvWebhook = [System.Environment]::GetEnvironmentVariable("NEXUS_CARD_SCAN_WEBHOOK")
    if ($EnvWebhook) {
        $WebhookUrl = $EnvWebhook
    } else {
        $AppUrl = [System.Environment]::GetEnvironmentVariable("NEXT_PUBLIC_APP_URL")
        if (!$AppUrl) { $AppUrl = "https://ebci-nexus.vercel.app" }
        $WebhookUrl = "$($AppUrl.TrimEnd('/'))/api/webhooks/card-scan"
    }
}

if (!$Secret) {
    $Secret = [System.Environment]::GetEnvironmentVariable("CARD_SCAN_WEBHOOK_SECRET")
}

$StateFile = Join-Path $RepoRoot ".sql-sync-state.json"

Write-Host "[sql-sync] Configuration:"
Write-Host "  - Server: $Server"
Write-Host "  - Database: $Database"
Write-Host "  - Webhook URL: $WebhookUrl"
Write-Host "  - Webhook Secret: $(if ($Secret) { "CONFIGURED" } else { "MISSING" })"
Write-Host "  - Interval: $IntervalSeconds seconds"

if (!$Secret -and !$Once) {
    Write-Warning "CARD_SCAN_WEBHOOK_SECRET is missing. Webhook posts will fail without authentication."
}

# Function to parse enrollnumber to employee code
function Map-EnrollNumber($EnrollNumber) {
    $Str = [string]$EnrollNumber
    # Pattern: 700935 -> 009-35
    if ($Str.Length -eq 6 -and $Str.StartsWith("7")) {
        $Code = $Str.Substring(1) # 00935
        return "$($Code.Substring(0, 3))-$($Code.Substring(3, 2))" # 009-35
    }
    return $Str
}

# Function to parse raw date string from database
function Parse-ScanTime($RawTime) {
    try {
        # e.g., "2026-05-27 23:08:37 PM"
        $CleanTime = $RawTime.Replace(" PM", " PM").Replace(" AM", " AM")
        $Parsed = [DateTime]::Parse($CleanTime)
        return $Parsed.ToString("yyyy-MM-ddTHH:mm:ss")
    } catch {
        return $RawTime
    }
}

# Load state
$LastId = 0
if (Test-Path $StateFile) {
    try {
        $State = Get-Content $StateFile | ConvertFrom-Json
        $LastId = $State.last_id
        Write-Host "[sql-sync] Loaded state, last processed id: $LastId"
    } catch {
        Write-Host "[sql-sync] State file is invalid, starting from 0"
    }
}

# Create connection
$Conn = New-Object System.Data.SqlClient.SqlConnection
$Conn.ConnectionString = "Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True"

try {
    $Conn.Open()
} catch {
    Write-Error "[sql-sync] Connection failed: $_"
    exit 1
}

# If no state file exists and not forcing all, start from the current max id
if ($LastId -eq 0 -and !$ForceAll) {
    $Cmd = $Conn.CreateCommand()
    $Cmd.CommandText = "SELECT ISNULL(MAX(id), 0) FROM Transcantime"
    $LastId = [int]$Cmd.ExecuteScalar()
    Write-Host "[sql-sync] First run: setting last processed id to current max ID ($LastId) to prevent duplicates."
    $State = @{ last_id = $LastId; updated_at = (Get-Date).ToString("o") }
    $State | ConvertTo-Json | Out-File $StateFile -Encoding utf8
}

$Conn.Close()

# Main processing loop
do {
    try {
        $Conn.Open()
        $Cmd = $Conn.CreateCommand()
        $Cmd.CommandText = "SELECT id, enrollnumber, datetimescan FROM Transcantime WHERE id > $LastId ORDER BY id ASC"
        $Reader = $Cmd.ExecuteReader()
        
        $Scans = @()
        $MaxIdInBatch = $LastId
        
        while ($Reader.Read()) {
            $Id = [int]$Reader.GetValue(0)
            $EnrollNumber = $Reader.GetValue(1)
            $DateTimeScan = $Reader.GetString(2)
            
            $EmployeeCode = Map-EnrollNumber $EnrollNumber
            $ScanTime = Parse-ScanTime $DateTimeScan
            
            if ($Id -gt $MaxIdInBatch) {
                $MaxIdInBatch = $Id
            }
            
            $ScanObj = @{
                device_id = "HIPCI100S"
                employee_code = $EmployeeCode
                scan_time = $ScanTime
                raw_data = @{
                    source = "sql-sync-agent"
                    sql_id = $Id
                    enrollnumber = [long]$EnrollNumber
                    raw_scan_time = $DateTimeScan
                }
            }
            
            $Scans += $ScanObj
        }
        $Reader.Close()
        $Conn.Close()
        
        if ($Scans.Count -gt 0) {
            Write-Host "[sql-sync] Found $($Scans.Count) new scans. Max ID in batch: $MaxIdInBatch"
            
            # Send webhook in chunks of 200 to stay under the 500 limit
            $ChunkSize = 200
            $AllSuccess = $true
            
            for ($i = 0; $i -lt $Scans.Count; $i += $ChunkSize) {
                # Slice chunk of scans
                $EndIdx = [Math]::Min($i + $ChunkSize - 1, $Scans.Count - 1)
                $Chunk = $Scans[$i..$EndIdx]
                
                # Send webhook
                if ($Secret) {
                    $Headers = @{
                        "Content-Type" = "application/json"
                        "X-Webhook-Secret" = $Secret
                    }
                } else {
                    $Headers = @{
                        "Content-Type" = "application/json"
                    }
                }
                
                $JsonPayload = $Chunk | ConvertTo-Json -Depth 5
                
                try {
                    Write-Host "[sql-sync] POSTing chunk ($($Chunk.Count) scans, range $($i) to $($EndIdx)) to $WebhookUrl ..."
                    $Response = Invoke-RestMethod -Uri $WebhookUrl -Method Post -Headers $Headers -Body $JsonPayload -TimeoutSec 15
                    Write-Host "[sql-sync] Webhook response: $($Response | ConvertTo-Json -Compress)"
                } catch {
                    Write-Error "[sql-sync] Failed to post chunk: $_"
                    if ($_.Exception -and $_.Exception.Response) {
                        $ReaderStream = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                        $ErrText = $ReaderStream.ReadToEnd()
                        Write-Host "[sql-sync] Server error detail: $ErrText"
                    }
                    $AllSuccess = $false
                    break
                }
            }
            
            # Update state only if all chunks succeeded
            if ($AllSuccess) {
                $LastId = $MaxIdInBatch
                $State = @{ last_id = $LastId; updated_at = (Get-Date).ToString("o") }
                $State | ConvertTo-Json | Out-File $StateFile -Encoding utf8
                Write-Host "[sql-sync] State saved. Last processed ID: $LastId"
            } else {
                Write-Warning "[sql-sync] Some chunks failed to upload. State not updated. Will retry next run."
            }
        } else {
            # No scans found
            # Write-Host "[sql-sync] No new scans."
        }
        
    } catch {
        Write-Error "[sql-sync] Error in loop: $_"
        if ($Conn.State -eq [System.Data.ConnectionState]::Open) {
            $Conn.Close()
        }
    }
    
    if (!$Once) {
        Start-Sleep -Seconds $IntervalSeconds
    }
} while (!$Once)

Write-Host "[sql-sync] Agent finished."

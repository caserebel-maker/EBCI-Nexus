$ErrorActionPreference = "Continue"

Set-Location "C:\Program Files (x86)\HIP TIME"

$asm = [System.Reflection.Assembly]::LoadFile("C:\Program Files (x86)\HIP TIME\HIPSchool_Zee.exe")
$types = try { $asm.GetTypes() } catch [System.Reflection.ReflectionTypeLoadException] { $_.Exception.Types | Where-Object { $_ -ne $null } }
$fk = $types | Where-Object { $_.Name -eq "FKAttendDLL" } | Select-Object -First 1

$mConnect = $fk.GetMethod("FK_ConnectNet")
$mLoad = $fk.GetMethod("FK_LoadGeneralLogData")
$mGet = $fk.GetMethod("FK_GetGeneralLogData")
$mDisc = $fk.GetMethod("FK_DisConnect")

Write-Host "[1/4] Connecting to HIP Machine at 192.168.1.40:5005..."
$handle = $mConnect.Invoke($null, @([int]1, [string]"192.168.1.40", [int]5005, [int]5000, [int]0, [int]0, [int]1261))
if ($handle -le 0) {
    Write-Error "Failed to connect to device (code: $handle)"
    exit 1
}

Write-Host "[2/4] Downloading logs from device..."
$loadRes = $mLoad.Invoke($null, @([int]$handle, [int]0))

$todayStr = (Get-Date).ToString("yyyy-MM-dd")
$scansToInsert = @()

$enroll = [uint32]0
$verify = [int]0
$inout = [int]0
$dt = [DateTime]::MinValue
$args = [object[]]@([int]$handle, $enroll, $verify, $inout, $dt)

while ($true) {
    $getRes = $mGet.Invoke($null, $args)
    if ($getRes -le 0) { break }
    
    $curEnroll = $args[1]
    $curVerify = $args[2]
    $curInOut = $args[3]
    $curDt = $args[4]
    
    $scanStr = $curDt.ToString("yyyy-MM-dd HH:mm:ss")
    if ($scanStr.StartsWith($todayStr)) {
        $scansToInsert += [PSCustomObject]@{
            Enroll = [int]$curEnroll
            DateTime = $scanStr
            Verify = [int]$curVerify
        }
    }
}

$mDisc.Invoke($null, @([int]$handle))
Write-Host "Found $($scansToInsert.Count) scans for today ($todayStr) on device."

if ($scansToInsert.Count -eq 0) {
    Write-Host "No scans for today."
    exit 0
}

Write-Host "[3/4] Writing new scans into local SQL Server (dbo.Transcantime)..."
$conn = New-Object System.Data.SqlClient.SqlConnection("Server=.\SQLEXPRESS;Database=Synctime;Integrated Security=True")
$conn.Open()

$insertedCount = 0
foreach ($scan in $scansToInsert) {
    # Check if exists
    $checkCmd = $conn.CreateCommand()
    $checkCmd.CommandText = "SELECT COUNT(*) FROM dbo.Transcantime WHERE enrollnumber = @enroll AND datetimescan LIKE @dtLike"
    $checkCmd.Parameters.AddWithValue("@enroll", $scan.Enroll) | Out-Null
    $checkCmd.Parameters.AddWithValue("@dtLike", $scan.DateTime + "%") | Out-Null
    $exists = [int]$checkCmd.ExecuteScalar()

    if ($exists -eq 0) {
        $insCmd = $conn.CreateCommand()
        $insCmd.CommandText = @"
INSERT INTO dbo.Transcantime (enrollnumber, machineno, verifymode, verifymodestr, datetimescan, adddate, timetype)
VALUES (@enroll, 1, @verify, 'CARD', @dt, GETDATE(), 'IN')
"@
        $insCmd.Parameters.AddWithValue("@enroll", $scan.Enroll) | Out-Null
        $insCmd.Parameters.AddWithValue("@verify", $scan.Verify) | Out-Null
        $insCmd.Parameters.AddWithValue("@dt", $scan.DateTime) | Out-Null
        $insCmd.ExecuteNonQuery() | Out-Null
        $insertedCount++
    }
}
$conn.Close()

Write-Host "Successfully inserted $insertedCount new scans into SQL Server."

Write-Host "[4/4] Syncing to Nexus Cloud..."
Set-Location "C:\EBCI-Nexus"
$syncOutput = node scripts/hip-card-agent.mjs sql-sync --once
Write-Host $syncOutput

Write-Host "DONE! All morning check-ins have been pushed to Nexus!"

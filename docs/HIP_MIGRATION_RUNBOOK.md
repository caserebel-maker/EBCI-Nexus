# HIP TIME -> EBCI Nexus Migration Runbook

เอกสารนี้ใช้สำหรับย้ายงาน HIP/Nexus ไปทำต่อบนคอมเครื่องใหม่ โดยไม่ต้องไล่เดาจากศูนย์อีกครั้ง

## สถานะปัจจุบัน

- โปรแกรม HIP TIME ใช้ฐานข้อมูล SQL Server: `.\SQLEXPRESS`
- ชื่อฐานข้อมูล HIP: `Synctime`
- ตารางเวลาสแกนหลัก: `dbo.Transcantime`
- เครื่องแตะบัตร: HIP `Ci100S`
- IP เครื่องแตะบัตร: `192.168.1.40`
- Port เครื่องแตะบัตร: `5005`
- ServerPort บนเครื่องแตะบัตร: `7005`
- โปรแกรม Nexus รับข้อมูลที่: `https://ebci-nexus.vercel.app/api/webhooks/card-scan`
- sync ล่าสุดถึง `Transcantime.id = 3191`
- ตัว sync ใช้วิธีอ่านจาก SQL Server แล้วส่งเข้า Nexus ทุก 60 วินาที

## ไฟล์สำคัญใน repo

- `scripts/hip-card-agent.mjs`
  - ตัวหลักที่อ่านข้อมูลจาก HIP SQL แล้วส่งเข้า Nexus
- `scripts/run-hip-sql-sync.ps1`
  - รัน sync หนึ่งครั้ง
- `scripts/run-hip-sql-sync-loop.ps1`
  - รัน sync วนทุก 60 วินาที
- `scripts/run-hip-sql-sync.cmd`
  - ตัวช่วยสำหรับ Windows
- `.env.local`
  - มี webhook URL และ `CARD_SCAN_WEBHOOK_SECRET`
- `.hip-card-agent-state.json`
  - จำว่า sync ถึง row ไหนแล้ว

## สิ่งที่ต้องติดตั้งบนคอมใหม่

1. SQL Server Express
2. HIP TIME 4.0
3. Node.js LTS
4. Git หรือดาวน์โหลด repo `EBCI-Nexus`
5. SQL Server command line tool `sqlcmd`

ถ้าไม่แน่ใจว่า `sqlcmd` ใช้ได้หรือยัง ให้เปิด PowerShell แล้วรัน:

```powershell
sqlcmd -?
```

## ย้ายฐานข้อมูล HIP

ทางที่แนะนำคือ backup ฐาน `Synctime` จากเครื่องเก่า แล้ว restore ที่เครื่องใหม่

บนเครื่องเก่า:

```sql
BACKUP DATABASE Synctime
TO DISK = 'C:\Users\Public\Synctime.bak'
WITH INIT;
```

ย้ายไฟล์ `C:\Users\Public\Synctime.bak` ไปเครื่องใหม่

บนเครื่องใหม่:

```sql
RESTORE DATABASE Synctime
FROM DISK = 'C:\Users\Public\Synctime.bak'
WITH REPLACE;
```

ถ้า restore ไม่ได้เพราะ path ไฟล์ database ต่างกัน ให้ใช้ SQL Server Management Studio จะง่ายกว่า

## ตั้ง SQL Server ให้ HIP/Nexus อ่านได้

ค่าเดิมที่ใช้:

- Server: `.\SQLEXPRESS`
- Database: `Synctime`
- Auth: Windows Authentication ใช้ได้กับ sync
- HIP TIME เคยใช้ `sa` ได้เช่นกัน

ทดสอบจาก PowerShell:

```powershell
sqlcmd -S .\SQLEXPRESS -E -d Synctime -Q "SELECT COUNT(*) AS total FROM dbo.Transcantime"
```

ถ้าขึ้นจำนวนแถว แปลว่า SQL พร้อม

## ย้าย repo และ env

บนเครื่องใหม่ ให้ copy ทั้งโฟลเดอร์ repo นี้ไป หรือ clone จาก GitHub แล้ว copy ไฟล์ local เหล่านี้จากเครื่องเก่า:

- `.env.local`
- `.hip-card-agent-state.json`
- ถ้ามี `hip-code-map*.json` ให้ copy ไปด้วย

จากนั้นเปิด PowerShell ที่โฟลเดอร์ repo แล้วรัน:

```powershell
npm.cmd install
node --check scripts\hip-card-agent.mjs
npx.cmd eslint scripts\hip-card-agent.mjs
```

## ทดสอบ sync หนึ่งครั้ง

```powershell
npm.cmd run hip:sql-sync -- --once --limit 5
```

ผลที่ถูกต้องอย่างน้อยควรเห็นประมาณนี้:

```text
[hip-sql-sync] fetched=0 scans=0 last_id=3191
```

หรือถ้ามีข้อมูลใหม่:

```text
[hip-sql-sync] fetched=5 scans=5 last_id=3191
[hip-sql-sync] webhook summary: { inserted: ..., duplicate: ..., bad_employee_code: ..., error: 0 }
```

## ตั้ง auto sync บนเครื่องใหม่

สร้าง shortcut ใน Startup ให้เปิด loop ทุกครั้งที่ login:

```powershell
$repo = "C:\path\to\EBCI-Nexus-main"
$loop = Join-Path $repo "scripts\run-hip-sql-sync-loop.ps1"
$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "EBCI Nexus HIP Auto Sync.lnk"
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$loop`""
$shortcut.WorkingDirectory = $repo
$shortcut.IconLocation = "C:\Windows\System32\shell32.dll,167"
$shortcut.Description = "Keep EBCI Nexus HIP SQL sync running every minute"
$shortcut.Save()
```

เปิด sync ตอนนี้ทันที:

```powershell
Start-Process -FilePath "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" `
  -ArgumentList @("-NoProfile","-WindowStyle","Hidden","-ExecutionPolicy","Bypass","-File",$loop) `
  -WorkingDirectory $repo `
  -WindowStyle Hidden
```

เช็กว่า loop ทำงาน:

```powershell
Get-CimInstance Win32_Process -Filter "name='powershell.exe'" |
  Where-Object { $_.CommandLine -like "*run-hip-sql-sync-loop.ps1*" } |
  Select-Object ProcessId,CommandLine
```

ดู log:

```powershell
Get-Content "$repo\hip-sql-sync.log" -Tail 30
Get-Content "$repo\hip-sql-sync-loop.log" -Tail 30
```

## ตั้ง LAN สำหรับเครื่องแตะบัตร

ถ้าเครื่องใหม่ต่อสาย LAN ตรงกับ HIP ให้ตั้ง IP ของคอมให้อยู่ subnet เดียวกับ HIP:

- HIP: `192.168.1.40`
- คอมใหม่แนะนำใช้: `192.168.1.50`
- Subnet mask: `255.255.255.0`
- Gateway: เว้นว่างได้ ถ้าเป็นสายตรงเฉพาะ HIP

ตัวอย่าง PowerShell แบบ Administrator:

```powershell
netsh interface ip set address name="Ethernet" static 192.168.1.50 255.255.255.0
```

ทดสอบ:

```powershell
ping 192.168.1.40
Test-NetConnection 192.168.1.40 -Port 5005
```

หมายเหตุ: ตอนทำเครื่องเก่า ping/port เคยไม่ผ่าน แต่ HIP TIME ยังมีข้อมูลใน SQL ได้ ดังนั้นหลักสำคัญคือให้ HIP TIME ดึงข้อมูลลง `Synctime.dbo.Transcantime` ได้

## ตั้งค่าใน HIP TIME

เปิด HIP TIME แล้วตั้งฐานข้อมูล:

- Server: `.\SQLEXPRESS`
- Database: `Synctime`
- ใช้ Windows Authentication หรือ SQL Server Authentication ตามที่เครื่องนั้นตั้งไว้

ตั้งเครื่องสแกน:

- Machine No: `1`
- Name: `HIPCI100S`
- Series: `Series S`
- Model: `Ci100S`
- IP Address: `192.168.1.40`
- Port: `5005`
- Password/network key: `0`
- ดึงข้อมูล: `Automatic`

## Flow หลังย้ายเสร็จ

```text
HIP Ci100S -> HIP TIME/SQL Synctime -> run-hip-sql-sync-loop.ps1 -> Nexus Vercel
```

คอมเครื่องใหม่ต้องเปิดไว้และต่อเน็ตไว้ ถ้าปิดคอม ข้อมูลจะไม่ถูกส่งเข้า Nexus ระหว่างนั้น แต่พอเปิดกลับมา sync จะส่งรายการใหม่ต่อจาก `.hip-card-agent-state.json`

## ปัญหาที่พบได้

### `bad_employee_code`

แปลว่า HIP มีรหัสพนักงานนั้น แต่ Nexus ยังไม่มี employee code ตรงกัน ต้องเพิ่มพนักงาน/แก้รหัสใน Nexus

ตัวอย่างที่เคยเจอ:

- `464-66`
- `488-67`
- `777-77`
- `124-68`

### Webhook 401

แปลว่า `CARD_SCAN_WEBHOOK_SECRET` ใน `.env.local` ไม่ตรงกับ Vercel Environment Variable

ให้ copy ค่าเดิมจากเครื่องเก่า หรือแก้ Vercel แล้ว redeploy ใหม่

### Webhook 500

เคยเกิดเมื่อส่ง batch ใหญ่เกินไป ให้ใช้ `--limit 50` ตามสคริปต์ปัจจุบัน

### เปิด HIP TIME แล้วหา icon/file ไม่เจอ

HIP TIME ต้องเปิดจาก working directory ที่ถูกต้อง แนะนำ copy โฟลเดอร์ HIP TIME ไปไว้ที่:

```text
C:\Users\<USER>\Documents\HIP TIME User
```

แล้วสร้าง shortcut โดยตั้ง:

- Target: path ไปที่ `HIPSchool_Zee.exe`
- Start in: โฟลเดอร์เดียวกับ `HIPSchool_Zee.exe`

## เช็กสุดท้ายหลังย้าย

1. เปิด HIP TIME แล้วเห็นฐาน `Synctime`
2. รัน SQL count แล้วเห็นจำนวนแถว
3. รัน `npm.cmd run hip:sql-sync -- --once --limit 5` แล้วไม่ error
4. เปิด loop แล้ว log เพิ่มทุก 60 วินาที
5. ทดลองแตะบัตร แล้วรอ 1 นาที จากนั้นดูใน Nexus

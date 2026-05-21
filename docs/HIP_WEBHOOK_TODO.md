# HIP Ci100S Webhook Setup — TODO

> **Status:** ปอนด์เริ่มที่ออฟฟิศ 7 พ.ค. 2569 — **stuck รอเครื่อง/server ที่อยู่ VLAN 192.168.1.x**
> **Pickup:** เลือกเครื่องที่จะรัน relay agent ในวง `192.168.1.x`, ตั้ง `CARD_SCAN_WEBHOOK_SECRET` บน Vercel, แล้วค่อย capture packet จริงจาก HIP.

---

## สถานะปัจจุบัน — เก็บไว้สำหรับ session ถัดไป

### ✅ ที่ confirm แล้วจาก HIP admin screen (รูปจอ 7 พ.ค.)

```
หมายเลข:        1
ETH:            192.168.1.40
Port No:        5005
รหัสเครือข่าย:  0
ServerIP:       192.168.1.40         ← ยังไม่ได้ตั้ง upstream (ชี้ตัวเอง = ไม่ได้ส่งไปไหน)
ServerPort:     7005
กำลังส่ง:       ใช้งาน (active)
```

### ⚠️ ข้อจำกัดสำคัญ — **HIP Ci100S ไม่ส่ง HTTP webhook**

ส่งผ่าน **TCP raw protocol ของ HIP/ZK** ไป `ServerIP:ServerPort` เท่านั้น
→ **ใช้ Path A (HIP push ตรง → Vercel) ไม่ได้** — ต้อง Path B: relay agent

**Architecture:**
```
HIP Ci100S ──TCP/7005──▶  Relay Agent (Office)  ──HTTPS──▶  Vercel webhook
192.168.1.40              192.168.1.x                       ebci-nexus.vercel.app
                          (Listen TCP 7005)                 /api/webhooks/card-scan
                          (Decode → POST JSON)              X-Webhook-Secret header
```

### 🌐 Network reality (จาก laptop วง 192.168.10.x)

ทดสอบจาก laptop คุณ:
- ✅ `ping 192.168.1.1` (gateway) ผ่าน
- ✅ `ping 192.168.1.100` (เครื่องบางเครื่อง) ผ่าน
- ❌ `ping 192.168.1.40` (HIP) **ไม่ผ่าน** (ICMP block)
- ❌ TCP scan to 192.168.1.x ทุก port ปิดหมด (firewall block cross-subnet TCP)

**สรุป:** route ระหว่าง subnet เปิด แต่ TCP filtered → **agent ต้องอยู่บน vlan 1.x** เพื่อพูดกับ HIP

### ✅ ที่ฝั่ง Vercel/Nexus พร้อมรับแล้ว

- Endpoint: `POST https://ebci-nexus.vercel.app/api/webhooks/card-scan`
- Auth: dual support
  - Header `X-Webhook-Secret: <secret>` (constant-time compare)
  - Header `X-Webhook-Signature: sha256=<hmac>` (HMAC-SHA256 over body)
- Body: single object หรือ array (max 500)
  ```json
  {
    "device_id": "HIPCI100S",
    "employee_code": "060-01",
    "scan_time": "2026-05-07T08:35:00",
    "scan_type": "in"
  }
  ```
- Idempotent on `(employee_id, scan_time)`
- GET probe: `curl https://ebci-nexus.vercel.app/api/webhooks/card-scan` → confirms `CARD_SCAN_WEBHOOK_SECRET` configured?
- ⚠️ **ตอนนี้ secret ยังไม่ได้ตั้งบน Vercel** (`auth: NOT CONFIGURED`)

### ✅ Re-check จาก Office Mac — 15 พ.ค. 2569

- Office Mac IP: `192.168.20.240` (interface `en1`)
- Route to HIP `192.168.1.40` goes via gateway `192.168.20.1`
- TCP checks from Office Mac:
  - `192.168.1.40:5005` → timeout
  - `192.168.1.40:7005` → timeout
  - `192.168.1.40:80` → timeout
- Production endpoint probe:
  - `GET https://ebci-nexus.vercel.app/api/webhooks/card-scan` works
  - response still says `auth: NOT CONFIGURED`

**Conclusion:** current Office Mac is also not a valid relay host yet. Relay must run on a machine with IP `192.168.1.x` that HIP can push TCP/7005 to, or networking must be changed so this Mac can receive from HIP.

### ✅ Re-check จาก Office Mac — 21 พ.ค. 2569

- เสียบ LAN แล้ว Office Mac ได้ IP `192.168.1.50` บน `en0`
- `ping 192.168.1.40` ผ่าน 100%
- TCP `192.168.1.40:5005` เปิด (`nc -vz` succeeded)
- TCP `192.168.1.40:7005`, `:4370`, `:80` ยังปิด/refused
- เพิ่ม agent script แล้ว:
  ```bash
  npm run hip:probe
  npm run hip:sync -- --dry-run --since-minutes 1440
  npm run hip:watch -- --dry-run
  ```
- ตั้ง Vercel env `CARD_SCAN_WEBHOOK_SECRET` แล้ว และ production function พร้อมรับ secret แล้ว

**Current blocker:** `npm run hip:probe` ต่อ TCP ได้ แต่ ZK/HIP protocol command timeout:

```text
[hip-agent] TCP ok
[hip-agent] ZK/HIP protocol failed: TIMEOUT_ON_WRITING_MESSAGE
```

Next action: ปิดหรือ disconnect โปรแกรม HIP desktop ที่เชื่อมเครื่อง `HIPCI100S` อยู่ แล้วรัน `npm run hip:probe` ซ้ำ. ถ้ายัง timeout ให้ฝ่าย IT/HIP confirm ว่า port สำหรับ SDK/download log คือ `5005` จริง หรือมี communication password/network key ที่ต้องใส่เพิ่ม.

---

## ❓ Q1-Q4 ที่ต้องตอบ — pickup ตรงนี้

**ปอนด์รายงาน:** "น่าจะมีคอมอีกเครื่องที่เปิดไว้ตลอด เป็น server"

ต้องการ 4 คำตอบเพื่อเลือกวิธีติดตั้ง:

### Q1 — OS อะไร?
- [ ] Windows Server / 10 / 11
- [ ] Linux (ระบุ distro: Ubuntu / Debian / CentOS / etc.)
- [ ] Mac

### Q2 — IP ของ server + อยู่ subnet 192.168.1.x หรือเปล่า?

วิธีดู:
```bash
# Windows
ipconfig
# Linux/Mac
ip addr   # หรือ ifconfig
```
→ ดูบรรทัด IPv4 ที่ขึ้นต้น `192.168.1.xxx`

ถ้าไม่ใช่ 1.x — ต้องเสียบ LAN ใหม่ หรือเปลี่ยน plan

### Q3 — เข้าถึงเครื่องยังไง?
- [ ] SSH (Linux/Mac/Windows-WSL)
- [ ] Remote Desktop / VNC (Windows)
- [ ] เดินไปนั่งที่ keyboard/monitor
- ปอนด์มี admin password มั้ย?

### Q4 — ตอนนี้รัน service อะไรอยู่บ้าง? (กัน port conflict)
- เปิด port 7005 (TCP) ใช้สำหรับรับ HIP push — ห้ามมี service อื่นกินก่อน
- เช็ค: `netstat -an | grep 7005` (Linux/Mac) หรือ `netstat -an | findstr 7005` (Windows)

---

## สิ่งที่จะทำต่อ — แล้วแต่คำตอบ

| ถ้าตอบ Q1 + Q2 | Action |
|---|---|
| **Linux + 1.x** | ใช้ `scripts/hip-card-agent.mjs` + systemd service unit |
| **Windows + 1.x** | ใช้ `scripts/hip-card-agent.mjs` + Task Scheduler / NSSM service wrapper |
| **Mac + 1.x** | ใช้ `scripts/hip-card-agent.mjs` + launchd plist |
| **ไม่ใช่ 1.x** | ต้อง: (a) เสียบ LAN ใหม่ให้ลงวง 1.x, หรือ (b) ซื้อ Raspberry Pi 4 (~1,500฿) วางใกล้ HIP |

### Agent skeleton (รออัพเกรดให้ตรงกับ OS/distro)

```python
# hip-relay.py — listen TCP 7005, forward to Vercel webhook
import socket, struct, json, requests, os, datetime

HIP_PORT       = 7005
NEXUS_WEBHOOK  = 'https://ebci-nexus.vercel.app/api/webhooks/card-scan'
SECRET         = os.environ['CARD_SCAN_WEBHOOK_SECRET']

def parse_hip_packet(raw: bytes) -> dict | None:
    # HIP/ZK protocol decode — exact byte layout depends on Ci100S firmware
    # Need to capture real packets first to confirm format
    # Common ZK packet: header(8) + cmd(2) + checksum(2) + session(4) + reply(4) + payload
    # Payload for attendance event: pin_no(8 BCD) + timestamp(6) + verify_mode(1) + state(1)
    pass  # decode → {'employee_code', 'scan_time', 'scan_type'}

def post_to_nexus(scan: dict):
    requests.post(NEXUS_WEBHOOK,
        headers={'X-Webhook-Secret': SECRET, 'Content-Type': 'application/json'},
        json=scan, timeout=5)

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('0.0.0.0', HIP_PORT))
    sock.listen(5)
    print(f'[hip-relay] listening on TCP {HIP_PORT}')
    while True:
        conn, addr = sock.accept()
        # ack to HIP, parse, forward, close
        ...

if __name__ == '__main__':
    main()
```

> **Note:** packet format ของ HIP Ci100S TCP push อาจต้อง reverse-engineer
> รอบแรก — capture raw bytes ที่ port 7005 ก่อน (`tcpdump -i any -X port 7005`)
> แล้ว map field. มี library `pyzk` ที่รู้ format ของ ZKTeco/HIP — น่าจะใช้ตรงๆ ได้

---

## ขั้นตอนสุดท้าย — เปิด HIP push ให้ส่งจริง

เมื่อ agent รันได้ + Vercel secret ตั้งแล้ว:

1. ที่จอ HIP กด MENU → ตั้งค่า → เครือข่าย
2. แก้ `ServerIP` จาก `192.168.1.40` (ตัวเอง) → IP ของ server agent
3. `ServerPort` คง `7005`
4. `กำลังส่ง` คง `ใช้งาน`
5. ทาบบัตรจริง 1 ครั้ง
6. ดู agent log → ควรเห็น packet เข้า + POST ไป Vercel สำเร็จ
7. เปิด `/portal/checkin` ของพนักงานคนนั้น → ควรเห็น banner "บัตรของคุณ scan แล้ว HH:MM น." ภายในไม่กี่วิ

---

## Fallback ถ้าไม่ทำ HIP webhook

ระบบ **ไม่ critical ที่ต้องเปิด webhook ทันที**:
- ตอนนี้ใช้ CSV import ผ่าน `/hradmin/attendance/import` ก็ได้
- HR upload ทุกเย็น → smart suppression banner ทำงานทันทีตอน Login วันถัดไป
- ถ้าหา server เหมาะไม่ได้สัปดาห์นี้ → เลื่อนไปสัปดาห์หน้า ไม่กระทบ beta

---

*Last updated: 7 พ.ค. 2569 office afternoon · ปอนด์กลับบ้านไปทำต่อ laptop คืนนี้ — pickup Q1-Q4 พรุ่งนี้*

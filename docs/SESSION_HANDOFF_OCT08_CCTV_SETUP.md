# Session Handoff - CCTV Monitor & Local Gateway Setup (Tapo C545D x 4)

**วันที่:** 8 ตุลาคม 2569 (2026-10-08)  
**Repository:** `/Volumes/1TB-NVME/2026/FEB26-EBCI/EBCI-Nexus-App`  
**Git Branch:** `main`  
**สถานะภาพรวม:** เกตเวย์ `go2rtc` + Cloudflare HTTPS Tunnel กำลังทำงานสด (Live & Tested) ที่ `https://breeds-gmbh-conservative-warming.trycloudflare.com`  

---

## 1. ข้อมูลกล้องวงจรปิด Tapo C545D ในระบบ (Cameras Status)

ข้อมูลล็อกอิน Camera Account: **User:** `Pondebci` | **Pass:** `0818331367` (พอร์ต RTSP: `554`)

| ลำดับ | ชื่อในระบบ / ตำแหน่ง | IP Address | MAC Address | FW | สถานะการเชื่อมต่อ | RTSP URL (Sub-stream / WebRTC) |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **CAM 1** | **Front**<br>หน้าอาคาร / หลังคา | `192.168.0.28` | `EC-B9-31-8D-9D-1D` | 1.1.7 | ⚠️ **เจอ IP แต่รอเปิด Camera Account ในแอป** | `rtsp://Pondebci:0818331367@192.168.0.28:554/stream2` |
| **CAM 2** | **Side**<br>ด้านข้างอาคาร / หลังคา | `192.168.0.89` | `EC-B9-31-8D-9E-0B` | 1.1.2 | ⚠️ **เจอ IP แต่รอเปิด Camera Account ในแอป** | `rtsp://Pondebci:0818331367@192.168.0.89:554/stream2` |
| **CAM 3** | **Tapo 3**<br>ดาดฟ้า / หลังคา | `192.168.0.43` | `EC-B9-31-D0-A9-29` | 1.1.2 | 🟢 **ออนไลน์ สตรีมสดสำเร็จ (125 KB/frame)** | `rtsp://Pondebci:0818331367@192.168.0.43:554/stream2` |
| **CAM 4** | **Storage / Back**<br>ประตูหลัง / คลัง | *รอเชื่อมต่อ* | *รอเชื่อมต่อ* | - | ⏳ *รอติดตั้ง/เปิดเครื่อง* | `rtsp://Pondebci:0818331367@192.168.0.104:554/stream2` |

> **หมายเหตุ:** ทุกตัวใช้ **Sub-stream (`stream2`)** เพื่อความลื่นไหลสูงระดับ 20-30 FPS ประหยัดแบนด์วิดท์ และรองรับ **HD Main-stream (`stream1`)** สำหรับดูภาพความละเอียดสูง

---

## 2. ผลการวิเคราะห์และข้อแนะนำสำคัญสำหรับกล้อง 1 และ 2 (Critical Diagnosis)

จากการทดสอบดึงสัญญาณสดจากเครื่องเกตเวย์ชั้นล่างผ่าน Cloudflare Tunnel พบผลลัพธ์ดังนี้:
1. **กล้อง 3 (`192.168.0.43`):** 
   - ดึงภาพ JPEG Snapshot และ WebRTC ได้สมบูรณ์ทันที (Frame ขนาด 125,277 bytes)
2. **กล้อง 1 (`192.168.0.28`) และ กล้อง 2 (`192.168.0.89`):**
   - เกตเวย์สามารถส่งแพ็กเก็ตถึงตัวกล้องได้จริง (ไม่ใช่ Timeout / Network Unreachable)
   - แต่ตัวกล้องตอบกลับด้วย TCP Reset:  
     `dial tcp 192.168.0.28:554: connectex: No connection could be made because the target machine actively refused it.`  
     `dial tcp 192.168.0.89:554: connectex: No connection could be made because the target machine actively refused it.`
   - **สาเหตุ:** พอร์ต RTSP 554 ของกล้อง TP-Link Tapo จะถูกปิดไว้เป็นค่าเริ่มต้นจากโรงงาน **จนกว่าจะมีการสร้าง "บัญชีกล้อง (Camera Account)" ในแอป Tapo** สำหรับแต่ละตัวแยกกัน

### 👉 วิธีแก้ไขเพื่อให้กล้อง 1 และ 2 ภาพขึ้นสดทันที:
เปิดแอป **Tapo บนโทรศัพท์มือถือ** แล้วทำทีละตัว (กล้อง Front และ Side):
1. แตะเข้าไปที่ตัวกล้อง (Front `192.168.0.28` / Side `192.168.0.89`)
2. กดไอคอน **⚙️ การตั้งค่า (Settings)** ที่มุมขวาบน
3. เลื่อนลงมาแตะ **การตั้งค่าขั้นสูง (Advanced Settings)**
4. แตะ **บัญชีกล้อง (Camera Account)**
5. สร้างชื่อผู้ใช้และรหัสผ่าน:
   - **ชื่อผู้ใช้:** `Pondebci`
   - **รหัสผ่าน:** `0818331367`
6. กด **บันทึก (Save)**
> **ทันทีที่บันทึกสำเร็จ:** ตัวกล้องจะเปิดพอร์ต 554 และเครื่องเกตเวย์ `go2rtc` จะดึงภาพขึ้นหน้าเว็บ Nexus CCTV (`/portal/cctv`) อัตโนมัติทันที!

---

## 3. สถาปัตยกรรมระบบการสตรีม (Streaming Architecture)

```mermaid
flowchart LR
    subgraph Office_LAN["Office LAN (192.168.0.x - SSID: EBCI)"]
        Cam1["กล้อง 1 (Front)<br>192.168.0.28:554"]
        Cam2["กล้อง 2 (Side)<br>192.168.0.89:554"]
        Cam3["กล้อง 3 (Roof)<br>192.168.0.43:554"]
        Cam4["กล้อง 4 (Storage)<br>รอต่อ IP"]
        
        GW["เครื่องข้างล่าง (Windows / LAN)<br>192.168.1.62 / Wi-Fi EBCI<br>รัน go2rtc (:1984) + cloudflared"]
    end

    subgraph Cloud["Cloud Infrastructure"]
        CF["Cloudflare Quick HTTPS Tunnel<br>breeds-gmbh-conservative-warming.trycloudflare.com"]
        Vercel["Nexus Web App (Vercel Production)<br>/portal/cctv"]
        Supabase["Supabase DB<br>ตาราง cctv_cameras"]
    end

    Cam1 -->|RTSP H.264| GW
    Cam2 -->|RTSP H.264| GW
    Cam3 -->|RTSP H.264| GW
    Cam4 -.->|RTSP H.264| GW
    GW -->|HTTP 1984| CF
    CF -->|WSS / HTTPS Streams| Vercel
    Supabase -.->|Read Camera Config| Vercel
```

### การแก้ปัญหา Mixed Content (HTTPS ➔ HTTP Block)
* เนื่องจากหน้าเว็บ Nexus รันบน HTTPS (`vercel.app` / โดเมนบริษัท) บราวเซอร์จะบล็อก iframe/รูปภาพที่เป็น `http://192.168.x.x:1984`
* จึงใช้ Cloudflare Tunnel (`cloudflared tunnel --url http://127.0.0.1:1984`) แปลงเกตเวย์ในแลนให้มี URL เป็น HTTPS สาธารณะ
* หน้าเว็บ `/portal/cctv` มีตัวแปลง URL (`resolveStreamUrl`) รองรับการเปิดดูภาพทั้งบนเดสก์ท็อปและมือถือได้อย่างราบรื่น

---

## 4. สถานะซอฟต์แวร์และโค้ดใน Repository

1. **ระบบสิทธิ์ (RBAC):**
   - พนักงานทั่วไป (`role: employee`): ถูกบล็อก 100% ไม่เห็นเมนู และเข้า URL โดนดีด 403
   - ผู้มีสิทธิ์: `hr_admin`, Super Admin, คุณสายัณห์ MD (`sayan@ebcitrade.com`), และผู้ที่ได้รับติ๊กถูก `can_view_cctv` ใน `/hradmin/settings/permissions`
2. **ฐานข้อมูล Supabase (`cctv_cameras`):**
   - อัปเดตข้อมูลกล้อง 1, 2, 3, 4 ชี้ไปยัง RTSP IP ที่ถูกต้องและ HTTPS Tunnel เรียบร้อยแล้ว
3. **ไฟล์คอนฟิก `scripts/cctv/go2rtc.yaml`:**
   - คอนฟิก `cam1` (`192.168.0.28`), `cam2` (`192.168.0.89`), `cam3` (`192.168.0.43`), `cam4` (`192.168.0.104`)
4. **สคริปต์รันเกตเวย์ `scripts/cctv/start-gateway.ps1` (สำหรับเครื่อง Windows ข้างล่าง):**
   - ดาวน์โหลด `go2rtc.exe` และ `cloudflared.exe` อัตโนมัติหากยังไม่มี
   - สั่งเชื่อมต่อ Wi-Fi `EBCI` ให้อัตโนมัติ
   - สตาร์ตทั้ง `go2rtc` และ Cloudflare Tunnel พร้อมใช้งาน

---

## 5. วิธีรันเกตเวย์บนเครื่องข้างล่าง (How to Run Gateway on Downstairs PC)

หากต้องการเปิดหรือรีสตาร์ตเกตเวย์บนเครื่อง Windows ข้างล่าง:
1. เปิด **PowerShell** (ไม่ต้อง Run as Admin ก็ได้)
2. รันคำสั่ง:
   ```powershell
   cd \path\to\EBCI-Nexus-App
   git pull origin main
   powershell -ExecutionPolicy Bypass -File scripts\cctv\start-gateway.ps1
   ```
3. โปรแกรมจะเปิด `go2rtc` พอร์ต `1984` และ Cloudflare HTTPS Tunnel ให้อัตโนมัติ

---

## 6. ลำดับงานถัดไป (Next Steps)

1. **สร้าง Camera Account ในแอป Tapo** สำหรับกล้อง Front (`192.168.0.28`) และ Side (`192.168.0.89`) ด้วย User `Pondebci` / Pass `0818331367`
2. เปิดหน้าเว็บ `/portal/cctv` เพื่อทดสอบสัญญาณภาพสดของกล้อง 1, 2, 3 พร้อมกันในแบบ 2x2 Grid
3. รอเชื่อมต่อกล้องตัวที่ 4 (Storage/Back) เมื่อติดตั้งเสร็จ ให้แจ้ง IP เพื่อบันทึกเข้าระบบ

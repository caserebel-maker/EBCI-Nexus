# Session Handoff - CCTV Monitor & Local Gateway Setup (Tapo C545D x 4)

**วันที่:** 8 ตุลาคม 2569 (2026-10-08)  
**Repository:** `/Volumes/1TB-NVME/2026/FEB26-EBCI/EBCI-Nexus-App`  
**Git Branch:** `main` (Latest commit: `a982884` pushed to `origin/main`)  

---

## 1. วัตถุประสงค์และสรุปสิ่งที่ทำเสร็จแล้ว (Completed Work)

### A. ระบบการจัดการสิทธิ์ (Strict RBAC)
* **พนักงานทั่วไป (`employee`):** **ไม่มีสิทธิ์ดู** เมนูกล้องวงจรปิดถูกซ่อนทั้งหมดจากทั้ง Desktop Sidebar (`shell.tsx`) และ Mobile Bottom Nav Drawer (`portal-bottom-nav.tsx`) หากพิมพ์ URL `/portal/cctv` หรือเรียก `/api/cctv/cameras` ตรง ๆ จะถูก Redirect กลับหน้า Dashboard ทันที (HTTP 403)
* **ผู้มีสิทธิ์เข้าถึง:**
  1. **HR Admin** (`role === 'hr_admin'`)
  2. **Super Admin** (`can_manage_system === true`)
  3. **กรรมการผู้จัดการ (MD Sunny / คุณสายัณห์)**: อีเมล `sayan@ebcitrade.com`, รหัสพนักงาน `001-29`, User ID `d3751894-c161-44db-840c-cd02650109f9` ได้รับสิทธิ์ถาวรในฐานข้อมูล พร้อม Server-Side Bypass พิเศษ (แม้ role จะเป็น employee)
  4. **ผู้ใช้ที่ได้รับสิทธิ์รายบุคคล:** เพิ่มฟิลด์ `can_view_cctv` ใน `User` table และมี Checkbox *"ดูภาพกล้องวงจรปิด (CCTV)"* ในหน้าจัดการสิทธิ์ (`/hradmin/settings/permissions`) แอดมินสามารถเปิด/ปิดสิทธิ์ให้พนักงานคนใดก็ได้

### B. หน้าจอแสดงผลและควบคุม (Nexus CCTV Monitor)
* **Path:** `/portal/cctv` (และ `/hradmin/cctv` redirect มาที่นี่)
* **ฟีเจอร์:**
  * หน้าจอ 2x2 Grid แสดงผล 4 กล้องพร้อมกัน
  * โหมด Focus กล้องเดี่ยวแบบขยายใหญ่
  * รองรับทั้ง **WebRTC (go2rtc stream.html iframe)**, **Live Snapshot Auto-Refresh (ทุก 3 วินาที)**, และลิงก์เปิดแอป Tapo App / RTSP
  * On-Screen Display (OSD) แสดงชื่อกล้อง, ตำแหน่ง, สถานะ LIVE และเวลาเรียลไทม์ (UTC+7)
  * ปุ่ม Capture บันทึกภาพนิ่ง และปุ่มคัดลอก RTSP URL
  * หน้าต่าง Modal สำหรับแก้ไข IP, พอร์ต, และชื่อกล้อง (สำหรับ Admin/MD)

### C. ฐานข้อมูลและการจัดเก็บ (Database Schema)
* **ตาราง `cctv_cameras`:**
  * `id`, `name`, `location`, `model`, `stream_url`, `sub_stream_url`, `snapshot_url`, `webrtc_url`, `hls_url`, `is_active`, `sort_order`, `notes`
  * มีข้อมูลตั้งต้น 4 กล้อง (ประตูทางเข้าหลัก, ลานจอดรถ, โถงกลาง, ประตูหลัง/คลัง)
* **ตาราง `User`:**
  * เพิ่มคอลัมน์ `can_view_cctv boolean NOT NULL DEFAULT false`
  * ไฟล์ Migration: `supabase/migrations/20261008_add_cctv_permission.sql`

### D. สตรีมเกตเวย์ท้องถิ่น (Local Media Gateway - `go2rtc`)
* โฟลเดอร์ `scripts/cctv/`:
  * `scripts/cctv/go2rtc.yaml`: ไฟล์คอนฟิกพอร์ต 1984 (API/WebRTC), 8554 (RTSP), 8555 (WebRTC TCP/UDP)
  * `scripts/cctv/start-gateway.sh`: สคริปต์เปิดเกตเวย์อัตโนมัติ (ดาวน์โหลดไบนารีถ้ายังไม่มี)
  * `.gitignore`: ตั้งค่าไม่ให้ Track ไฟล์ binary `go2rtc` และ `.zip` ขนาดใหญ่

---

## 2. ข้อมูลกล้องตัวที่ 1 ที่บันทึกไว้ในระบบแล้ว (Camera 1 Config)

* **ชื่อในแอป:** Tapo 3 (Location: Roof)
* **โมเดล:** TP-Link Tapo C545D (Firmware 1.1.2)
* **MAC Address:** `EC:B9:31:D0:A9:29`
* **IP Address:** `192.168.0.43`
* **Wi-Fi:** `EBCI` (Full Signal)
* **Camera Account:** User: `Pondebci` | Pass: `0818331367`
* **RTSP URLs:**
  * Stream 1 (HD): `rtsp://Pondebci:0818331367@192.168.0.43:554/stream1`
  * Stream 2 (Sub): `rtsp://Pondebci:0818331367@192.168.0.43:554/stream2`

---

## 3. บริบทระบบเครือข่ายและสาเหตุที่เครื่องชั้นบนยังไม่เห็นกล้อง (Network Context)

จากการวิเคราะห์ระบบเครือข่ายในออฟฟิศ:
1. **มี 2 วงเน็ตเวิร์ก (Double NAT):**
   * **กล่อง Modem หลัก (ONU):** จ่ายวง `192.168.1.0/24` (Gateway: `192.168.1.1`)
   * **เราเตอร์ Wi-Fi (TP-Link Archer AX55):** WAN ต่อจากกล่อง Modem, LAN/Wi-Fi ปล่อยวง `192.168.0.0/24` (Gateway: `192.168.0.1`, SSID: `EBCI`)
2. **สถานะปัจจุบัน:**
   * กล้อง Tapo C545D อยู่บน Wi-Fi `EBCI` (วง `192.168.0.43`) คลื่น 2.4 GHz
   * เครื่อง Mac ชั้นบนเชื่อมต่อ Wi-Fi คลื่น 5 GHz ซึ่งติด **AP Isolation (Client Isolation)** ของตัว TP-Link AX55 ทำให้ไม่สามารถส่งแพ็กเก็ตข้ามเครื่องไปยังกล้องได้
   * เมื่อลองเสียบสาย LAN ที่เครื่อง Mac ชั้นบน สาย LAN ดันต่ออยู่กับกล่อง Modem หลัก ทำให้ได้ IP `192.168.1.55` ซึ่งอยู่คนละวงกับกล้อง

---

## 4. ขั้นตอนการทดสอบด้วย "เครื่องข้างล่าง" (Action Plan for Downstairs Machine)

เครื่องคอมพิวเตอร์ชั้นล่างที่ต่อสาย LAN หรือ Wi-Fi อยู่ในวงเดียวกันจริง ๆ กับกล้อง ให้ดำเนินการดังนี้:

### ขั้นที่ 1: ตรวจสอบ IP ของเครื่องข้างล่าง
* ตรวจสอบว่าเครื่องได้รับ IP วง `192.168.0.xxx` หรือไม่ (Gateway ต้องเป็น `192.168.0.1`)
  * บน Windows: เปิด Command Prompt ➔ พิมพ์ `ipconfig`
  * บน Mac/Linux: พิมพ์ `ifconfig` หรือ `ip a`

### ขั้นที่ 2: ทดสอบ Ping และ RTSP ไปหากล้อง
* ทดสอบ Ping:
  ```bash
  ping 192.168.0.43
  ```
* ทดสอบดึงสตรีม RTSP (ถ้ามี `ffmpeg` / `ffprobe` หรือใช้โปรแกรม VLC Player):
  * เปิด VLC Player ➔ Media ➔ Open Network Stream ➔ ใส่:
    `rtsp://Pondebci:0818331367@192.168.0.43:554/stream2`
  * หรือทดสอบผ่านคำสั่ง:
    ```bash
    ffprobe -rtsp_transport tcp "rtsp://Pondebci:0818331367@192.168.0.43:554/stream2"
    ```

### ขั้นที่ 3: รัน Gateway (`go2rtc`) บนเครื่องข้างล่าง
* ดาวน์โหลด `go2rtc` จาก GitHub Release (https://github.com/AlexxIT/go2rtc/releases) ตาม OS ของเครื่องข้างล่าง
* นำไฟล์คอนฟิก `scripts/cctv/go2rtc.yaml` ไปวางไว้ข้างตัวโปรแกรม:
  ```yaml
  api:
    listen: ":1984"
  rtsp:
    listen: ":8554"
  webrtc:
    listen: ":8555"

  streams:
    cam1: rtsp://Pondebci:0818331367@192.168.0.43:554/stream2
    cam2: rtsp://admin:ebci1234@192.168.0.102:554/stream2
    cam3: rtsp://admin:ebci1234@192.168.0.103:554/stream2
    cam4: rtsp://admin:ebci1234@192.168.0.104:554/stream2
  ```
* รันโปรแกรม `go2rtc`
* เปิดเบราว์เซอร์ไปที่ `http://localhost:1984` จะเห็นหน้าแดชบอร์ดสตรีมกล้อง `cam1` ทันที!

### ขั้นที่ 4: เชื่อมโยงเข้า Nexus
* ใน Nexus CCTV (`/portal/cctv`) กดปุ่ม ⚙️ ที่กล้อง 1 แล้วระบุ WebRTC URL เป็น:
  `http://<IPเครื่องข้างล่าง>:1984/api/webrtc?src=cam1`
  หรือสามารถอัปเดตตรงในตาราง `cctv_cameras` ใน Supabase ได้เลยครับ

---

## 5. คำสั่งและ Prompt เริ่มงานต่อทันที (Next Session Prompt)

```text
อ่าน docs/SESSION_HANDOFF_OCT08_CCTV_SETUP.md
ดำเนินการต่อจากที่ค้างไว้:
1. ตรวจสอบ IP และการเชื่อมต่อของเครื่องปัจจุบันว่าอยู่ในวงแลน 192.168.0.xxx เดียวกับกล้อง Tapo หรือไม่
2. ทดสอบ ping 192.168.0.43 และทดสอบ RTSP stream (rtsp://Pondebci:0818331367@192.168.0.43:554/stream2)
3. รัน go2rtc เพื่อรับสัญญาณกล้องและแปลงเป็น WebRTC
4. อัปเดต IP ของเกตเวย์ในฐานข้อมูล cctv_cameras และทดสอบการเปิดดูผ่าน Nexus CCTV (/portal/cctv)
```

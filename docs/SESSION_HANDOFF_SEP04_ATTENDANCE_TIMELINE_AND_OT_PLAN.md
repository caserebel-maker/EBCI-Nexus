# Session Handoff - Attendance Timeline Detail และแผน OT

**วันที่บันทึก:** 4 กันยายน 2569
**Repository:** `/Volumes/C1TB/EB-CI/EBCI-Nexus`
**สถานะ:** Planning handoff only - ยังไม่ได้แก้โค้ดในรอบนี้
**เป้าหมาย:** ส่งต่องานเพิ่มหน้า HR สำหรับดูประวัติการเช็คอิน/เช็คเอาท์แบบละเอียดรายบุคคล และออกแบบ workflow OT สำหรับพนักงานที่ทำงานนอกเวลาปกติ เช่น คนขับรถ

---

## 1. คำตอบจากการตรวจระบบปัจจุบัน

ระบบมีข้อมูลละเอียดอยู่แล้วบางส่วน แต่ UI ยังแยกเป็นหลายหน้าและยังไม่มีหน้าเดียวที่ตอบคำถามนี้ครบ:

> เลือกพนักงาน 1 คน แล้วดูได้ว่าแต่ละวันเขาเช็คอิน/เช็คเอาท์กี่ครั้ง กี่โมง จากมือถือ, HIP card scan, WFH, ภาคสนาม และกรณี GPS มีปัญหา

หน้าที่มีอยู่ตอนนี้:

1. `/hradmin/attendance`
   - ใช้ดูสถานะการเข้างานรายวันของพนักงาน
   - Logic ฝั่ง `getAttendanceForDate()` รวมข้อมูลจาก `checkins` และ `card_scans`
   - แต่ UI ยุบข้อมูลให้เหลือสถานะหลักต่อพนักงานต่อวัน จึงไม่เหมาะสำหรับดูทุก event รายครั้ง

2. `/hradmin/attendance/card-scans`
   - ใช้ดู raw HIP card scan logs
   - มี search ชื่อ/ชื่อเล่น/รหัสพนักงาน, date range, scan type และ export หน้าปัจจุบันเป็น CSV
   - เหมาะสำหรับตรวจข้อมูลแตะบัตรดิบ แต่ยังไม่รวมข้อมูลมือถือ, WFH, GPS review, HR note ใน timeline เดียว

3. `/hradmin/attendance/field`
   - ใช้ดู check-in ประเภท `field` ย้อนหลัง 30 วัน
   - มี anomaly signal เช่น เช็คอินภาคสนามแต่พิกัดอยู่ในออฟฟิศ

4. Attendance CSV export
   - มีข้อมูลละเอียดกว่าหน้า UI เช่น จำนวนแตะบัตร, เวลาแตะบัตรครั้งแรก/ล่าสุด, รายการเวลาแตะบัตรทั้งหมด, จำนวน check-in มือถือ และเวลา check-in/check-out มือถือ
   - แต่เป็นไฟล์ export ไม่ใช่หน้าตรวจสอบสด

---

## 2. Feature ที่ควรเพิ่ม: Attendance Timeline รายบุคคล

### Route ที่แนะนำ

เพิ่มหน้าใหม่:

```text
/hradmin/attendance/timeline
```

หรือเพิ่ม detail drawer จากหน้า:

```text
/hradmin/attendance
```

ข้อเสนอ: เริ่มจากหน้าใหม่ก่อน เพราะ scope ชัดและไม่เสี่ยงทำให้หน้า attendance หลักหนักขึ้น

### สิ่งที่ HR ต้องทำได้

- เลือกพนักงานจาก dropdown/search
- เลือกช่วงวันที่ เช่น วันนี้, เมื่อวาน, เดือนนี้, custom range
- เลือก source: ทั้งหมด, มือถือ, HIP, WFH, field, GPS review, auto/system
- เห็น timeline ตามเวลาเรียงจากเช้าไปเย็น
- เห็นจำนวน event ต่อวัน เช่น แตะบัตร 3 ครั้ง, mobile check-in 1 ครั้ง, checkout 1 ครั้ง
- กด export เฉพาะพนักงานคนนั้นได้

### Columns / Fields ที่ควรแสดง

| Field | ความหมาย |
|---|---|
| วันที่ | Bangkok date |
| เวลา | Bangkok time |
| พนักงาน | ชื่อ, ชื่อเล่น, รหัส |
| Event | check-in, check-out, card in, card out, WFH, field, GPS review, auto check-in |
| Source | mobile, HIP card, HR/system, cron |
| สถานที่ | office, WFH, field, outside Head Office |
| GPS | lat/lng, accuracy, distance, link Google Maps |
| หมายเหตุ | employee note, HR note, outage/grace note |
| Evidence ID | `checkins.id`, `card_scans.id`, `attendance_gps_review_requests.id` |
| สถานะ | normal, late, missing checkout, GPS problem, auto granted |

---

## 3. Data Sources ที่ต้องรวม

### `checkins`

ใช้เป็น source หลักของ mobile/app attendance:

- `employee_id`
- `type`
- `source`
- `checked_in_at`
- `checked_out_at`
- `latitude`
- `longitude`
- `accuracy_meters`
- `distance_from_office`
- `notes`
- `late_minutes`
- `late_reason`
- `auto_closed_at`

Timeline mapping:

- 1 row ที่มี `checked_in_at` = event `mobile_check_in`
- ถ้ามี `checked_out_at` = event `mobile_check_out`
- ถ้ามี `auto_closed_at` = event flag `auto_closed`

### `card_scans`

ใช้เป็น source หลักของ HIP:

- `employee_id`
- `employee_code`
- `scan_time`
- `scan_type`
- `device_id`
- `raw_data`
- `created_at`

Timeline mapping:

- `scan_type = in` หรือเวลาก่อน 16:30 = `hip_card_in`
- `scan_type = out` หรือเวลาตั้งแต่ 16:30 = `hip_card_out`
- ถ้าวันเดียวกันมีหลายครั้ง ต้องแสดงทุกครั้ง ไม่ใช่เฉพาะครั้งแรก/ล่าสุด

### `attendance_gps_review_requests`

ใช้แสดงกรณีพนักงานกดปุ่มแจ้ง GPS มีปัญหา:

- `employee_id`
- `requested_for_date`
- `status`
- `employee_note`
- `gps_error`
- `latitude`
- `longitude`
- `accuracy_meters`
- `created_at`

### `attendance_logs`

ใช้แสดง HR note และเหตุผลที่ HR เพิ่มในวันนั้น:

- `employee_id`
- `date`
- `hr_note`
- `hr_note_updated_at`
- `hr_note_updated_by`

---

## 4. Implementation Plan

### Phase 1 - Read-only Timeline

1. เพิ่ม server action หรือ API สำหรับ query:
   - employeeId
   - startDate
   - endDate
   - source
2. ดึงข้อมูลจาก `checkins`, `card_scans`, `attendance_gps_review_requests`, `attendance_logs`
3. Normalize เป็น event shape เดียว เช่น:

```ts
type AttendanceTimelineEvent = {
  id: string
  employeeId: string
  employeeCode: string | null
  employeeName: string
  eventType:
    | 'mobile_check_in'
    | 'mobile_check_out'
    | 'hip_card_in'
    | 'hip_card_out'
    | 'gps_review_requested'
    | 'hr_note'
    | 'auto_check_in'
    | 'auto_checkout'
  source: 'mobile' | 'hip' | 'hr' | 'system'
  occurredAt: string
  dateKey: string
  label: string
  note: string | null
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  distanceFromOffice: number | null
  evidenceTable: string
  evidenceId: string
}
```

4. แสดง UI เป็น grouped-by-date timeline
5. เพิ่ม export CSV ตาม filter ปัจจุบัน

Acceptance criteria:

- เลือกพนักงานคนเดียวแล้วเห็นทุก event เรียงเวลา
- วันเดียวกันมีแตะบัตรหลายครั้งต้องเห็นครบทุกครั้ง
- ถ้า check-in มือถือมี checkout ต้องแสดงเป็น 2 events
- แสดง note จาก HR และ GPS review แยกชัด
- ไม่มี write operation ใน Phase 1

### Phase 2 - Detail Drawer จากหน้า Attendance หลัก

เพิ่มปุ่มใน `EmployeeRow` ของ `/hradmin/attendance`:

```text
ดูประวัติวันนี้
```

เมื่อกดแล้วเปิด drawer ที่เรียก timeline เฉพาะพนักงาน+วันที่นั้น เพื่อให้ HR ไม่ต้องเปลี่ยนหน้า

### Phase 3 - Export รายบุคคลแบบผู้บริหาร/HR ใช้จริง

เพิ่ม option ใน modal export:

- Export summary เดิม
- Export timeline detail
- เลือกพนักงานคนเดียวหรือหลายคน
- แนบ note ช่วง HIP outage / GPS problem / auto check-in

---

## 5. แผน OT สำหรับพนักงานทำงานนอกเวลาปกติ

### ปัญหาหน้างาน

เคสตัวอย่าง: ตี๋ คนขับรถ

- งานคนขับรถ/ไซต์งานบางคนไม่ได้จบที่เวลาออฟฟิศ
- บางวันเช็คเอาท์แล้ว แต่ถูกเรียกให้ทำงานต่อ
- ระบบปัจจุบันเพิ่งแก้ให้กด “อัปเดตเวลาเช็คเอาท์เป็นปัจจุบัน” ได้ แต่ยังเป็นแค่การแก้เวลาปลายทาง
- ยังไม่มี workflow ขอ OT, อนุมัติ OT, สรุปชั่วโมง OT และหลักฐานประกอบ

### หลักคิดที่แนะนำ

OT ไม่ควรถูกนับจากการกดเช็คเอาท์ดึกอย่างเดียว เพราะอาจเกิดจากลืมกด, โทรศัพท์มีปัญหา, หรืออยู่หน้างานแต่ไม่ได้รับอนุมัติ

ควรแยกเป็น 3 ชั้น:

1. Attendance evidence: หลักฐานว่าอยู่ถึงกี่โมง
2. OT request/approval: หัวหน้าอนุมัติว่าเป็น OT จริง
3. Payroll/comp decision: จะจ่าย OT, ให้วันหยุดชดเชย, หรือบันทึกเป็นปฏิบัติหน้าที่เฉย ๆ

### Function ที่ควรเพิ่ม

#### 1. ปุ่ม “ขอ OT / ทำงานต่อ”

ในหน้า `/portal/checkin` หลังเวลาปกติหรือหลังเช็คเอาท์แล้ว:

```text
ขอ OT / ทำงานต่อ
```

เมื่อกดให้กรอก:

- เหตุผล
- สถานที่ทำงาน
- เวลาเริ่ม OT โดย default = เวลาหลังเลิกงานปกติ หรือเวลาที่เช็คเอาท์เดิม
- เวลาเลิกงานจริง โดย default = เวลาปัจจุบันตอนกดจบงาน
- แนบ note หรือรูปหลักฐานได้ในอนาคต

#### 2. OT mode สำหรับตำแหน่งพิเศษ

เพิ่ม setting ใน employee หรือ shift profile:

```text
ot_eligible = true
ot_requires_preapproval = true/false
default_ot_start_time = 17:00 หรือ 18:00
```

กลุ่มที่ควรเริ่ม pilot:

- คนขับรถ
- พนักงานไซต์งานที่มีเวลาเลิกงานไม่แน่นอน
- เจ้าหน้าที่ที่ต้อง stand-by นอกเวลา

#### 3. OT approval inbox

หัวหน้าหรือผู้อนุมัติควรเห็น:

- พนักงาน
- วันที่
- เวลาเข้างาน/ออกงานจริงจาก attendance timeline
- เวลา OT ที่ขอ
- เหตุผล
- ความต่างระหว่าง checkout จริงกับเวลาปกติ
- ปุ่มอนุมัติ / ปฏิเสธ / ขอข้อมูลเพิ่ม

#### 4. OT summary report

รายงานควรมี:

- จำนวน OT requests
- ชั่วโมง OT ที่อนุมัติ
- ชั่วโมงที่ยังรออนุมัติ
- แยกตามพนักงาน/แผนก/เดือน
- export CSV

---

## 6. Schema ที่ควรพิจารณา

ควรเพิ่มตารางใหม่ แทนการยัดทุกอย่างลง `checkins`:

```sql
create table overtime_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null references employees(id),
  work_date date not null,
  requested_start_at timestamptz not null,
  requested_end_at timestamptz not null,
  actual_checkin_id uuid null,
  reason text not null,
  location_note text null,
  status text not null default 'pending',
  approver_id text null references employees(id),
  approved_at timestamptz null,
  rejected_at timestamptz null,
  rejection_reason text null,
  approval_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

หมายเหตุ:

- ต้องตรวจ type ของ `checkins.id` จริงก่อนทำ migration เพราะใน code ปัจจุบันบางส่วน treat เป็น string/uuid ผสมกัน
- ควรมี audit event สำหรับ approve/reject/update
- ควรห้าม self-approval

---

## 7. Rule ที่แนะนำสำหรับ OT

### กรณีปกติ

- เวลาทำงานปกติ: 08:00-17:00 หรือ config ตาม shift
- OT เริ่มนับหลังเวลาทำงานปกติ + grace เช่น 15 นาที
- ต้องมี checkout หลัง OT end หรือมี HR manual note
- ต้องมีผู้อนุมัติ ไม่ auto approve จากเวลาอย่างเดียว

### กรณีคนขับรถ/งานพิเศษ

- อนุญาตให้ขอ OT หลังจบงานจริงได้
- ถ้าเช็คเอาท์ไปแล้วและกลับมาทำงานต่อ ให้ใช้ปุ่ม “ทำงานต่อ / OT ถึงปัจจุบัน” เป็น evidence
- ระบบควรบันทึกเหตุผลบังคับ เช่น “รับ-ส่งผู้บริหาร”, “รอภารกิจ”, “เดินทางต่างจังหวัด”
- หัวหน้าตรวจจาก timeline ก่อนอนุมัติ

### กรณีลืมกดเช็คอิน/มือถือมีปัญหา

- ไม่ควรนับ OT อัตโนมัติ
- ให้ HR ใส่ note และให้หัวหน้า approve แบบ exception
- export ต้องมีหมายเหตุว่าเป็นข้อมูลช่วงปัญหา HIP/GPS/มือถือ

---

## 8. Security / Governance ที่ต้องระวัง

- ห้ามให้พนักงานแก้เวลาเองย้อนหลังโดยไม่มี approval
- ห้าม self-approval โดยเด็ดขาด
- ทุกการ approve/reject/update ต้องมี audit log
- HR ปรับเวลาได้เฉพาะด้วยเหตุผลและต้องเก็บ actor/time/reason
- OT ที่มีผลต่อเงินเดือนควรมี step-up หรืออย่างน้อย re-confirm password ในอนาคต
- ต้องแยก “เวลาที่อยู่หน้างานจริง” ออกจาก “OT ที่บริษัทอนุมัติให้จ่าย”

---

## 9. Files ที่น่าจะเกี่ยวข้องเมื่อกลับมาทำต่อ

- `src/app/hradmin/attendance/actions.ts`
- `src/app/hradmin/attendance/attendance-view.tsx`
- `src/app/hradmin/attendance/card-scans/actions.ts`
- `src/app/hradmin/attendance/card-scans/card-scans-view.tsx`
- `src/app/hradmin/attendance/field/page.tsx`
- `src/app/hradmin/attendance/reconcile/actions.ts`
- `src/app/api/hradmin/attendance/export/route.ts`
- `src/app/portal/checkin/actions.ts`
- `src/app/portal/checkin/checkin-view.tsx`
- `src/app/api/organization/approvers/route.ts`
- `docs/SESSION_HANDOFF_SEP04_ATTENDANCE_CHECKIN_FIXES.md`
- `docs/NEXUS_GOVERNANCE_FEASIBILITY_REPORT_2026-09-02.md`

---

## 10. Prompt สำหรับเริ่มรอบถัดไป

```text
อ่าน docs/SESSION_HANDOFF_SEP04_ATTENDANCE_TIMELINE_AND_OT_PLAN.md และ
docs/SESSION_HANDOFF_SEP04_ATTENDANCE_CHECKIN_FIXES.md

เริ่ม implement Phase 1 ก่อน: เพิ่มหน้า /hradmin/attendance/timeline แบบ read-only
ให้ HR เลือกพนักงานและช่วงวันที่ แล้วเห็น event timeline รวมจาก checkins,
card_scans, attendance_gps_review_requests และ attendance_logs พร้อม export CSV

จากนั้นค่อยออกแบบ OT request workflow แยกเป็น Phase 2/3 โดยห้ามให้พนักงานแก้เวลาเองย้อนหลัง
และต้องมี audit + no self-approval
```

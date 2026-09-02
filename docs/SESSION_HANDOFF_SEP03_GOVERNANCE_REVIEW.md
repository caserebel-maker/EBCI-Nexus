# Session Handoff - Nexus Governance Review

วันที่ส่งมอบ: 3 กันยายน 2569

Repository: `/Volumes/C1TB/EB-CI/EBCI-Nexus`

Baseline ที่ใช้ตรวจ: `origin/main` commit `723e6cc`

## สถานะ

- จัดทำ feasibility and gap review จาก requirement ฉบับ `EBCI_Nexus_Governance_Future_Development_Master_Requirements.md` แล้ว
- รายงานฉบับเต็มอยู่ที่ `docs/NEXUS_GOVERNANCE_FEASIBILITY_REPORT_2026-09-02.md`
- ตรวจ Production Supabase แบบ read-only เฉพาะ schema, resource presence และจำนวน record ที่จำเป็นต่อการประเมิน
- ไม่มีการแก้ Production data, ไม่มี migration และไม่มี feature implementation ในงานรอบนี้
- ใช้ clean worktree จาก `origin/main` เพราะ checkout หลักมีงานค้างและ merge conflict ซึ่งไม่ได้แตะต้อง

## ข้อสรุปหลัก

Nexus ควรพัฒนาต่อในระบบเดิมแบบ modular monolith แต่ไม่ควรเริ่มจาก payroll engine, investigation, AI หรือ executive command center พร้อมกัน ระบบมีฐาน HR และ approval ที่ใช้ต่อได้ แต่ control ส่วนกลางยังไม่พร้อมพอสำหรับ scope ใหญ่

Blocker สำคัญที่พบ:

1. ไม่มี automated test suite และ CI gate สำหรับพิสูจน์ authorization behavior
2. Authorization กระจายระหว่าง role, permission flags และเงื่อนไขเฉพาะ route
3. API routes จำนวนมากใช้ service role จึงต้องถือ app authorization เป็น control หลัก
4. Employee, user และ legacy identifiers ยังไม่มี canonical identity map เดียว
5. Backup ปัจจุบันยังไม่มี restore drill และหลักฐาน recovery ที่ตรวจสอบได้

## ลำดับงานที่แนะนำ

1. ทำให้ `main` สะอาดและเพิ่ม CI, branch protection, migration baseline
2. สร้าง authorization kernel กลาง พร้อม route inventory และ IDOR tests
3. เพิ่ม common audit event และ sensitive VIEW/DOWNLOAD/EXPORT logging
4. สร้าง canonical identity map และ actor/subject/context model
5. ทำ restore drill และย้าย backup ไปพื้นที่ที่บริษัทเป็นเจ้าของ
6. หลังผ่าน phase gate จึงเริ่ม contract/compensation, special payment และ payroll review

## สิ่งที่ต้องตัดสินใจก่อนเริ่ม Implementation

- ผู้บริหารยืนยันว่าจะปรับ P0 เป็น Control Foundation Release หรือไม่
- ระบุ owner ของ authorization, audit evidence, backup และ restore test
- ยืนยัน Vercel plan, retention requirement และ company-owned backup destination
- กำหนด acceptance criteria ของ separation of duties และ self-approval protection
- เลือก pilot scope ที่จำกัดก่อนเปิดข้อมูล contract หรือ payslip ในวงกว้าง

## Verification ในรอบนี้

- ตรวจว่า report มีครบทุกหัวข้อ A-N และคำตอบ review questions 20 ข้อ
- ตรวจ Markdown whitespace ด้วย `git diff --check`
- ไม่รัน application build เพราะเป็น docs-only change และไม่มี source/runtime change

## Prompt เริ่มงานรอบถัดไป

```text
อ่าน docs/SESSION_HANDOFF_SEP03_GOVERNANCE_REVIEW.md และ
docs/NEXUS_GOVERNANCE_FEASIBILITY_REPORT_2026-09-02.md แล้วเริ่ม P0A เฉพาะ
CI/schema baseline ก่อน โดยตรวจสถานะ main และ migration history จริงก่อนแก้ไฟล์
ห้ามเริ่ม payroll, investigation หรือ AI และห้ามแตะ production data โดยไม่มี
แผน migration, rollback และ verification ที่ชัดเจน
```

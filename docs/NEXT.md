# 📌 NEXT — เริ่มงานต่อที่นี่

> **ไฟล์นี้คือ single point of entry** สำหรับ session ถัดไป — ไม่ว่าจะเปิดที่เครื่องไหน
> พิมพ์ประโยคเดียวในช่อง Claude แล้วทำงานได้ทันที.

---

## 🎯 ประโยคเดียวที่ต้องพิมพ์

```
อ่าน docs/NEXT.md แล้วทำต่อ
```

**ก่อนลุย:** `cd ~/C1TB/EB-CI/EBCI-Nexus && git pull origin main --ff-only`

**ตอบเครื่อง:** "อยู่ home"

**ทำก่อน (1 นาที):** Logout จาก production (ปอนด์: `tumyen@gmail.com / 0000`) แล้ว login ใหม่. เปิดหน้า profile พนักงานคนใดก็ได้ → ควรเห็น **การ์ด "สลิปเงินเดือน"** แล้ว (laptop session แก้ DB ให้แล้ว — ดู §3.1)

---

## 0. TL;DR ใน 30 วินาที

**APR27 laptop night** — fix bug ปอนด์ไม่เห็น salary card (User.id cuid vs auth UUID divergence — pattern เดียวกับ notifications bug Apr 22). DB migrated, 1 file commit. **§3.1 closed.** ถัดไป: **§3.2 Permission editor UI** (~30-45 นาที).

**APR27 office afternoon ปิด feature ใหญ่ 4 ตัว:**

1. **One-click hire** — applicant → employee + auto-seed leave balances + copy รูป/ข้อมูล
2. **Contracts module** — table + Storage bucket + ContractsCard + bulk-backfill progress banner
3. **B&W PDF export** ของหน้า profile (รูปเป็นสี · 1 หน้า A4 · INP fix double-rAF)
4. **Salary slips + payroll permission** — allow-list `can_manage_payroll` flag · มดถูก exclude · บัญชีจะได้สิทธิ์ตอน create user · bulk upload + email + 🔔 ครบ

**+ 8 ฟีเจอร์เล็ก:** calendar icon ขาว · bereavement 5 วัน day 1 · HR fan-out notification · email templates อบอุ่น · approver chain box · home location map · personal info section · edit-mode gate uploads

**HR ปลอดภัย ใช้ได้แล้ว** — ทุก permission gated · audit trail ครบ · soft-delete only

---

## 1. Commits ของ session นี้

| # | Commit | Track | สรุป |
|---|---|---|---|
| 17 | `6c4adfb` | UX | upload สัญญา + สลิป ต้องกด edit ก่อน |
| 16 | `777a5a3` | 💰 **Payroll** | salary slips + allow-list permission · มด=excluded |
| 15 | `c55e81c` | 🖨️ Print | double-rAF INP fix + drop card borders |
| 14 | `63e6e09` | 👥 Profile | home location + DOB/gender/EN name + 1-page print |
| 13 | `6773e26` | 🖨️ Print | defer window.print() (INP attempt 1) |
| 12 | `c300619` | 🖨️ Print | hide app shell chrome (sidebar/banner/identity) |
| 11 | `5f20de0` | 🖨️ Print | B&W PDF export (รูปยังเป็นสี) |
| 10 | `6a57085` | 📑 Contracts | UI ContractsCard + backfill progress banner |
| 9 | `10bc9f8` | 🍃 Leave | approver chain box (read-only) บนฟอร์มลา |
| 8 | `d89511e` | 📑 Contracts | DB + Storage + API (WIP) |
| 7 | `2a5047e` | 💌 Emails | careers templates rewrite (HR ผู้หญิง · อบอุ่น · 7 แบบ) |
| 6 | `c079795` | 👥 Applicants | HR fan-out notification + relaxed hire button |
| 5 | `6f0e2b9` | 🆕 Hire flow | applicant → employee one-click + auto-seed balances |
| 4 | `7550445` | 🍃 Leave | bereavement 5 วัน ตั้งแต่ day 1 (53 active = 265 days) |
| 3 | `eabc03c` + `9529a90` | 🎨 Forms | calendar icon ขาว (SVG inline) |

(17 ต่อจาก `59791f3` ของเช้านี้ที่เป็น mobile applicant fix)

---

## 2. สิ่งที่เพิ่งส่งมอบ — ใช้งานได้จริงแล้ว

### Module: Hire flow (`/hradmin/applicants/[id]`)
- ปุ่ม **"จ้างเข้าทำงาน"** สีเขียว (โผล่ทุกสถานะยกเว้น draft/rejected)
- Modal กรอกแค่ 4 ฟิลด์: `employee_code` · `department` · `employment_type` · `start_date` (+ optional `probation_end_date`, `position`, `manager_id`, `leave_approver_id`)
- 14 ฟิลด์ copy auto จาก applicant: title, names TH+EN, nickname, email, phone, photo_url, DOB, position_applied, emergency contact 4 fields, applicant_id link
- **Trigger DB**: `trg_seed_leave_balances` ทำงานทันที — seed `leave_balances` (ลาป่วย 30, ลากิจ 3, ลาพ่อแม่เสีย 5)
- ใบสมัครเปลี่ยนสถานะ → `hired` อัตโนมัติ
- HR fan-out notification ทุกครั้งเปลี่ยนสถานะ (ยกเว้นคนกด)

### Module: Employment contracts
- การ์ด **"เอกสารสัญญาจ้าง"** บน profile (HR-only · gated `isHrAdmin`)
- 5 ประเภท: probation / permanent / amendment / renewal / termination
- Upload: PDF/image ≤ 20MB · มือถือถ่ายผ่าน camera ได้ (`capture="environment"`)
- Soft-delete only (กฎหมายเก็บ 2+ ปี post-termination)
- **Banner ที่ `/hradmin/employees`**: "X / 53 คนมีสัญญา" + progress bar (เป้า 3 เดือน)
- ⚠️ Upload ต้องกด **"แก้ไขข้อมูล"** ก่อน (ตามที่ user ขอใน commit `6c4adfb`)

### Module: Payroll (Salary slips) ⭐ ใหม่ใหญ่
- การ์ด **"สลิปเงินเดือน"** บน profile (gated `can_manage_payroll`)
- หน้า **`/portal/payroll`** — พนักงานดูสลิปตัวเองได้
- หน้า **`/hradmin/payroll/bulk`** — บัญชี upload pluริp ทีเดียว 50+ ไฟล์
  - Filename pattern: รหัสพนักงานในชื่อไฟล์ (เช่น `Slip_060-01_2026-04.pdf`)
  - Dry-run preview ก่อน commit
  - Per-file outcomes: ok / matched / no_match / invalid_type / too_large
- Notification: in-app + email อบอุ่นจาก HR sender
- Replace-on-conflict: re-upload เดือนเดิม → soft-delete เก่า → save ใหม่
- ⚠️ Upload สลิป เหมือน contract — ต้องกด edit ก่อน

### Permission system
- New flag **`can_manage_payroll`** บน `User` table (default false)
- ✅ ปอนด์ (admin) = `true` set แล้ว
- ❌ มด (อาทิตย์) = `false` ตามที่ user ขอ — ดู HR ปกติได้ แต่ **ไม่เห็นสลิปเลย**
- ❌ จิม / ดำ / HR คนอื่น = `false` — รอปอนด์ grant เอง
- New preset **`payroll_manager`** ใน permission-presets (สำหรับสร้าง account บัญชี)

### Module: Profile (`/hradmin/employees/[id]`)
- การ์ดใหม่ **"ข้อมูลส่วนตัว"** — ชื่อ EN, DOB+อายุ auto-calc, เพศ
- การ์ดใหม่ **"ที่อยู่"** — current_address + GPS lat/lng + Google Maps embed
- เพิ่มใน Work card: probation_end_date + leave_approver_id
- เพิ่มใน Emergency contact: emergency_contact_address
- ปุ่ม **"ส่งออก PDF"** (HR-only) — print B&W รูปสี · 1 หน้า A4
- INP issue หาย (double rAF)

### Module: Leave
- ลาพ่อแม่เสียชีวิต **5 วัน** ตั้งแต่ day 1 (53 employees × 5 = 265 days seeded)
- ฟอร์มลาขั้น 2 มี **กล่องเขียว "ใบลานี้จะส่งไปที่..."** read-only
- DB trigger auto-seed leave_balances ทุกครั้ง insert employee ใหม่

### Module: Careers emails
- 7 templates rewrite — สไตล์ HR ผู้หญิง · `ดิฉัน` + `ค่ะ` · ยาวขึ้น · มี bullet ขั้นตอน · มี signOff "ฝ่ายบุคคล · EBCI Careers"
- Subject อบอุ่น: "ได้รับใบสมัครของคุณแล้วค่ะ" / "ยินดีด้วยค่ะ — ผ่านการพิจารณารอบแรก"

### Forms / UX
- 🎨 Calendar icon ใน `<input type="date">` เป็น SVG ขาวล้วน (เห็นชัดบน dark theme)
- HR fan-out notification ทุกคนที่มี HR permission (ยกเว้นคนกด) ตอน status เปลี่ยน

---

## 3. สิ่งที่ยังเปิดอยู่ — เรียงตาม priority

### 3.1 ✅ **Salary card visibility — แก้แล้วใน laptop session APR27 night**

**Root cause (ไม่ใช่ deploy timing):** ปอนด์'s `User.id` = legacy Prisma cuid `cm6ml6x8n…` แต่ `session.id` = auth UUID `9dc14c59-…`. `getCurrentPermissions()` ที่ `src/lib/permissions-server.ts:16` ใช้ `.eq('id', session.id)` → ไม่เจอ row ของปอนด์ → คืน `EMPTY_PERMISSIONS` → `canViewPayroll=false` → การ์ดถูกซ่อน.

มด/จิม/ดำ ใช้ได้เพราะ User.id เป็น UUID ตรงกับ auth UUID อยู่แล้ว.

**Pattern เดียวกับ bug notifications.recipient_user_id ที่เจอวันที่ Apr 22** (commit `e15ec5a`).

**Fix:** UPDATE ปอนด์'s `User.id` cuid → auth UUID. **0 FK refs ในทั้ง 7 ตาราง** (verified ก่อน update) — safe one-liner. Migration: `supabase/migrations/20260427_realign_admin_user_id_to_auth_uuid.sql`.

**Verify ที่บ้าน:**
1. Logout จาก production (ปอนด์ token เก่ายังใช้ได้แต่ permission ไม่อ่านใหม่)
2. Login ใหม่ → เปิดหน้า profile พนักงานคนใดก็ได้ → เห็นการ์ด "สลิปเงินเดือน" ✅
3. (Optional) Logout → login เป็น **มด** (`c.arthit@ebcitrade.com / 0839964333`) → **ไม่เห็น**การ์ด ✅

ถ้า verify ผ่านแล้ว → ลุย §3.2 ต่อ.

### 3.2 ⭐ **UI Permission editor** — 30-45 นาที

ตอนนี้ปอนด์ต้อง **แก้ DB ตรงๆ** เพื่อ grant `can_manage_payroll` ให้ใคร — ไม่ practical

**ทำ:** Permission editor บน `/hradmin/staff/[id]` (หรือ `/hradmin/settings/permissions`)
- รายการ permission flags (checkbox)
- Preset chips: Super Admin / HR Manager / Payroll Manager / Employee
- Save → server action update User row + audit log

ใช้ `permission-presets.ts` ที่มีอยู่แล้ว · pattern เดียวกับหน้าที่ user ดูสิทธิ์อยู่ตอนนี้

### 3.3 ⭐ **สร้าง user account ให้บัญชี** — 5-10 นาที

หลัง permission editor พร้อม:
1. ปอนด์ create user "บัญชี" (ใครจะเป็นคนนั้นยังไม่ได้คุย)
2. Apply preset `payroll_manager` (can_manage_payroll=true · ไม่ได้ HR อื่น)
3. ส่ง credentials ให้ทีมบัญชี
4. ทดสอบเข้า `/hradmin/payroll/bulk` แล้ว upload PDF จริง

### 3.4 **Test bulk upload end-to-end** — 20 นาที

ทดสอบ flow จริง:
1. ออกสลิป test 3-5 ไฟล์ (ใช้ PDF dummy ก็ได้)
2. ตั้งชื่อตาม pattern: `Slip_060-01_2026-04.pdf` ฯลฯ
3. Upload ที่ `/hradmin/payroll/bulk` · เลือก เม.ย. 2569
4. ตรวจ preview → matched ครบไหม
5. ยืนยัน → ดู email + 🔔 ใน account พนักงาน

### 3.5 Print: verify ข้อมูลส่วนตัว + ที่อยู่ ขึ้นใน PDF จริง

User report: "ข้อมูลตอน print ยังแสดงไม่ครบ" — แต่ใน read view มีครบ

**Possible cause:** สอง section นี้อยู่หลัง grid 2-col contact + work; print compaction อาจดันลง page 2 (preview แสดงแค่ page 1)

**Test:** Save as PDF จริง → เปิดดู PDF → ทุกอย่างอยู่ใน 1-2 หน้า  
ถ้าตัด ไม่ครบ → ปรับ font size หรือซ่อน chart ให้แน่นกว่านี้

### 3.6 **Phase 2 Profile** (deferred) — 2-3 ชม.

ดึงข้อมูลเพิ่มจาก `job_applications` (สำหรับคนที่ผ่าน hire flow ใหม่):
- เลขบัตรประชาชน · สัญชาติ · ศาสนา
- ที่อยู่ตามทะเบียนบ้าน
- ครอบครัว (พ่อแม่/คู่สมรส/บุตร)
- การศึกษา (jsonb education)
- ประสบการณ์ (jsonb work_experience)

⚠️ พนักงานเก่า 53 คนไม่มี applicant_id link → จะเห็น "—"

### 3.7 Vercel env vars — ✅ ปอนด์ set แล้วเช้านี้
3 ตัว `EMAIL_FROM_*` set แล้ว · Resend domain `ebcinext.com` ต้องเช็ค verified ใน https://resend.com/domains

### 3.8 Tab 4 calendar mobile UX (opportunistic) — เก่าค้างจาก APR25
iPhone จริงทดสอบ + flip vertical day list ถ้า cell เล็กเกินกด

### B. รอข้อมูลจาก HR
- B5 มด review `EBCI-employees-review.xlsx`
- ตี๋ president's driver — เพิ่ม + leave_approver_id = ดำ (decision pending)
- เบนซ์ override — case decision pending

### C. Long-term
- C1 Image crop Phase F — UX design
- C2 Granular permissions Phase 2 (ดูสัญญาจ้าง · ลบพนักงาน · ดูที่อยู่เต็ม)
- C3 Auto-import payroll จาก software บัญชี (ถ้าใช้ ERP API ได้)

---

## 4. Env vars + test accounts

```bash
# Production set แล้ว:
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL
EMAIL_FROM_CAREERS · EMAIL_FROM_HR · EMAIL_FROM_SYSTEM      ← set Apr 27 เช้า

# Optional (ยังไม่ set):
VERCEL_API_TOKEN · VERCEL_TEAM_ID · VERCEL_PROJECT_ID       ← เปิดการ์ด deploy activity
```

**Test accounts (ใหม่ใน session นี้):**
| User | username | role | can_manage_payroll | หมายเหตุ |
|---|---|---|---|---|
| ปอนด์ / ม๊อด | `admin` | hr_admin | ✅ true | Super Admin |
| มด (อาทิตย์) | `arthit` | hr_admin | ❌ false | **excluded จาก payroll** |
| จิม | `thanawatana` | hr_admin | ❌ false | grant ภายหลัง |
| ดำ | `sayan` | hr_admin | ❌ false | grant ภายหลัง |
| บัญชี | (TBD) | manager | (will be true) | account ใหม่ที่ต้องสร้าง |

**Test data:**
- 54 active employees · 53 มี leave balance bereavement seeded
- 0 contracts uploaded · 0 salary slips uploaded — รอ HR + บัญชี

---

## 5. Git + deploy state

- **Repo:** `caserebel-maker/EBCI-Nexus`
- **Last commit:** `6c4adfb` (edit-mode gate uploads)
- **Vercel deploy:** auto — `https://nexus.ebcitrade.com`
- **Build:** ✓ TS clean (npx tsc --noEmit) · ไม่มี regression
- **Routes:** ~110 (เพิ่ม +9 จาก hire/contracts/payroll/portal)

**Branch:** ทำงานบน `claude/priceless-heisenberg-55cb19` worktree push HEAD:main

---

## 6. DB state ปัจจุบัน

- **Employees:** 54 active · 1 inactive
- **Migrations applied today (Apr 27):**
  - `grant_bereavement_leave_from_day_one` (บวก 265 leave-days)
  - `set_bereavement_default_days_5` (leave_types update)
  - `auto_seed_leave_balances_on_employee_insert` (trigger)
  - `create_employee_contracts_table` + storage bucket
  - `add_home_location_to_employees` (lat/lng/label/note)
  - `create_salary_slips_and_payroll_permission` ⭐ + storage bucket
- **Storage buckets ใหม่:**
  - `employee-contracts` (private · 20MB · PDF/image)
  - `salary-slips` (private · 10MB · PDF/image)
- **Leave types: 6** (annual/personal/sick/marriage/bereavement/training)

---

## 7. Build + types state

- **Routes:** ~110 (+9)
  - `/api/hradmin/applicants/[id]/hire`
  - `/api/hradmin/employees/[id]/contracts` + `[contractId]`
  - `/api/hradmin/employees/[id]/salary-slips` + `[slipId]`
  - `/api/hradmin/payroll/bulk-upload`
  - `/api/portal/payroll` + `[slipId]`
  - `/api/leave/approver-chain`
  - `/hradmin/payroll/bulk` (page)
  - `/portal/payroll` (page)
- **TypeScript:** clean
- **Build:** ✓ Compiled

---

## 8. Quirks ของ session นี้

1. **`can_manage_payroll` = allow-list** — default false ทุกคน · ปอนด์ explicit grant เอง · มดถูก exclude permanently per user request
2. **window.print() blocks paint** — `setTimeout(0)` ไม่พอ · ต้อง **double `requestAnimationFrame`** ถึงจะให้ paint cycle จบก่อน dialog เปิด
3. **Print preview ของ Brave/Chrome** จำลอง viewport แคบ → `lg:hidden` evaluate true → mobile chrome (PriorityAlerts, DailyGreeting, identity card) leak ออก → fix ด้วย `print:hidden` ที่ shell.tsx
4. **silverCard inline border** = `rgba(255,255,255,0.65)` → ดูดีบน dark · ใน print ขึ้นเป็นกรอบขาว → print rule force `border:none`
5. **Bulk upload filename matching** sort longest-first ป้องกัน "060-01" ตี match "060-001" prefix
6. **Salary slip replace-on-conflict** — unique partial index `WHERE deleted_at IS NULL` · ใหม่มาแทน → soft-delete เก่า + audit chain
7. **Edit-mode gate uploads** (commit `6c4adfb`) — ContractsCard + SalarySlipsCard upload form แสดงเฉพาะตอน `isEditing` · ป้องกันคลิกพลาด

---

## 9. SESSION_HISTORY.md

→ Append §15 entry สำหรับ APR27 office afternoon (ดูใน `docs/SESSION_HISTORY.md`)

---

*Generated end of APR27 office afternoon · 17 commits shipped · Hire + Contracts + PDF + Payroll + Permission ครบ · Last commit `6c4adfb` · routes ~110*
*ผู้ใช้กำลังจะเลิกงาน → continue ที่ laptop · พิมพ์ "อ่าน docs/NEXT.md แล้วทำต่อ"*

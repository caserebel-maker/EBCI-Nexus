# 📌 NEXT — เริ่มงานต่อที่นี่

> **ไฟล์นี้คือ single point of entry** สำหรับ session ถัดไป — ไม่ว่าจะเปิดที่เครื่องไหน
> พิมพ์ประโยคเดียวในช่อง Claude แล้วทำงานได้ทันที.

---

## 🎯 ประโยคเดียวที่ต้องพิมพ์

```
อ่าน docs/NEXT.md แล้วทำต่อ
```

**ก่อนลุย:** `cd <office-path>/EBCI-Nexus && git pull origin main --ff-only`

**ตอบเครื่อง:** "อยู่ office"

**ทำก่อนทุกอย่าง (3 นาที verify):**
1. Logout → login `wiyada / 0000` (ปุ๋ย, บัญชี) — ใหม่!
2. ดู sidebar — ควรเห็น **9 เมนู** = 8 employee เดิม + **"💰 อัปโหลดสลิปเงินเดือน"** (Wallet icon) ที่เป็นลิ้งก์ไป /hradmin/payroll/bulk
3. Click → ต้อง land หน้า bulk upload โดยไม่โดน redirect
4. ลองพิมพ์ `/hradmin/employees` ตรงๆ → ควรโดน redirect (ปุ๋ยไม่มีสิทธิ์ HR ปกติ)
5. กลับ login เป็น admin (ปอนด์/ม๊อด) — sidebar ของ admin ก็จะมี "อัปโหลดสลิปเงินเดือน" เพิ่มขึ้น (เพราะ flag = true)

---

## 0. TL;DR ใน 30 วินาที

**APR28 office (รอบใหม่ ต่อจาก APR27→28 overnight):**

ปิดงาน UX + ระบบใหญ่หลายชิ้นก่อน beta 5 คน:

1. **Sidebar polish** — ซ่อน "อัปโหลดสลิปเงินเดือน" ใน /portal preview, gate "อนุมัติการลา" ด้วย `is_approver`, เพิ่ม "ปฏิทิน" + "ตั้งค่า" ใน portal sidebar
2. **/portal/settings + เปลี่ยนรหัสผ่าน** — ลิงก์ "ลืมรหัสผ่าน?" ที่ /login ด้วย
3. **WFH days** — `holidays.type='wfh'`, ปฏิทินบริษัท rename, banner บน dashboard
4. **Permissions list** — กรองคนที่ไม่มี role/flag ออกจาก /hradmin/settings/permissions
5. **Email noti audit** — สรุปทุก trigger ลงในแชต (ไม่มี code change)
6. **Calendar contrast** — fix today pill จม + ตัวอักษรอ่านยาก
7. **Checkin toast** — popup กลางจอ + ปุ่มปิด + auto-dismiss 5s
8. **🆕 Backup feature** — `/hradmin/settings/backup` — ZIP ครบ data + storage + SYSTEM.md + MANIFEST.md

**APR27→28 home overnight (รอบก่อน):**

1. §3.2 ✅ Permission editor · 2. §3.5 ✅ Print flat layout
3. §3.5b ✅ Audit pipeline · 4. §3.3 ✅ User ปุ๋ย
5. 🆕 Permission-driven sidebar menu · 6. Pre-existing TS errors ✅

**ที่เร่งด่วนที่สุดถัดไป:** **§3.4 Test bulk salary slip upload e2e** + แจกบัญชี 5 testers + ทดสอบ /portal/settings + iPhone smoke test

---

## 1. Commits ของ session นี้

| # | Commit | Track | สรุป |
|---|---|---|---|
| 9 | `a0a8347` | 🆕 Nav | permission-driven extra menu — payroll uploaders see one extra link |
| 8 | `ba46170` | 🖨️ Print | strip card frames, hero stays framed (flat data layout) |
| 7 | `b830ffa` | 📜 Audit | viewer ที่ /hradmin/settings/audit + nav link + 2 tabs |
| 6 | `449a8f7` | 📜 Audit | wire updateEmployee → employee_audit_log + canViewAuditLog AuthCheck |
| 5 | `3796dd1` | 📚 Docs | refresh NEXT + §16 SESSION_HISTORY |
| 4 | `57c2893` | 🖨️ Print | 2-col grids บน print → personal+address ไม่ตก page 2 |
| 3 | `9eccbd0` | ⚙️ Settings | link to permissions editor from /hradmin/settings |
| 2 | `170d60f` | 🔐 Permissions | editor ที่ /hradmin/settings/permissions (page + view + actions) |
| 1 | `123c290` | 🔐 Permissions | foundation — can_view_audit_log flag + user_permission_audit_log table |

**+ DB-only:** ปุ๋ย User row + linkage (no commit, recorded in §18 SESSION_HISTORY)

(9 ต่อจาก `336f211` admin User.id realign)

---

## 2. สิ่งที่เพิ่งส่งมอบ — ใช้งานได้จริงแล้ว

### ⭐ Module: Permission Editor (`/hradmin/settings/permissions`)
- **Super-admin gated** — เข้าได้เฉพาะคนที่มี `can_manage_system` หรือ legacy `role='hr_admin'`
- ตาราง user ทุกคน (desktop) / mobile cards พร้อม:
  - Preset badge (Super Admin / HR Manager / Payroll Manager / Executive / Employee / Custom)
  - Flag chips ที่บอกว่าแต่ละ flag เปิดอยู่ไหม
  - ปุ่ม "แก้ไข"
- Modal แก้ไข portal-mounted (z-[90]):
  - **Preset picker** 5 ตัว (apply ทันทีไป fill 8 checkboxes)
  - **8 per-flag checkboxes** (label TH + description TH per flag — รวม `can_view_audit_log` ใหม่)
  - **Reason textarea** (optional, เก็บใน audit row)
  - **Audit history** — last 8 entries per target user (timestamp + actor + before→after preset + note)
  - **Self-edit warning** — ⚠ ถ้ากำลัง strip can_manage_system ของตัวเอง
- Server action:
  - Auth re-check
  - No-op detection (skip UPDATE + audit ถ้าไม่มีอะไรเปลี่ยน)
  - Atomic UPDATE → best-effort audit insert
- New DB table `user_permission_audit_log` — full before/after jsonb snapshots
- New flag `can_view_audit_log` ใน UserPermissions type (เก่าเก็บใน DB column แต่ TS ไม่รู้ ตอนนี้รวมแล้ว)

### 🖨️ Print fix
- เพิ่ม `print:grid-cols-2 print:gap-3` ทั้ง 2 grids (contact+work, personal+address)
- ทั้งสอง grids ติด `data-print-section` ให้ page-break-inside: avoid CSS rule ทำงาน
- screen layout ไม่เปลี่ยน

---

## 3. สิ่งที่ยังเปิดอยู่ — เรียงตาม priority

### 3.1 ✅ ~~Salary card visibility~~ — DONE (laptop session คืนก่อน, commit `336f211`)
Verify อีกที: `/hradmin/employees/[id]` → ควรเห็นการ์ด "สลิปเงินเดือน" สำหรับปอนด์.

### 3.2 ✅ ~~Permission editor UI~~ — DONE คืนนี้ (commits 1-3)

### 3.3 ✅ ~~สร้าง user account ให้บัญชี~~ — DONE (DB seed Apr 28)

User created via Supabase MCP:
- `username: wiyada` / `password: 0000`
- Linked to employee `449-62` (วิยะดา เหง้าเทพ, แผนกบัญชี)
- `role: employee` · `can_manage_payroll: true` · ทุก flag อื่น false (Payroll Manager preset)

ส่ง credentials ให้ปุ๋ย:
```
URL:      https://nexus.ebcitrade.com
Username: wiyada
Password: 0000  (ขอให้เปลี่ยนเอง — แต่ระบบยังไม่มี UI เปลี่ยนรหัส, gap)
```

🎯 **ทำต่อ §3.4** เพื่อ verify upload e2e

### 3.4 ⭐ **Test bulk salary slip upload e2e** — 20 นาที (เร่งด่วนสุดแล้ว)

ทดสอบ flow จริง:
1. Login `wiyada / 0000` → sidebar เห็น "อัปโหลดสลิปเงินเดือน"
2. คลิก → /hradmin/payroll/bulk
3. ออกสลิป test 3-5 ไฟล์ (PDF dummy ก็ได้)
4. ตั้งชื่อตาม pattern: `Slip_060-01_2026-04.pdf` ฯลฯ
5. Upload · เลือก เม.ย. 2569
6. Preview → ตรวจว่า matched ครบไหม
7. ยืนยัน → ดู email + 🔔 ใน account พนักงาน
8. Logout → login เป็นพนักงานคนหนึ่งที่ได้สลิป → /portal/payroll → เห็น PDF + download ได้

### 3.5 ✅ ~~Print PDF: ข้อมูลส่วนตัว+ที่อยู่ ขึ้นใน PDF~~ — Code fixed (`57c2893`)

**Verify:** เปิด `/hradmin/employees/[id]` → กด "ส่งออก PDF" → Save as PDF → เปิดดู
ควรเห็น:
- **page 1:** hero + contact + work + **personal info + address** (ครบ!)
- **page 2 (ถ้ามี):** stats + leave history (ปกติพวกนี้ `print:hidden` อยู่แล้ว)

ถ้ายังตก → อาจต้องลด font size อีก หรือซ่อน emergency contact card บน print.

### 3.5b ✅ ~~Audit log viewer + employee audit wiring~~ — DONE (`449a8f7` + `b830ffa`)

ปอนด์ดูได้ที่ `/hradmin/settings/audit` หรือผ่านลิงก์จาก `/hradmin/settings`:
- **Tab 1:** ประวัติการเปลี่ยนสิทธิ์ (จาก editor §3.2)
- **Tab 2:** ประวัติการแก้ข้อมูลพนักงาน (auto จาก `updateEmployee` — เริ่มเก็บตั้งแต่ commit นี้, ของเก่าจะไม่มี)

แต่ละแถว expandable → ดู diff per field/flag · note + reason แสดงด้วย

Gated: `can_view_audit_log || can_manage_system || legacy hr_admin role`

### 3.6 **Phase 2 Profile** (deferred) — 2-3 ชม.

ดึงข้อมูลเพิ่มจาก `job_applications` (สำหรับคนที่ผ่าน hire flow ใหม่):
- เลขบัตรประชาชน · สัญชาติ · ศาสนา
- ที่อยู่ตามทะเบียนบ้าน
- ครอบครัว (พ่อแม่/คู่สมรส/บุตร)
- การศึกษา + ประสบการณ์ (jsonb)

⚠️ พนักงานเก่า 53 คนไม่มี applicant_id link → จะเห็น "—"

### 3.7 Vercel env vars — ✅ set แล้ว
3 ตัว `EMAIL_FROM_*` set แล้ว · Resend domain `ebcinext.com` ต้องเช็ค verified ใน https://resend.com/domains

### 3.8 Tab 4 calendar mobile UX (opportunistic) — เก่าค้างจาก APR25
iPhone จริงทดสอบ + flip vertical day list ถ้า cell เล็กเกินกด

### 3.9 ✅ ~~Backup feature~~ — DONE APR28 office (`7f8fc86`)

หน้า `/hradmin/settings/backup` (super-admin only).

**Routine ที่แนะนำให้มด/ปอนด์ทำ:**
- กดปุ่ม "ดาวน์โหลดข้อมูลทั้งระบบ" **ทุกศุกร์เย็น**
- เก็บ ZIP ใน Google Drive ส่วนตัว (โฟลเดอร์ EBCI-Nexus-Backup/YYYY-MM/)
- หน้าเตือนเป็นสีแดงเมื่อเกิน 7 วันยังไม่กด

**ZIP ครอบคลุม:**
- `data/*.csv` — 11 ตาราง (employees, User, leave_*, holidays, announcements, salary_slips, offices, check_ins, job_applications)
- `files/<bucket>/...` — Storage ทั้ง 7 buckets (รูปพนักงาน, สลิป, สัญญา, รูปประกาศ ฯลฯ)
- `SYSTEM.md` — เอกสารระบบทั้งระบบให้ AI อ่าน (stack, repo, auth, DB, flows, restore steps)
- `MANIFEST.md` — เฉพาะ snapshot นี้ (วันที่ + ใครกด + row counts + bucket sizes)

**ไม่ครอบคลุม:**
- `auth.users` (passwords) — ต้องใช้ Supabase invite flow ตอน restore
- audit logs — ตัดออกเพื่อขนาด
- env vars — อยู่ที่ Vercel

**Free tier strategy:** ใช้ Supabase Free 3 เดือนแรก + manual backup ทุกอาทิตย์ → ก่อน rollout เต็มบริษัทค่อย upgrade Pro $25/mo (daily backup + 7-day PITR)

### 3.10 Field check-in สำหรับพนักงานออกพื้นที่ — DEFERRED post-beta

**Why deferred:** beta 5 คนไม่มีใครเป็นสาย field → ทำตอน 5-คน beta ผ่านแล้วค่อยเปิดให้ทั้ง ~10 คน outside-office.

**Use case:** บริษัทโลจิสติกส์ — drivers, sales, ผู้บริหารที่ออกประชุมต่างที่. ปัจจุบัน /portal/checkin มี 2 type (Office + WFH) ซึ่ง "Office" บังคับ geofence เลยใช้ไม่ได้ตอนไม่อยู่ออฟฟิศ.

**Design decision (locked APR28):** ใช้ approach **A + B รวมกัน**:

- **A. Field type ใหม่** — ปุ่มที่ 3 "เช็คอินภาคสนาม" 🚛
  - Flow: เก็บ GPS (เพื่อ audit) แต่ **ไม่ validate geofence**
  - Note + photo = **optional** (user confirmation: ไม่บังคับ)
  - ถ้ากรอก note → คน HR ดูได้ภายหลัง

- **B. Per-employee `work_mode_default`** — HR กำหนดให้แต่ละคน
  - Enum: `office` (default, current behavior) / `field` / `flexible`
  - `field` → ปุ่มภาคสนามเด่นที่สุดบนหน้า checkin
  - `flexible` → 3 ปุ่มเท่ากัน (เหมาะกับ sales/manager ที่สลับ)

**Schema delta:**
- `employees.work_mode_default` enum default `office`
- `check_ins.note` text nullable
- `check_ins.photo_url` text nullable (เผื่อ option upload ทีหลัง)

**Scope:** ~10 คน max → ไม่ต้องคิด scale อะไรพิเศษ. Migration + UI + 1 modal เพิ่ม. Estimate ~3-4 ชม.

### 3.11 Late + absent counters — DEFERRED post-beta

**สถานะปัจจุบัน:**
- `/portal/dashboard` → DonutCard "มาสาย" แสดง `lateCount = 0` (hardcoded ที่ [page.tsx:236](src/app/portal/dashboard/page.tsx))
- `/portal/profile` → StatCard "มาสาย" + "ขาด" ทั้งคู่ value=0 hardcoded
- `/hradmin/attendance/reconcile` มี logic `status='absent'` รายวัน แต่ไม่ aggregate ต่อพนักงาน
- `/hradmin/reports?tab=attendance` ไม่มี column late/absent

**สิ่งที่ขาด:**
1. ยังไม่มีนิยาม "cutoff time" (เช่น 8:30) → ไม่รู้ว่าใคร "สาย"
2. Aggregator ที่นับวันสาย+ขาดต่อพนักงานต่อปี

**Plan post-beta (~2-3 ชม.):**
- เพิ่ม column `check_in_locations.cutoff_time` (text "08:30")
- Server action `getAttendanceStats(employeeId, year)`:
  - lateCount = checkins ที่ Bangkok-local time > cutoff (เฉพาะ type='office' เท่านั้น — wfh/field ไม่นับ)
  - absentCount = workdays − (office + wfh + field + leave + holiday)
- Wire เข้า dashboard donut + profile stats + reports CSV column

### 3.12 ✅ ~~Strong password policy~~ — DONE APR28 (`31b01f0`)

[src/lib/password-policy.ts](src/lib/password-policy.ts) เป็น single source of truth. Rules:
- ≥ 8 ตัว
- มีทั้งตัวอักษร + ตัวเลข
- ห้าม "0000", "password", "qwerty", "EbciTest2026!" + รายการอื่นๆ
- ห้ามตัวอักษรเดียวซ้ำกันทั้งหมด

ใช้ที่: `/reset-password` · `/portal/settings` · `/hradmin/settings/permissions` (createUser modal) — server-side enforce ใน actions.ts ด้วย

### 3.13 ✅ ~~Supabase RLS hardening~~ — DONE APR28

[20260428_enable_rls_on_remaining_tables.sql](supabase/migrations/20260428_enable_rls_on_remaining_tables.sql) เปิด RLS บน 14 tables ที่ยังเปิดให้ anon read:
- `User`, `checkins`, `leave_balances`, `leave_requests`, `leave_records`, `leave_policies`, `leave_types`, `holidays`, `job_applications`, `attendance_logs`, `card_scans`, `check_in_locations`, `notifications`, `user_permission_audit_log`

Default deny (no policies). Service role bypass ทำให้ supabaseAdmin ในแอปยังทำงานได้ แต่ anon key ในเบราว์เซอร์โดน block — ปกป้องการ scrape ข้อมูลทั้งระบบผ่าน supabase-js โดยตรง.

ถ้าจะให้ browser อ่าน table ตรงๆ (เช่น holidays public) → เพิ่ม policy `USING (true)` แยก, อย่าปิด RLS อีก.

### B. รอข้อมูลจาก HR
- B5 มด review `EBCI-employees-review.xlsx`
- ตี๋ president's driver — เพิ่ม + leave_approver_id = ดำ (decision pending)
- เบนซ์ override — case decision pending

### C. Long-term
- C1 Image crop Phase F — UX design
- C2 Granular permissions Phase 2 (ดูสัญญาจ้าง · ลบพนักงาน · ดูที่อยู่เต็ม) → editor พร้อมแล้ว แต่ flag ใหม่ๆ ต้องเพิ่มเป็นคนๆ
- C3 Auto-import payroll จาก software บัญชี (ถ้าใช้ ERP API ได้)

---

## 4. Env vars + test accounts

```bash
# Production set แล้ว:
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL
EMAIL_FROM_CAREERS · EMAIL_FROM_HR · EMAIL_FROM_SYSTEM
```

**Test accounts (อัปเดตหลัง APR27):**

| User | username | role | can_manage_system | can_manage_payroll | หมายเหตุ |
|---|---|---|---|---|---|
| ปอนด์ / ม๊อด | `admin` | hr_admin | ✅ | ✅ | Super Admin (User.id = auth UUID หลัง realign) |
| มด (อาทิตย์) | `arthit` | hr_admin | ✅ | ❌ | HR Manager แต่ excluded จาก payroll |
| ดำ | `sayan` | hr_admin | ✅ | ❌ | grant payroll ภายหลังถ้าต้องการ |
| จิม | `thanawatana` | hr_admin | ✅ | ❌ | grant payroll ภายหลังถ้าต้องการ |
| บัญชี | (TBD) | manager | ❌ | (will be true) | สร้าง + apply payroll_manager preset ผ่าน editor §3.3 |

**Test data:**
- 54 active employees · 53 มี leave balance bereavement seeded
- 0 contracts uploaded · 0 salary slips uploaded — รอ HR + บัญชี

---

## 5. Git + deploy state

- **Repo:** `caserebel-maker/EBCI-Nexus`
- **Last commit:** `a0a8347` (permission-driven sidebar menu)
- **Vercel deploy:** auto — `https://nexus.ebcitrade.com`
- **Build:** ✓ TS clean (0 errors after npm install · 8 "pre-existing" turned out to be stale node_modules)

**Push pattern:** `git push origin HEAD:main`

---

## 6. DB state ปัจจุบัน

- **Employees:** 54 active · 1 inactive
- **Migrations applied today (Apr 27 home):**
  - `create_user_permission_audit_log` (new — for §3.2 editor)
- **All migrations applied this week:** 8+
- **Storage buckets:** `employee-contracts` + `salary-slips` + `applicant-documents` + `applicant-photos`
- **Permission flags:** 8 (รวม `can_view_audit_log` ใหม่)
- **Presets:** 5 (super_admin / hr_manager / payroll_manager / executive / employee)

---

## 7. Build + types state

- **Routes:** ~112 (+2 จาก §3.2 + audit — `/hradmin/settings/permissions` + `/hradmin/settings/audit`)
- **TypeScript:** clean (0 errors · all 8 historic "pre-existing" errors were stale node_modules — fixed by `npm install`)
- **Build:** ✓ Compiled

---

## 8. Quirks ของ session นี้

1. **`can_view_audit_log` was orphaned** — DB column existed (added by an older migration) but TS type, presets, and getCurrentPermissions() didn't read it. Fixed in commit 1 — now properly modeled in 8-flag UserPermissions.
2. **Permission editor uses portal modal** — same pattern as AdjustBalanceModal · escape-to-close · body-scroll lock · self-edit warning
3. **Audit insert is best-effort** — if audit fails AFTER User UPDATE landed we still report success. The flag state is the authoritative truth; an audit gap is recoverable, a partial UPDATE is not.
4. **No-op detection** — re-saving identical flag set skips both UPDATE + audit insert so re-saves don't pollute history.
5. **Print 2-col fix is `print:` Tailwind variant** — Tailwind compiles to `@media print` rule. Doesn't affect `md:` breakpoint behaviour, just adds an extra rule that wins under print conditions.

---

## 9. SESSION_HISTORY.md

→ Append §16 entry (ดูใน `docs/SESSION_HISTORY.md`)

---

*Generated APR28 dawn (overnight session ตามมาจาก APR27 night) · 9 commits + 1 DB seed · §3.1 + §3.2 + §3.3 + §3.5 ✅ · Last commit `a0a8347` · routes ~112*
*Next session at ออฟฟิศ 7 โมง: §3.4 — login `wiyada/0000` แล้ว test bulk upload e2e.*

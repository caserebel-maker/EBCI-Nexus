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

**ทำก่อน (1 นาที):** เปิด `/hradmin/settings/permissions` (ใหม่!) แล้วลอง grant `can_manage_payroll` ให้ใครก็ได้ → verify audit log โผล่ใน modal · ตรวจ §3.1 (logout/login → ดูการ์ดสลิปเงินเดือน) ในขั้นเดียวกัน.

---

## 0. TL;DR ใน 30 วินาที

**APR27 home night ปิด 7 commits (ขยาย 4 → 7 ใน night-late session):**

1. **§3.2 ✅ Permission editor** ที่ `/hradmin/settings/permissions`
2. **§3.5 ✅ Print PDF fix** — `print:grid-cols-2` บังคับ 2-col
3. **🆕 Audit viewer + employee audit wiring** — `/hradmin/settings/audit` (2 tabs) + `updateEmployee` เขียน audit log อัตโนมัติแล้ว
4. **Pre-existing TS errors ✅** — 8 errors หายหมดหลัง `npm install` (stale node_modules ตามไม่ทัน package.json ใหม่)

**§3.1 ✅** — laptop session คืนก่อน (admin User.id realign)

**ที่เร่งด่วนที่สุดถัดไป:** **§3.3 สร้าง user account ให้บัญชี** (~5-10 นาที — ใช้ editor ใหม่ apply preset `payroll_manager`).

---

## 1. Commits ของ session นี้

| # | Commit | Track | สรุป |
|---|---|---|---|
| 7 | `b830ffa` | 📜 Audit | viewer ที่ /hradmin/settings/audit + nav link + 2 tabs (perm/employee) |
| 6 | `449a8f7` | 📜 Audit | wire updateEmployee → employee_audit_log + canViewAuditLog AuthCheck |
| 5 | `3796dd1` | 📚 Docs | refresh NEXT + §16 SESSION_HISTORY |
| 4 | `57c2893` | 🖨️ Print | 2-col grids บน print → personal+address ไม่ตก page 2 |
| 3 | `9eccbd0` | ⚙️ Settings | link to permissions editor from /hradmin/settings |
| 2 | `170d60f` | 🔐 Permissions | editor ที่ /hradmin/settings/permissions (page + view + actions) |
| 1 | `123c290` | 🔐 Permissions | foundation — can_view_audit_log flag + user_permission_audit_log table + PERMISSION_FLAGS list |

(7 ต่อจาก `336f211` ที่เป็น admin User.id realign จาก laptop คืนก่อน)

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

### 3.3 ⭐ **สร้าง user account ให้บัญชี** — 5-10 นาที (now unblocked!)

ตอนนี้ editor พร้อมแล้ว:
1. ปอนด์ login → `/hradmin/settings/permissions` (link จาก `/hradmin/settings`)
2. (ก่อนหน้านั้น) สร้าง user "บัญชี" ผ่าน flow ปกติ (ใครจะเป็นยังไม่ได้คุย)
3. หา user ใน table → กด "แก้ไข"
4. คลิก preset **💰 Payroll Manager** → ทุก checkbox ติ๊ก auto
5. ใส่ note "มอบอำนาจ payroll ให้บัญชี" → กด "บันทึก"
6. Verify modal โชว์ history entry ใหม่
7. ส่ง credentials ให้ทีมบัญชี
8. ทดสอบเข้า `/hradmin/payroll/bulk` แล้ว upload PDF จริง

### 3.4 **Test bulk salary slip upload e2e** — 20 นาที

ทดสอบ flow จริง:
1. ออกสลิป test 3-5 ไฟล์ (PDF dummy ก็ได้)
2. ตั้งชื่อตาม pattern: `Slip_060-01_2026-04.pdf` ฯลฯ
3. Upload ที่ `/hradmin/payroll/bulk` · เลือก เม.ย. 2569
4. ตรวจ preview → matched ครบไหม
5. ยืนยัน → ดู email + 🔔 ใน account พนักงาน

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
- **Last commit:** `b830ffa` (audit viewer + nav link)
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

*Generated end of APR27 home-night session · 7 commits shipped · §3.2 + §3.5 + audit pipeline ✅ · Last commit `b830ffa` · routes ~112*
*Next session: §3.3 (สร้าง user account บัญชี) — apply Payroll Manager preset ผ่าน editor ใหม่.*

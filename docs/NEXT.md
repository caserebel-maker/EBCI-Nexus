# 📌 NEXT — เริ่มงานต่อที่นี่

> **ไฟล์นี้คือ single point of entry** สำหรับ session ถัดไป — ไม่ว่าจะเปิดที่เครื่องไหน
> พิมพ์ประโยคเดียวในช่อง Claude แล้วทำงานได้ทันที.

---

## 🔁 ที่เครื่องถัดไป — **Home Mac · เย็น 3 พ.ค. (~21:00 หลังถึงบ้าน)**

> **อ่านเฉพาะตอนเปิด Claude Code ที่ home Mac**

**Step 1 — Pull ก่อน:**
```bash
cd ~/C1TB/EB-CI/EBCI-Nexus && git pull origin main --ff-only
```

**Step 2 — พิมพ์บอก Claude:**
```
อ่าน docs/NEXT.md แล้วทำต่อ — อยู่ home. session laptop เพิ่งจบไป 19:38
ส่ง QUESTIONS_FOR_MOD.md ไปแล้ว (commit 97ec199) รอ ม๊อด ตอบ.
ระหว่างรอให้ทำงานที่ไม่ blocked: §3.4 bulk salary slip e2e test (~20 นาที)
หรือ verify §1.3 + §1.4 + §3.16p2 บน prod (เปิด /portal/checkin / /portal/leave/inbox / /hradmin/attendance/reconcile)
```

**Step 3 — ตอบ Claude:** "อยู่ home"

**📌 Beta status ตอนนี้: ~89% complete**
- ✅ Code ship แล้ว 15/17 items ใน BETA_FEEDBACK
- 🚧 รอ ม๊อด ตอบ 12 คำถามใน `docs/QUESTIONS_FOR_MOD.md`
- 🔧 Tuesday office task: HIP webhook config (เลื่อนไปทำที่ office จริง)

**📅 Reminder:** มี GCal event + Claude scheduled-task รออยู่ พร้อม prompt ด้านบน

**ล่าสุดเสร็จ (laptop · 3 พ.ค. afternoon-evening):**
- `97ec199` — `docs/QUESTIONS_FOR_MOD.md` 12 คำถามจัด priority + multiple choice — ส่งให้ ม๊อด unblock backlog

**ก่อนหน้านั้น (laptop · APR30 afternoon):**
- `cc84d12` — §1.4 cancel/withdraw approved leave w/ approver sign-off
- `66be09f` — §1.3 leave-day check-in suppression + ลา in reconcile
- `fd2ef5f` — §2.5 remember-me 30-day signed session
- `96a4fb6` — §3.14 XSS sweep + harden notification action_url

---

## 🎯 ประโยคพื้นฐาน (ไม่มี context พิเศษ)

```
อ่าน docs/NEXT.md แล้วทำต่อ
```

**ก่อนลุย:** `cd <office-path>/EBCI-Nexus && git pull origin main --ff-only`

**ตอบเครื่อง:** "อยู่ office"

**ทำก่อนทุกอย่าง (3 นาที verify):**
1. Logout → login **`suchat@ebcitrade.com / EbciTest2026!`** (ชาติ — บัญชี/payroll manager)
2. ดู sidebar — ควรเห็นเมนูพนักงานปกติ + **"💰 อัปโหลดสลิปเงินเดือน"** (Wallet icon) ที่เป็นลิ้งก์ไป /hradmin/payroll/bulk
3. Click → ต้อง land หน้า bulk upload โดยไม่โดน redirect
4. ลองพิมพ์ `/hradmin/employees` ตรงๆ → ควรโดน redirect (ชาติไม่มีสิทธิ์ HR ปกติ)
5. กลับ login เป็น admin (ปอนด์/ม๊อด) — sidebar ของ admin ก็จะมี "อัปโหลดสลิปเงินเดือน" เพิ่มขึ้น (เพราะ flag = true)

⚠️ **ปุ๋ย (wiyada) ถูก revoke `can_manage_payroll` แล้วเมื่อ 28 เม.ย. 11:29** — เธอ login ได้แต่ **จะไม่เห็น** เมนูสลิปเงินเดือน. ผู้ใช้คนเดียวที่เห็น/อัปโหลดสลิปได้คือ **ชาติ**.

---

## 0. TL;DR ใน 30 วินาที

**🔥 APR30 office afternoon — 4 commits (เพิ่งจบ):**

1. **§3.14 XSS sweep + harden `action_url`** (`96a4fb6`) — added `src/lib/safe-url.ts` (`isInternalPath`/`toInternalPath`) and gated every action_url that ends up in a notification to internal-only paths. Email image URLs validated. 1 hardcoded `dangerouslySetInnerHTML`, 0 `.innerHTML` mutations — codebase already clean.

2. **§2.5 Remember-me 30 วัน** (`fd2ef5f`) — login form มี checkbox "จำฉันไว้ในเครื่องนี้ (30 วัน)" default true. Backend ส่งค่าผ่าน `rememberMe` flag → session cookie expiresInSeconds = 30 วัน vs 7 วันปกติ.

3. **§1.4 Cancel/withdraw approved leave** (`cc84d12`) — pending → ใช้ปุ่ม "ยกเลิก" ตรงๆ; approved → "ส่งคำขอยกเลิก" → approver กด อนุมัติ/ปฏิเสธ. Refund balance เฉพาะกรณี `start_date >= today`. Inbox สลับ title/body/placeholder ตาม `item.status`. DB: 3 columns ใหม่บน `leave_requests`. APIs: `/request-cancellation` + `/cancellation-decision`.

4. **§1.3 Leave-day check-in suppression** (`66be09f`) — `/portal/checkin` แสดง "วันนี้คุณลาอยู่" แทน CTA ถ้ามีใบลา approved เต็มวัน. Server action ก็บล็อกซ้ำเป็น defense-in-depth. Half-day + pending แสดง banner เฉยๆ ไม่ block. HR `/hradmin/attendance/reconcile` มี status `on_leave` ใหม่ที่กิน `absent` → ไม่นับวันลาเป็น "ขาด" อีกต่อไป (พ่นชื่อประเภทจริง เช่น "ลาป่วย" ใน badge).

**🔥 APR30 office morning — 5 commits (รอบก่อน):**

1. **ValidationToast** (`61d8d80`) + **leave form validate-on-click** (`93fc519`) — fixes ปุ๊'s "Error" report on submit. Silent-disable → validate-on-click + centred maroon toast + red-border highlight + scroll/focus to first errored field. errorFields cleared as user types. Same form serves พักร้อน, so single fix covers both flows.

2. **Leave categories expansion to 11 + dropdown picker** (`efc8be8`) — added 5 new types per ม๊อด's list: ลาทำหมัน · ลาคลอด · ลารับราชการทหาร · ลาเกณฑ์ทหาร · ลาอุปสมบท. Renamed `marriage` → ลาสมรส. Added `gender_restriction` column so a male never sees ลาคลอด in the dropdown and a female never sees ลาเกณฑ์ทหาร / ลาอุปสมบท. Step1 grid → native `<select>` with "name · เหลือ X / Y วัน" inline. Yellow detail card below shows icon/balance/requirements for picked type.

3. **Modal sweep** (`a162b92`) — every popup in the app now uses `rgba(86,30,35,0.77)` (brand maroon, -20% opacity from previous near-black) and is **always centred** on mobile (was bottom-sheet). Touched 11 files: leave (new+cancel+inbox+policies+calendar), announcements (portal+hradmin), dashboard, meeting-room, careers, permissions, priority-alerts.

4. **Docs refresh** (`342ef8b`) — recorded morning fixes in NEXT.md.

**🔥 APR29 office afternoon — 8 commits + 4-tester DB recovery:**

1. **Supabase RLS advisor critical fix** — drop 9 policies ที่ใช้ `auth.jwt() -> user_metadata` (user-editable → bypass-able), retarget เหลือ 13 policies เป็น `TO anon, authenticated`. 0 public-role policies, 0 user_metadata refs เหลือใน pg_policies. Commit `f217337`.

2. **Meeting room booking system** — `/portal/meeting-room` Phase 1 (DB table + GiST exclusion + form) + Phase 2 (calendar badge + HR mirror). Phase 1 `ec701ee`, Phase 2 `9931003`. Build fix `522c313` (constants ออกจาก `'use server'` module). Mobile More entry `2b212fc`.

3. **Dashboard quick menu refactor** — รวม "ยื่นใบลา" + "ดูสถานะลา" → "การลา" และเพิ่ม "จองห้องประชุม". Commit `c553249`.

4. **§3.16 priority 1 done — Approval chain audit** — `/hradmin/leave/approval-audit` แสดง resolved approver chain ทุก active employee + flag 8 issue codes (NO_APPROVER, OVERRIDE_NOT_APPROVER, MANAGER_REPORTS_MISMATCH, ฯลฯ). Spot check: 9 NO_LINK_AT_ALL + 3 mismatch ใน 45 active. Commit `40f42ac`.

5. **Gender on hire + portal profile** — new-employee form มีช่องเพศ (auto-sync จากคำนำหน้า) + portal profile แสดง คำนำหน้า/เพศ/วันเกิด. Commit `64e4c4e`.

6. **🚨 Beta meeting incident — 4 testers login ไม่ได้** — ต่าย/ปุ๋ย/เบน/หนิง มี `employees.user_id` ชี้ไป auth.users.id ที่ไม่มีอยู่ (orphaned same pattern as ปอนด์ Apr 27 / มด Apr 29). แก้: cleanup auth.identities + auth.users (ผ่าน Supabase SQL Editor) → create auth ใหม่ → relink employees → UPDATE User.id. ตอนนี้ทั้ง 8 tester พร้อม login `EbciBeta2026!`.

**Plus จาก Codex (รวม push เดียว):**
- `a70f303` — sign nexus session cookie (HMAC SHA-256, 7-day exp, signed signature verify ใน middleware + getSession)
- `558c98b` — harden leave attachment uploads
- `4da85a6` — fix payroll manager nav: สุชาติยังเป็น employee ปกติ แต่เห็นเมนู "อัปโหลดสลิปเงินเดือน" เพิ่มเฉพาะคนมี `can_manage_payroll`; ไม่มีปุ่มสลับ HR Admin และ mobile nav ไม่หลุดเป็นเมนู HR

**APR29 laptop morning + evening (รอบก่อน):**
มด's User.id realign · payroll manager = ชาติ · user-menu opacity · middleware whitelist · profile leave balances · mobile More menu · org chart · shell overflow lock.

**APR28 office (รอบก่อน):**
Sidebar polish · password change UI · WFH days · permissions list · email audit · calendar contrast · checkin toast · 🆕 backup ZIP.

**APR27→28 home overnight (รอบก่อน):**
§3.2 ✅ Permission editor · §3.5 ✅ Print flat · §3.5b ✅ Audit · §3.3 ✅ ปุ๋ย · permission-driven menu.

**ที่เร่งด่วนที่สุดถัดไป:** **§3.16 priority 2 — Half-day + hourly leave rules** + ตามให้มดดู `/hradmin/leave/approval-audit` แล้วเซต approver ของพนักงานที่ flag เป็น critical.

**⚠️ Lessons learned วันนี้:**
- **MUST verify login ก่อนส่ง credentials list** — เคย credentials list ใน NEXT.md เก่าแต่ 4 testers จริงๆ login ไม่ได้ (orphaned auth) → user เสียหน้าในที่ประชุม. health-check SQL ใน §11 ของ NEXT.md ใหม่นี้ — รันก่อนทุกครั้งที่จะส่ง credentials.
- **`'use server'` module ห้าม export non-async** (consts/types) — Next.js 16 strip ทั้ง module → "no exports at all" error. ต้องแยกไป `constants.ts`. แก้ใน commit `522c313`.

---

## 1. Commits ของ session นี้ (APR30 evening home — office check-in solution Phase 1)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 3 | `1108af6` | 🪝 Webhook | `POST /api/webhooks/card-scan` — HMAC + shared-secret auth, idempotent on (employee_id, scan_time), batch ≤500, GET probe |
| 2 | `2862fd1` | 📅 Checkin | §3.1 Phase 1A — smart suppression: scan วันนี้ → ซ่อน CTA แสดง "บัตร scan แล้ว XX:XX" + escape "ฉันยังไม่ได้ทาบบัตร" |
| 1 | `a27c3b1` | 🐛 FK | `leave_balances.last_adjusted_by` เขียน User.id (ไม่ใช่ employees.id) — fix 5 writes + 1 read; sweep ทุก FK→User.id ผ่านหมด |

## 1a. Commits ของ session ก่อน (APR30 office afternoon — beta unblocked items)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 4 | `66be09f` | 📅 Attendance | §1.3 leave-day check-in suppression + ลา in reconcile dashboard |
| 3 | `cc84d12` | 🌴 Leave | §1.4 cancel/withdraw approved leave w/ approver sign-off |
| 2 | `fd2ef5f` | 🔐 Auth | §2.5 remember-me 30-day signed session |
| 1 | `96a4fb6` | 🛡️ Security | §3.14 XSS sweep + harden notification action_url |

## 1b. Commits ของ session ก่อน (APR30 office morning)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 5 | `a162b92` | 🎨 Modals | sweep — soften maroon panel + always-centered on mobile (11 files) |
| 4 | `efc8be8` | 🌴 Leave | expand to 11 categories + native dropdown picker + gender filter |
| 3 | `342ef8b` | 📚 Docs | record APR30 validation UX fix |
| 2 | `93fc519` | 🐛 Leave UX | validate-on-click + red borders + ValidationToast wired into leave form |
| 1 | `61d8d80` | 🆕 UI | ValidationToast component (centred, 3s, hover-pause, X close) |

## 1b. Commits ของ session ก่อน (APR29 office afternoon + Codex catch-up)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 13 | `9c735f4` | 📚 Docs | add `docs/BETA_FEEDBACK.md` (270 บรรทัด · §1 P0 ทั้ง 5 ข้อ) *(Codex)* |
| 12 | `b1b3329` | 📚 Docs | update office handoff for payroll menu follow-up *(Codex)* |
| 11 | `4da85a6` | 🔧 Payroll | nav fix — สุชาติเห็นเมนูสลิปไม่มีปุ่มสลับ HR + mobile nav ไม่หลุด *(Codex)* |
| 10 | `64e4c4e` | 👤 Profile | gender required ตอนสร้างพนักงาน + แสดงบน /portal/profile |
| 9 | `40f42ac` | 🩺 Audit | `/hradmin/leave/approval-audit` (§3.16 priority 1) |
| 8 | `558c98b` | 🔐 Security | harden leave attachment uploads *(Codex)* |
| 7 | `a70f303` | 🔐 Security | sign nexus session cookie (HMAC SHA-256, 7-day) *(Codex)* |
| 6 | `2b212fc` | 📱 Nav | จองห้องประชุม ใน mobile More panel (3 roles) |
| 5 | `522c313` | 🔧 Fix | constants ออกจาก `'use server'` module — Vercel build pass |
| 4 | `c553249` | 🏠 Dashboard | quick menu: รวม ยื่นใบลา+ดูสถานะลา + เพิ่ม จองห้องประชุม |
| 3 | `9931003` | 🚪 Meeting room | Phase 2 — calendar badge + HR mirror page |
| 2 | `ec701ee` | 🚪 Meeting room | Phase 1 — DB table + GiST exclusion + form |
| 1 | `f217337` | 🔐 RLS | drop user_metadata-based policies, retarget public→authenticated |

**+ DB-only (ไม่ commit, อยู่ใน §19 SESSION_HISTORY ที่จะ append คืนนี้/พรุ่งนี้):**
- Cleanup orphaned `auth.identities` + `auth.users` ของ ต่าย/ปุ๋ย/เบน/หนิง
- Create auth.users ใหม่ + relink `employees.user_id` + UPDATE `User.id` ให้ตรงกับ auth_id ใหม่
- Reset password ทั้ง 8 testers เป็น `EbciBeta2026!`

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

### 3.3 ✅ ~~Payroll manager assignment~~ — DONE (Apr 28 → corrected Apr 29 morning)

**Final state:** **ชาติ (suchat@ebcitrade.com)** is the sole payroll manager.

- ชาติ: `role=employee` · `can_manage_payroll=true` · created Apr 28 01:32 with payroll_manager preset
- ปุ๋ย (wiyada): `role=employee` · `can_manage_payroll=false` · revoked Apr 28 11:29 via permission editor
  - User row + auth still exist (she's a regular employee — แผนกบัญชี · หัวหน้าแผนก) just without the payroll flag.

**History gotcha:** an earlier assumption baked into prior NEXT.md versions had ปุ๋ย as the payroll manager. A migration `20260429_grant_wiyada_payroll_manager_preset.sql` auto-applied that assumption during the Apr 29 morning sweep — the user reverted via the in-app editor and that migration file was deleted so future replays don't undo the revoke. Audit log on `/hradmin/settings/audit` shows the full back-and-forth.

🎯 **ทำต่อ §3.4** เพื่อ verify upload e2e

### 3.4 ⭐ **Test bulk salary slip upload e2e** — 20 นาที (เร่งด่วนสุดแล้ว)

ทดสอบ flow จริง:
1. Login `suchat@ebcitrade.com / EbciTest2026!` → sidebar เห็น "อัปโหลดสลิปเงินเดือน"
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

### 3.5c ✅ Beta fix: leave attachment upload + sick certificate rule — DONE Apr 29 Codex

User beta feedback: ปุ๊แนบใบรับรองแพทย์แล้ว error; พักร้อนแนบไฟล์ก็ error. Also clarified company policy: **ลาป่วยตั้งแต่ 3 วันขึ้นไปต้องแนบใบรับรองแพทย์; ไม่เกิน 2 วันไม่ต้องแนบ**.

Code changes:
- `src/lib/leave-validations.ts`
  - added `requiresLeaveAttachment()` and `leaveAttachmentDescription()`
  - sick leave requires attachment only when `totalDays >= 3`
  - other leave types still follow `leave_types.requires_attachment`
- `src/app/portal/leave/my-leave-view.tsx`
  - Step 1/3 copy now explains sick certificate threshold
  - submit button only requires file when the selected leave + day count requires it
  - accepts PDF/JPG/PNG/WEBP/HEIC/HEIF and client-checks 5MB limit before submit
- `src/app/api/leave/submit/route.ts`
  - accepts iPhone/phone-ish uploads: HEIC/HEIF + `application/octet-stream` when extension is allowed
  - uploads via `attachment.arrayBuffer()` for server-side Supabase reliability
  - if upload/sign-url/metadata update fails, rolls back the inserted leave request + uploaded blob and returns a clear error instead of leaving a pending leave with missing attachment

Verified:
- Supabase bucket `leave-attachments` exists and smoke upload/sign/remove works
- `npx eslint src/app/api/leave/submit/route.ts src/lib/leave-validations.ts src/app/portal/leave/my-leave-view.tsx` ✅
- `npx tsc --noEmit` ✅
- `npm run build` ✅

Need beta retest:
1. ลาป่วย 1-2 วัน without attachment → should submit if other rules pass
2. ลาป่วย 3+ วัน without attachment → blocked with medical certificate message
3. ลาป่วย 3+ วัน with PDF/JPG/HEIC → should submit + file link visible in detail/inbox
4. พักร้อน with optional PDF/JPG/HEIC → should submit, and if upload fails user gets explicit error and no orphan pending leave

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

### 3.14 🔐 Security #9 — XSS audit (sweep `dangerouslySetInnerHTML`, untrusted-input render paths)

**Why:** beta jammed in 7 real users + future rollout to ~54. ก่อนเปิดให้ใช้ครบบริษัท ควรตรวจ:
- ทุก `dangerouslySetInnerHTML` usage — ใช้ที่ไหนบ้าง, ข้อมูลมาจาก trusted source หรือไม่
- User-generated content (announcement content, leave reason, review notes, contract notes, applicant cover letter) — render เป็น text-only ได้ทุกที่หรือเปล่า
- Email HTML templates — มี user-input ฝัง raw หรือไม่
- Markdown rendering (ถ้ามี) — ใช้ DOMPurify / sanitize-html ก่อน
- URL ที่ render จาก DB (action_url ใน notifications, attachment URLs) — มี protocol whitelist หรือไม่ (block `javascript:`, `data:` ที่ไม่ปลอดภัย)

**Action items:**
- `grep -rn "dangerouslySetInnerHTML" src/` → list every site
- `grep -rn "innerHTML\s*=" src/` → ดู client-side direct assignments
- ตรวจ Resend HTML templates ว่ามี `${userInput}` ที่ไม่ผ่าน escape

Estimate: 1-2 hr (audit + fix obvious holes; DOMPurify ถ้าจำเป็น)

### 3.15 ✅ 🔐 Security #10 — Cookie hardening (`nexus_session` signed cookie)

**DONE Apr 29 Codex session.** `nexus_session` เดิมเป็น JSON ธรรมดาและ `getSession()`/middleware เชื่อ `role` จาก cookie โดยตรง. ตอนนี้เปลี่ยนเป็น signed HMAC cookie แล้ว:

- เพิ่ม `src/lib/session-cookie.ts` เป็น single helper: `createSessionCookie()` + `verifySessionCookie()`
- Cookie format: `v1.<base64url-json-payload>.<base64url-hmac-sha256>`
- Payload มี `exp` 7 วัน และ verify หมดอายุทุกครั้ง
- Secret resolution: `NEXUS_SESSION_SECRET` → `SESSION_COOKIE_SECRET` → fallback `SUPABASE_SERVICE_ROLE_KEY`
- `getSession()` และ middleware verify signature ก่อนคืน session/role
- Invalid/tampered cookie จะ redirect `/login` และ middleware delete cookie
- Login redirect ถูก sanitize ให้รับเฉพาะ internal path ที่ขึ้นต้น `/` และไม่ใช่ `//`
- หน้าที่เคย `JSON.parse(sessionCookie.value)` ถูกเปลี่ยนมาใช้ `getSession()` แล้ว
- Logout ใช้ `SESSION_COOKIE_NAME` constant ร่วมกัน

**ควรทำต่อ:** set `NEXUS_SESSION_SECRET` ใน Vercel เป็น random 32+ bytes เพื่อไม่ต้อง fallback ไปใช้ service role key ระยะยาว.

**Current cookie config:**
- `httpOnly: true` ✅
- `secure: process.env.NODE_ENV === 'production'` ✅
- `maxAge: 60*60*24*7` (7 วัน) — หมดอายุพอเหมาะ
- `sameSite: 'lax'` ✅
- `path: '/'` ✅

**Remaining hardening ideas:**
1. Session revocation table / token version — invalidate old signed cookie after password change or manual admin revoke
2. CSP header — `Content-Security-Policy` middleware ที่ block inline scripts (ต้องถอด debug script ใน `src/app/layout.tsx` ก่อน)

Verify this session:
- `npx tsc --noEmit` ✅
- `npm run build` ✅ (ยังมี warning เดิม: Next 16 ไม่รองรับ `eslint` key ใน `next.config.ts`, และ `middleware` convention deprecated → proxy)

### 3.17 ⭐ §3.1 BETA Office check-in solution — Phase 1 ✅ shipped, Tuesday confirms Phase 2 path

**Done APR30 evening (commits `2862fd1` + `1108af6`):**
- **Phase 1A — Smart suppression** (`/portal/checkin`): ตรวจ `card_scans` วันนี้ของพนักงานคนนั้น → ถ้ามี → ซ่อน CTA แสดง "บัตรของคุณ scan แล้ว XX:XX น." + ปุ่ม "ฉันยังไม่ได้ทาบบัตร" สำหรับ override (กรณี lookup ผิด). Works for both batch CSV import (current) AND realtime webhook (future) — same source of truth.
- **Phase 1B — Webhook endpoint** (`/api/webhooks/card-scan`): พร้อมรับทั้ง HIP push (ถ้า device รองรับ) และ Python agent push (Option B fallback) — endpoint shape เดียวกัน, ไม่เสียงานไม่ว่าผลของ Tuesday จะเป็นทางไหน. Auth dual: `X-Webhook-Secret` (constant-time) หรือ `X-Webhook-Signature: sha256=<hmac>`. Idempotent on `(employee_id, scan_time)`.

**Tuesday office task (decision point):**
1. เปิด HIP Ci100S admin panel ที่ `http://192.168.1.40` หา section Webhook/Push URL/Event notification/Cloud sync
2. **ถ้ามี → Option A:**
   - `openssl rand -hex 32` → set Vercel env `CARD_SCAN_WEBHOOK_SECRET`
   - HIP config: URL `https://nexus.ebcitrade.com/api/webhooks/card-scan` + header `X-Webhook-Secret: <secret>`
   - ทาบบัตรจริง 1 ครั้ง → ดู Vercel logs ว่ามี `inserted` + `/portal/checkin` ของคนนั้นเปลี่ยนเป็น banner ภายในไม่กี่วิ
3. **ถ้าไม่มี → Option B:**
   - เขียน Python agent (~50 บรรทัด) บน office Mac mini: poll HIP TCP port 5005 ทุก 30 วิ → แปลงเป็น JSON → POST ไปยัง webhook ตัวเดียวกัน
   - Agent run via `launchd` plist
   - เซ็ต env `CARD_SCAN_WEBHOOK_SECRET` ที่ทั้ง Vercel + agent

**ไม่ว่าทางไหน — Phase 1A suppression banner ทำงานทันทีหลัง webhook ยิงเข้ามา** (อ่าน `card_scans` ตรงๆ ไม่ต้องรอ reconcile cron).

### 3.16 ⭐ Beta leave/attendance policy backlog — do one at a time

Feedback captured Apr 29 after beta:

**Priority order recommended:**
1. ✅ **DONE Apr 29 office afternoon** (`40f42ac`) — `/hradmin/leave/approval-audit`. Spot check: 9 NO_LINK_AT_ALL (1 ประธาน + 6 ที่ปรึกษา ที่ถูกต้อง + ชาติ + วสันต์ ที่ต้องเซต) + 3 mismatch ใน 45 active. **มดเปิดดู → ตามแก้คนที่ critical.**
2. **Half-day + hourly leave rules** — clarify behavior:
   - ครึ่งวันเช้า: counts 0.5 day, should not require morning check-in; afternoon work/check-in logic needs policy
   - ครึ่งวันบ่าย: counts 0.5 day, morning check-in can still count
   - ลาไม่เต็มวัน/hourly: decide minimum increment, especially personal leave
3. **Attendance integration** — approved leave should exempt check-in/absent marking. Pending leave should not.
4. **Comp day / holiday swap** — people working on holidays should get compensatory day-off balance, not file a normal leave request.
5. **Policy center** — readable policy pages in-app (`/portal/policies` + HR editor later), plus contextual snippets in leave form.
6. **Benefit wallet** — welfare balances for employee + children: used/remaining, claims history. New module; do after leave/attendance stabilizes.
7. **Attendance reward streak** — 3/6/9/12 month no leave/no absent/no late progress bar on profile. Good idea, but only after late/absent logic is trusted.
8. **Draft leave form** — autosave draft, resume later.
9. **Cancel approved leave** — pending can cancel directly; approved should become a cancellation request/HR-approved reversal.
10. **Password memory** — don't store/remember passwords in-app. Improve forgot-password, consider OTP/passkey/Telegram later.
11. **Office check-in direction** — don't remove office check-in yet. Consider simplifying later after WFH/Telegram workflow is proven.

Email notification note from beta:
- User prefers: **approve first, then notify** to avoid spam. Review submit/approval email policy before rollout. Current submit route still sends email to employee + approver on submission; consider moving some notices to in-app only until final approval.

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
NEXUS_SESSION_SECRET   # signed session cookie (32+ bytes random)

# 🆕 ต้อง set ตอน Tuesday office visit (ก่อนเปิด HIP webhook):
CARD_SCAN_WEBHOOK_SECRET   # gen ผ่าน `openssl rand -hex 32` — ใส่ที่ Vercel + เป็น header X-Webhook-Secret ที่ HIP/agent ใช้ POST
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
- **Last commit:** `1108af6` (`POST /api/webhooks/card-scan` — HMAC + shared-secret auth)
- **Vercel deploy:** auto — `https://nexus.ebcitrade.com`
- **Build:** ✓ TS clean (`tsc --noEmit` 0 errors บนไฟล์ที่แตะใน Phase 1A + 1B)

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

→ §19 ของ APR28 office จะ append หลัง · §20 APR29 morning จะ append หลัง · §21 APR29 office afternoon จะ append คืนนี้/พรุ่งนี้

---

## 10. Quirks ของ APR29 office afternoon

1. **`'use server'` strict export rule** — Next.js 16 ห้าม export อะไรนอกจาก async function. Export const/interface แม้แต่ตัวเดียว → strip module ทั้งก้อน → "no exports at all" build error. แยกไป `constants.ts` คู่กัน. ดู commit `522c313`.
2. **Supabase MCP transient outage** — `net::ERR_FAILED` ทุก execute_sql ประมาณ 30 นาทีระหว่างพยายาม fix 4-tester orphaned auth. แก้ workaround ด้วย Supabase SQL Editor ผ่าน dashboard.
3. **Auth.users orphaned vs `users` filter** — `GET /auth/v1/admin/users?filter=email.eq.X` คืน `users:[]` เงียบๆ แต่ `POST /admin/users` กลับ "Database error checking email" 500 — เพราะ `auth.identities` ยังมี row ค้าง provider_id เดิม. fix: DELETE จาก auth.identities ก่อน auth.users (FK บังคับ order).
4. **GiST exclusion + tstzrange** — `EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (cancelled_at IS NULL)` ต้อง `CREATE EXTENSION btree_gist` ก่อน เพราะ `=` operator on text ต้องการ index opclass ที่รวม btree + gist.
5. **Approval audit reuses `resolveLeaveApprover` logic exactly** — ไม่ใช่ปรับ logic แต่ port มาเป็น in-memory walk เพื่อ avoid N+1 (45 employees × ~3 hops = ~135 DB calls → 1 call). ผลลัพธ์ตรงกับ submit-time ที่ใช้ `src/lib/leave-approval.ts`.

---

## 11. 🩺 Health-check SQL — รัน **ก่อน** ส่ง credentials list ทุกครั้ง

**Lessons learned APR29 (เสียหน้าในที่ประชุม):** 4 testers ที่อยู่ใน credentials list login ไม่ได้เพราะ `employees.user_id` orphaned จาก auth.users. ก่อนส่ง list **ต้องรัน:**

```sql
-- รันใน Supabase SQL Editor (project cluirxjykhchthcpgosz)
-- แทน [emails] ด้วยรายการ tester emails ที่จะส่ง credentials
SELECT
    e.email,
    e.first_name_th || ' ' || e.last_name_th AS name,
    CASE WHEN au.id IS NULL THEN '❌ NO AUTH' ELSE '✅' END as auth,
    CASE WHEN u.id IS NULL THEN '❌ NO USER ROW' ELSE '✅' END as user_row,
    u.role
FROM employees e
LEFT JOIN auth.users au ON au.id::text = e.user_id
LEFT JOIN "User" u ON u.id = e.user_id
WHERE e.email IN (
    'thanawatana@ebcitrade.com',  -- จิม
    'c.arthit@ebcitrade.com',     -- มด
    'suchat@ebcitrade.com',       -- ชาติ
    'kultmin1@gmail.com',         -- จอย
    'siriwan@ebcitrade.com',      -- ต่าย
    'ebci2006@ebcitrade.com',     -- ปุ๋ย (IT)
    'theben2536@gmail.com',       -- เบน
    'chanaporn@ebcitrade.com'     -- หนิง
)
ORDER BY e.email;
```

ถ้ามี ❌ ปุ่มไหน — **อย่าส่ง credentials** จนกว่าจะ fix ให้ครบ (recovery procedure ใน §11 ของ SESSION_HISTORY §21).

---

*Generated APR30 evening home · 3 commits (`a27c3b1` FK fix + `2862fd1` Phase 1A + `1108af6` Phase 1B) · routes +1 (`/api/webhooks/card-scan`)*
*Next session ที่ office อังคาร 5 พ.ค.: HIP Ci100S admin panel webhook check (decision Option A vs B) → set `CARD_SCAN_WEBHOOK_SECRET` → end-to-end test ทาบบัตรจริง.*

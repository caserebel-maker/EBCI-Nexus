# EBCI Nexus — Session History (รวมทั้งหมด)

> **ไฟล์นี้คือ archive ของ session handoffs ทั้งหมดตั้งแต่ 20 เม.ย. – 25 เม.ย. 2026**
> รวมจาก 9 ไฟล์ · เรียงตามวัน · ใช้สำหรับย้อนดู context เก่า
> ถ้าต้องการเริ่มงาน session ใหม่ → เปิด handoff ล่าสุดตาม TOC

---

## 📚 สารบัญ (Table of Contents)

| # | วัน/เวลา | ไฟล์เดิม | Scope |
|---|---|---|---|
| 1 | **20 เม.ย. (Evening)** | `SESSION_HANDOFF_APR20_EVENING.md` | Office afternoon — Card Import · Reports · Org Chart · Permission groundwork |
| 2 | **20 เม.ย. (Night)** | `SESSION_HANDOFF_APR20_NIGHT.md` | Home night → Office morning — Tabs shell · Phase 2 authority + my-chain |
| 3 | **21 เม.ย. (Summary)** | `SESSION_APR21_SUMMARY.md` | Organization module 3-tab implementation |
| 4 | **21 เม.ย. (Handoff)** | `SESSION_HANDOFF_APR21.md` | 20 commits — Announcements · Attendance · Careers Session A · Quota dashboard |
| 5 | **22 เม.ย.** | `SESSION_HANDOFF_APR22.md` | Careers Session B scope + Leave spec |
| 6 | **23 เม.ย.** | `SESSION_HANDOFF_APR23.md` | Careers Iter 2 (admin detail + evals) · Leave Phase 1/2 · Branding + email polish |
| 7 | **24 เม.ย. (Laptop night)** | `SESSION_HANDOFF_APR24.md` | Notification Center v1 · Topbar polish · DB FK fix |
| 8 | **25 เม.ย. (Office morning)** | `SESSION_HANDOFF_APR25.md` | Noti fixes · Leave Phase 3 Tab 1 (Overview) |
| 9 | **25 เม.ย. (Office → Home)** | `SESSION_HANDOFF_APR25_HOME.md` | Sidebar consolidation · Inbox fix · Badge · Role-correct inbox · Email sender split |
| 10 | **25 เม.ย. (Home night)** | (in this file, no separate handoff) | Leave Tab 4 Calendar · Careers ↔ Notification wiring (submit + status) |
| 11 | **25 เม.ย. (Home night, late)** | (in this file) | §3.1 verification finding — leave Phase 2 actually done Apr 23-24 (DB snapshot) · NEXT.md re-prioritized |
| 12 | **25 เม.ย. (Home night, very late)** | (in this file) | Permission-flag-based route auth sweep (4 commits, 26 sites) · Holidays table + Thai 2026 seed |
| 13 | **25 เม.ย. (Home, almost morning)** | (in this file) | Quick wins — lunar holidays · role-aware email URL · careers fan-out widening · explicit no-entitlement message |

---




<a id="section-1"></a>
# §1. SESSION_HANDOFF_APR20_EVENING.md

*Source: `SESSION_HANDOFF_APR20_EVENING.md` (root, 96 บรรทัด)*

---

# Session Handoff — EBCI Nexus (Afternoon → Evening)

**Date:** 2026-04-20 (Monday)
**Current machine:** Office Mac (`/Volumes/1TB-NVME/2026/FEB26-EBCI/EBCI-Nexus-App`)
**Branch:** `claude/priceless-heisenberg-55cb19` (pushes to `main`)
**Deployed URL:** https://ebci-nexus.vercel.app

---

## ✅ เสร็จแล้ววันนี้ (บ่าย)

### Features shipped
- **Card Import UI** (`/hradmin/attendance/import`) — upload CSV, preview, validate, bulk insert
- **Reports Page** (`/hradmin/reports`) — 3 tabs (attendance / leave / contracts) + CSV export
- **Org Chart** (`/portal/organization` + `/hradmin/organization`) — horizontal tree, L-connectors, ring colors per level
- **Mobile bottom nav reorg** — Home · Check-in · Notifications · Profile · More
- **Employee Levels** — 5 levels (removed HR; HR is now system role only)
- **UUID fix** — updateEmployee was using employee_code → UUID mismatch → silent failures
- **Leave approval** — HR discovered via `users.role='hr_admin'` instead of approval_level

### Migration applied to DB ✅
- `"User"` table: 6 permission columns (`can_view_all_employees`, `can_edit_employees`, `can_view_approval_limits`, `can_edit_approval_limits`, `can_approve_leave`, `can_manage_system`)
- Existing `role='hr_admin'` row → super_admin preset (all flags true)
- `employees` table: `is_approver`, `approval_scopes text[]`, `approval_limit_thb numeric(12,2)`
- New table `employee_audit_log` (without RLS — add later)
- `reports_to_id` **skipped** (spec column) — using existing `manager_id` instead

---

## 🚧 WIP — กลับบ้านไปทำต่อ

### Phase 1 ของ org-authority-spec.md (`/Volumes/1TB-NVME/OldDownEBCI/ebci-nexus-org-authority-spec.md`)

### Committed in this state (ยังไม่จบ)
- `src/lib/permissions.ts` — `UserPermissions`, `getCurrentPermissions()` (server), `canEditEmployee`, `limitToTier`, tier labels
- `src/lib/permission-presets.ts` — 4 presets (super_admin / executive / hr_manager / employee) + `detectPreset`
- `src/app/portal/organization/view-department.tsx` — renamed from `organization-view.tsx`, export changed to `DepartmentView`
- `src/app/portal/organization/view-people.tsx` — new, grouped-by-level avatar cards
- `page.tsx` (portal + hradmin) — restored header at page level (was in old view)

### ❌ ยังไม่ทำ
1. **Tab shell** — 3 tabs (`?view=structure` / `?view=authority` / `?view=my-chain`)
2. **Sub-toggle** ใน Tab 1 (มุมมองแผนก / มุมมองรายบุคคล)
3. **Tab 2 (อำนาจอนุมัติ)** — approvers grid + scope filter chips
4. **Tab 3 (สายอนุมัติของฉัน)** — chain flow for current user
5. **usePermissions hook** (client) — context + consumer
6. **API filter logic** — filter sensitive fields by permission
7. **Seed จิม + มด** User records with presets (spec section 4.2)
8. **Test scenarios** — spec section 10

---

## 🏠 ขั้นตอนเริ่มที่บ้าน (Home Mac mini)

```bash
cd ~/C1TB/2026/FEB26-EBCI/EBCI-Nexus-App
git fetch && git pull origin main
```

`view-people.tsx` ยังไม่ได้ใช้ใน page — ถูก import จาก tab shell (ที่ยังไม่ได้สร้าง)

### Next steps ลำดับ
1. สร้าง `src/app/portal/organization/tabs-shell.tsx` — client component with query param routing
2. สร้าง `tab-structure.tsx` (wraps DepartmentView + PeopleView with sub-toggle)
3. Stub `tab-authority.tsx` + `tab-my-chain.tsx` ("Coming soon")
4. Rewrite `page.tsx` (portal + hradmin) → render `<TabsShell>` ไม่ใช่ `<DepartmentView>` ตรงๆ
5. Seed จิม + มด (SQL UPDATE โดยหาด้วย email หรือ create new User rows)
6. Create `usePermissions` context provider
7. API: filter approval_limit_thb from GET /api/employees/[id] response

### Key files
- Spec: `/Volumes/1TB-NVME/OldDownEBCI/ebci-nexus-org-authority-spec.md`
- Helpers: `src/lib/permissions.ts`, `src/lib/permission-presets.ts`
- Views: `src/app/portal/organization/view-{department,people}.tsx`
- Pages to rework: `src/app/portal/organization/page.tsx`, `src/app/hradmin/organization/page.tsx`

---

## 📋 Data status

- Employees: 55 active, 54 at Level 1, 1 at Level 3
- Manager hierarchy: only 1 employee has `manager_id` set
- Permissions: only 1 User row (ปอนด์, Super Admin preset)
- Audit log table: empty

### ถ้าอยากเห็น tree เต็ม
- HR ต้องกำหนด `approval_level` + `manager_id` ของพนักงาน 55 คน ผ่านหน้า `/hradmin/employees/[id]`
- หรือรัน SQL seed (ต้อง map จากผังที่ HR ส่งมา)

---

## 🔴 Known issues / Open

- **Leave approval logic** ยังอ้าง `approval_level=4=MD` (ก่อนแก้ HR ออก) — อาจต้อง review `src/lib/leave-approval-actions.ts` อีกครั้ง หลังผมลบ HR level ออก เลขบางส่วน shift แล้ว แต่ logic flow ควร verify
- **RLS policy** ใน `employee_audit_log` ยังไม่ได้สร้าง — spec บอก optional
- **ชื่อ User table** ใช้ `"User"` (case-sensitive) — ถ้า Supabase-js `.from('User')` ตรวจแล้วว่าใช้ได้ ไม่งั้นต้องใช้ `.from('"User"')` (มี escape)



<a id="section-2"></a>
# §2. SESSION_HANDOFF_APR20_NIGHT.md

*Source: `SESSION_HANDOFF_APR20_NIGHT.md` (root, 100 บรรทัด)*

---

# Session Handoff — EBCI Nexus (Home Night → Office Morning)

**Date:** 2026-04-20 night
**From:** Home Mac mini (`/Volumes/C1TB/EB-CI/EBCI-Nexus`)
**To:** Office Mac (`/Volumes/1TB-NVME/...` หรือ path ของเครื่อง)
**Branch:** `main` (remote is ahead of office by 3 commits)

---

## 🚀 เริ่มต้นที่ออฟฟิศ (5 นาที)

```bash
cd <path-ไปยัง-EBCI-Nexus-บน-office-mac>
git pull origin main       # ดึง 3 commits ใหม่
npm run dev                # เปิด dev server (port 3001)
```

จากนั้นเปิด browser ไปที่: **http://localhost:3001/portal/organization**

---

## ✅ Smoke test checklist

### Tab 1 — โครงสร้าง
- [ ] Default sub-view = มุมมองแผนก (ผัง tree)
- [ ] กด **มุมมองรายบุคคล** → เห็น avatar cards แยก level
- [ ] URL เปลี่ยนเป็น `?sub=people` (แชร์ link ได้)
- [ ] Browser back button คืนค่า

### Tab 2 — อำนาจอนุมัติ ⭐ (Phase 2 ใหม่)
- [ ] URL = `?view=authority`
- [ ] เห็น filter chips: ทั้งหมด / การลา / OT / เบิกเงิน / HR
- [ ] เห็น approver cards 3 ใบ (**จิม / มด / ปุ๊**)
- [ ] กด "การลา" → เห็นทั้ง 3 คน (ทุกคนมี scope `leave`)
- [ ] กด "เบิกเงิน" → เห็นแค่ **จิม + ปุ๊** (มด ไม่มี budget scope)
- [ ] กด "HR" → เห็นแค่ **จิม + มด**
- [ ] Badge สีถูก: leave=เขียว / ot=เหลือง / budget=ฟ้า / hr=ชมพู
- [ ] **Login admin** → เห็นวงเงินเป๊ะ (เช่น "≤ 1,000,000 บาท") + L4 tag
- [ ] Section "พนักงานที่ไม่ได้เป็นผู้อนุมัติ (52 คน)" กดเปิดได้

### Tab 3 — สายอนุมัติของฉัน ⭐ (Phase 2 ใหม่)
- [ ] URL = `?view=my-chain`
- [ ] profile card สีทอง (ตัวคุณเอง) อยู่บน
- [ ] ถ้า login เป็นคนที่มี manager → เห็น chain step พร้อม badge "อนุมัติ N" และ last step = "อนุมัติสุดท้าย"
- [ ] ถ้า login เป็นคนที่ไม่มี manager → empty state "ยังไม่ได้กำหนดผู้บังคับบัญชา"

### Permission masking test (สำคัญ)
- [ ] Login **admin** (ปอนด์) → Tab 2 แสดงวงเงินเป๊ะ + L tag
- [ ] Login **mock_mod** (username=`mod`, password=`0000`) → Tab 2 แสดง tier icon (💎 วงเงินกลาง) แทน ไม่เห็น L tag
  - ⚠ Note: mod preset มี `can_view_approval_limits=true` → ยังเห็นเป๊ะ ถ้าอยาก test tier ต้อง change preset หรือใช้ user ไม่มี permission
- [ ] Login **mock_jim** (username=`jim`, password=`0000`) → เห็นเป๊ะเหมือนกัน (Executive Viewer มีสิทธิ์ดู)

---

## 🗂️ ไฟล์ที่ commit ไปคืนนี้ (3 commits)

1. **717d56c** — tabs shell + structure sub-toggle + stub tabs 2/3
2. **0c6a124** — sync seed-permissions.sql (username ไม่ใช่ email)
3. **777e283** — Phase 2: Tab 2 + Tab 3 real content + mock approvers

### ไฟล์ที่ควรรู้

- `src/app/portal/organization/tabs-shell.tsx` — 3-tab navigation + query params
- `src/app/portal/organization/tab-structure.tsx` — sub-toggle dept/people
- `src/app/portal/organization/tab-authority.tsx` — Tab 2 (ใหม่)
- `src/app/portal/organization/tab-my-chain.tsx` — Tab 3 (ใหม่)
- `src/lib/permissions.ts` — `getCurrentPermissions()`, tier helpers
- `src/lib/permission-presets.ts` — 4 presets
- `prisma/seed-permissions.sql` — seed mock users (applied แล้ว)
- `prisma/seed-approvers.sql` — seed mock approvers (applied แล้ว)

---

## ⚠️ ข้อควรรู้ / แก้เมื่อพร้อม

1. **Mock data ใน DB** — 3 rows ใน User (`admin`, `mock_jim`, `mock_mod`) และ 3 rows ใน employees มี `is_approver=true` เป็นของปลอมให้ test ได้ เปลี่ยนเป็นของจริงเมื่อ HR กำหนดแล้ว
2. **Password plaintext** — admin/jim/mod ใช้ `0000` plaintext ตาม convention เดิม (ของปอนด์) เปลี่ยนเป็น bcrypt ทีหลังถ้าจะ deploy prod
3. **จิม (mock_jim) role=manager** — spec เดิมว่า role=`hr_admin` แต่ spec เพิ่งแก้ให้ 1 คนเท่านั้น ถ้า มด ต้องเข้า `/hradmin/*` ได้ ต้องแก้ route guard ให้เช็ก permission flag แทน role
4. **Linkage User ↔ Employee** — mock_jim, mock_mod ไม่มี link กับ employee record (User ไม่มี column employeeId) → Tab 3 เข้าด้วย mock_jim/mod จะแสดง empty state
5. **Tab 1 ยัง call `supabaseAdmin.from('employees')` ที่ page.tsx** — ถ้าจะ scale ขึ้นอีก ค่อย extract เป็น shared server action

---

## ➡️ Phase 3 ที่จะทำต่อ (spec §7.5 + §9)

- Admin Management page `/portal/admin/permissions` — Super Admin แก้ preset ของคนอื่นได้
- Audit log viewer (ดูประวัติการแก้ข้อมูลพนักงาน)
- API filtering สำหรับ endpoints อื่น (เมื่อเริ่ม expose approval_limit_thb ผ่าน REST)
- Route guards ที่ใช้ permission flags (ไม่ใช่ role) — ให้ มด เข้า hradmin ได้

---

## Quick references

- **Local port:** 3001
- **Supabase project:** `cluirxjykhchthcpgosz` (EBCI Nexus, ap-southeast-1)
- **Spec doc:** `/Volumes/2TB-MAC/OldDownload/12OldDownload/ebci-nexus-org-authority-spec.md`
- **Remote:** https://github.com/caserebel-maker/EBCI-Nexus

*หลับฝันดีครับ 🌙*



<a id="section-3"></a>
# §3. SESSION_APR21_SUMMARY.md

*Source: `docs/SESSION_APR21_SUMMARY.md` (104 บรรทัด)*

---

# EBCI Nexus — Organization Module Implementation
## Session: April 21, 2026

## 🎯 Feature Completed: Role-Based Organization Viewer

### Overview
Complete organization chart module with role-based permissions, approval chains, and flexible override system.

### Three Main Tabs

**Tab 1: โครงสร้าง (Structure)**
- Department view (tree layout, vertical wrap)
- Company overview (departments only, no employees)
- People view (L3+ and admin only)
- Permission filter: L1/L2 see only their own department

**Tab 2: อำนาจอนุมัติ (Authority)**
- My approvers for leave/OT
- Budget approvers with tier icons (small/medium/large/unlimited)
- HR approvers (hidden from L1/L2)
- All approvers section (L3+ and admin)

**Tab 3: สายอนุมัติของฉัน (My Chain)**
- Walk up reports_to_id
- Stops at MD (Level 4) for regular employees
- Override via leave_approver_id for special cases (e.g., president's secretary)
- Shows override badge ⭐ when applicable

## 🗄️ Database Schema

### New columns in `employees` table:

| Column | Type | Purpose |
|--------|------|---------|
| reports_to_id | text (FK) | Direct manager in hierarchy |
| secondary_department | text | Dual-role department |
| is_advisor | boolean | Separate advisors from regular staff |
| is_approver | boolean | Can approve requests |
| approval_scopes | text[] | [leave, ot, budget, hr] |
| approval_limit_thb | numeric | Budget limit (NULL = unlimited) |
| leave_approver_id | text (FK) | Override: leave goes to different approver |
| emergency_contact_name | text | Emergency contact name |
| emergency_contact_phone | text | Emergency contact phone |
| emergency_contact_relation | text | Relation (พี่ชาย, ภรรยา, etc.) |
| emergency_contact_address | text | Emergency contact address |

## 📊 Data Statistics

- 48 active employees
- 7 advisors
- 33 approvers (69% of active)
- 5 HR approvers: ม๊อด, มด, ป้อม, จิม, ดำ
- 1 leave override: จอย → ดำ
- 20 departments

## 🔑 Permission Matrix

| Feature | L1/L2 | L3 | L4+ / Admin |
|---------|-------|-----|------|
| Department tree | own only | own + company | company |
| Authority - chain | yes | yes | yes |
| Authority - HR section | no | yes | yes |
| Authority - all approvers | no | yes | yes |
| Authority - exact amounts | no (tiers) | yes | yes |
| My chain | yes | yes | yes |
| Level badges | no | no | admin only |
| Edit employee | no | no | admin only |

## 🧪 Test Accounts

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| tumyen@gmail.com | 0000 | Super Admin | Full access test |
| l1test@ebci.test | 0000 | L1 (หวาน) | Employee view |
| l2test@ebci.test | 0000 | L2 (จักร) | Department head view |
| joytest@ebci.test | 0000 | L1 override | Override badge test |

## ⏭️ Pending Work (Not Blocking)

- Wait for มด to review EBCI-employees-review.xlsx
- Add ตี๋ (president's driver) to system + set leave_approver_id = ดำ
- Evaluate if เบนซ์ (สำนักประธาน) needs override
- Image crop feature for profile photo upload (Phase F)
- Bulk emergency contact data entry

## 🎨 Design Decisions

- Vertical tree layout with flex-wrap (no horizontal scroll on mobile)
- Tier icons instead of exact amounts for L1/L2 (privacy)
- Lucide icons throughout (no emoji in UI elements)
- Multiple roots supported (siblings at top of department)
- Subtree grouping (L2 with reports shown separately from other L2)

## 📅 Timeline

- 9:00 AM — Session start
- 10:30 AM — Phase A complete
- 11:00 AM — Phase B complete
- 11:45 AM — Phase C complete
- 12:30 PM — Emergency Contact + Company Overview + Tree layout
- 1:15 PM — Phase D complete
- 1:30 PM — All testing passed

Total implementation time: ~4.5 hours



<a id="section-4"></a>
# §4. SESSION_HANDOFF_APR21.md

*Source: `docs/SESSION_HANDOFF_APR21.md` (282 บรรทัด)*

---

# Session Handoff — 21 Apr 2026 (EBCI Nexus)

> **Read this first if you are resuming the project in a new Claude session.**  
> This doc summarises what the current session shipped, what is still open,
> and exactly what to tackle next. If anything here conflicts with the actual
> code, trust the code.

---

## 0. TL;DR

Today's session (Apr 21) pushed **ต่อจาก `554030a feat(employee): add image crop modal`** and
landed **20 commits** across 6 feature tracks. Everything is on `origin/main`
and Vercel deploys automatically. The next major task is
**Careers Session B** (multi-step form rewrite + admin detail page).

---

## 1. Runtime & deploy info

- **Repo**: `caserebel-maker/EBCI-Nexus` (branch `main`)
- **Worktree used today**: `.claude/worktrees/priceless-heisenberg-55cb19`
- **Host**: Vercel (UTC runtime) → `https://nexus.ebcitrade.com`
- **DB**: Supabase project `cluirxjykhchthcpgosz` (Free tier)
- **Storage buckets**: `applicant-assets` (private), `announcement-images` (public),
  `employee-photos` (public), `employee-assets` (private)
- **Emails**: Resend, `FROM = onboarding@resend.dev`; HR notifications go to
  `HR_NOTIFY_EMAIL` env (fallback `hr@ebcitrade.com`)
- **Test accounts**:
  - Admin: `tumyen@gmail.com / 0000` (ปอนด์ / สุริยะ / ม๊อด)
  - L1 employee: `l1test@ebci.test / 0000` (หวาน)
  - L2: `l2test@ebci.test / 0000`
  - Manager (มด): `c.arthit@ebcitrade.com / 0839964333`

---

## 2. What shipped today (newest first)

| Commit | Summary |
| --- | --- |
| `fd7854f` | **fix(checkin)**: Bangkok timezone for all checkin/checkout displays + variance math |
| `ba0bf5f` | **feat(hradmin)**: system quota dashboard at `/hradmin/settings/quota` |
| `0fa61d9` | **feat(system)**: `GET /api/hradmin/system/quota` API |
| `0b2d5ef` | **feat(hradmin)**: applicants list + sidebar link at `/hradmin/applicants` |
| `140bbfd` | **feat(careers)**: public landing `/careers` + resume-draft modal |
| `97dea4b` | **feat(careers)**: API foundation — 5 endpoints (start / resume / autosave / upload / submit) |
| `d7b29a5` | **feat(announcements)**: back + X + breadcrumb on create page with dirty-guard |
| `cc7e67b` | **feat(hradmin)**: `/hradmin/announcements` management page (tabs + archive table) |
| `679381c` | **fix(announcements)**: save session id as `created_by`, show creator in modal |
| `114b0dd` | **fix(announcements)**: carousel NULL-expiry handling |
| `c2930d1` | **feat(announcements)**: archive tab as paginated table (10/page) |
| `a7dcbb8` | **feat(dashboard)**: priority alert bars above content |
| `1518c9b` | **refactor(dashboard)**: carousel filters to internal/promote only |
| `8637adc` | **feat(announcements)**: success popup after create |
| `f0400dc` | **feat(dashboard)**: desktop greeting banner |
| `5efbd9c` | **fix(dashboard)**: carousel overlay — maroon gradient, 30% height |
| `4056069` | **refactor(announcements)**: Active/Archive tabs + modal popup |
| `75c265c` | **feat(dashboard)**: replace static banner with Embla carousel |

See `git log --oneline --since='1 day ago'` for the full list.

---

## 3. Feature tracks delivered today

### 3.1 Announcements overhaul
- Dashboard carousel is Embla-based (5s autoplay, pause-on-hover, ◀▶ arrows, dot indicators)
- Carousel only shows `priority ∈ { internal, promote }`; emergency/urgent live in
  a new **Priority Alerts bar** that stacks above all content (mobile AND desktop)
- Alert bar: emergency = red gradient + pulse, NOT dismissible; urgent = amber,
  dismissible (session-only via React state, not persisted)
- `/portal/announcements` rewritten with **Active / Archive tabs** + modal popup
- Archive tab is a paginated table (10/page) backed by
  `GET /api/announcements/archive?page=N` with URL params for shareable deep links
- Modal now shows **"โพสโดย: …"** — creator name resolved via new
  `src/lib/creators.ts` (employees.id → user_id fallback). Legacy rows with
  literal "HR Admin" pass through unchanged.
- HR Admin got a new management page at `/hradmin/announcements` with the same
  tabs + table + Delete action (guarded by `deleteAnnouncement` server action).
  Sidebar label changed to **ประกาศข่าวสาร** (Megaphone) pointing there. Create
  button inside links to `/hradmin/hr/announcements` (existing form).
- Create form got a **Back button + X + breadcrumb** with a dirty-tracking guard
  (confirm on leave + `beforeunload`).
- Success popup: centered glass card with CheckCircle2 + countdown progress bar,
  auto-closes in 3s then redirects to the list.

### 3.2 Attendance + Reconciliation
- Parallel-run system landed earlier in the day: `card_scans` table + CSV import
  at `/hradmin/attendance/import` + dashboard at `/hradmin/attendance/reconcile`.
- Import screen links to the reconcile page on success.
- **Timezone fix (commit `fd7854f`) — important context for everyone:**
  - `checkins.checked_in_at` / `checked_out_at` are stored as **UTC** wall-clock
    (Node's `new Date().toISOString()` into a `timestamp without time zone`).
  - `card_scans.scan_time` is stored as **Bangkok** wall-clock (from CSV).
  - `src/lib/datetime.ts` exposes `formatBangkokTime / formatBangkokDateTime /
    formatBangkokTimeWithSeconds / toDate` — **each takes an explicit
    `source: 'utc' | 'bangkok'` arg**. Always pass it.
  - `reconcile/actions.ts#toMs` also takes source; variance math is now correct
    (card 07:35 Bangkok vs mobile 01:03 UTC → 28 min, not 6.5 h).

### 3.3 Careers — **Session A only**
Backend + landing + admin list shipped. **Session B remains.**
- Public landing at `/careers` with hero, highlights, 3-step "ขั้นตอน", resume-draft modal
- 5 API endpoints at `/api/careers/apply/{start,resume,[id]/autosave,[id]/upload,[id]/submit}`
- Ownership model: `(id, reference_code)` pair — no auth required
- Email templates in `src/lib/careers-emails.ts` (draft-saved, applicant-submitted, hr-notify)
- Admin list at `/hradmin/applicants` with status tabs + filters + pagination
- Admin detail at `/hradmin/applicants/[id]` is a **stub** — shows header + raw JSON
- Old `/careers/apply/page.tsx` deleted (git history preserves it). Placeholder
  at same route says "กำลังพัฒนา".
- `react-signature-canvas@1.1.0-alpha.2` installed ahead of Session B.

### 3.4 System quota dashboard
- New SECURITY-DEFINER RPC `public.get_system_quota()` aggregates:
  - `pg_database_size(current_database())`
  - `pg_stat_user_tables` rows + `pg_total_relation_size` per public table
  - `storage.buckets` LEFT JOIN grouped `storage.objects` sizes
  - `auth.users` count + 30-day growth
- API at `/api/hradmin/system/quota` computes percent + status
  (ok <60% · warning 60-80% · critical >80%) per metric against Free-tier
  limits (500 MB · 1 GB · 50 000 users) and emits a Thai recommendation.
- Dashboard at `/hradmin/settings/quota` renders 3 metric cards + recommendation
  card + storage-by-bucket + table rows + service status cards + refresh button.
- Sidebar entry: **ระบบและทรัพยากร** (Activity icon).
- Current snapshot: DB 2.5%, Storage 0.65%, Users 0.02% → Free tier ok.

---

## 4. What's still open — **start here next session**

### 4.1 **Careers — Session B (HIGH PRIORITY)**
The user explicitly agreed to a 2-session split (this was Session A). Session B
rewrites the apply form and admin detail page against the now-working APIs.

**4.1a — `/careers/apply` multi-step form rewrite**
- Replace the `กำลังพัฒนา` placeholder at
  `src/app/careers/apply/page.tsx` with a 5-step form
- Steps (see original spec in commit message `97dea4b`):
  1. Position + personal info (photo required)
  2. Addresses + ID + family history
  3. Education + work experience + document uploads
  4. Skills + health + languages + vehicles
  5. References + PDPA + signature + submit
- Wire to existing endpoints:
  - First keystroke → `POST /api/careers/apply/start` (returns `{id,ref}`)
  - Every field change (debounced 3s) →
    `PATCH /api/careers/apply/[id]/autosave` with `{reference_code, fields}`
  - Photo / CV / Transcript / ID / House reg uploads →
    `POST /api/careers/apply/[id]/upload` with `kind` param
  - Final submit → `POST /api/careers/apply/[id]/submit`
- Resume flow: if URL has `?ref=APP-...`, show a small email-prompt that POSTs
  to `/api/careers/apply/resume` to load the draft
- Libraries already installed: `react-hook-form`, `react-easy-crop`,
  `react-signature-canvas`
- Progress bar at top showing Step 1..5 + last-saved timestamp

**4.1b — Admin detail page at `/hradmin/applicants/[id]`**
Currently a stub. Needs:
- 5-section presentation (mirror the form)
- File download buttons (signed URL refresh via `supabaseAdmin.storage`)
- Status dropdown (draft / submitted / reviewing / shortlisted / interviewed /
  offered / rejected / withdrawn) → server action to update
- Review notes textarea → saves to `review_notes`
- Interview evaluation (12 factors, 1-5 scale) → saves to
  `interview_evaluation` jsonb

**4.1c — Env vars to set before real submissions**
- `NEXT_PUBLIC_APP_URL` (used in email templates; falls back to
  `https://nexus.ebcitrade.com`)
- `HR_NOTIFY_EMAIL` (HR notification recipient; falls back to `hr@ebcitrade.com`)

### 4.2 Carousel aspect-ratio — **just fixed, verify on deploy**
`/portal/dashboard` carousel now uses `aspect-ratio: 16 / 9` on all viewports +
`object-contain` on the `<img>`, with an EBCI maroon gradient as the slide
background so any letterbox area looks branded. User reported cropping on
mobile viewport 380px — test on that width. Commit: see final commit of today.

### 4.3 Deferred cleanups (nice-to-have)
- `/hradmin/recruitment` legacy page still points at old `applicants` /
  `applicant_educations` / `applicant_experiences` tables. Decide: retire,
  merge into `/hradmin/applicants`, or leave.
- `checked_in_at` date extraction in `src/app/hradmin/reports/actions.ts:69`
  uses `.slice(0,10)` on the UTC string → can misattribute late-night Bangkok
  check-ins to the wrong date. Low-impact (off by ±1 day for events between
  17:00-24:00 UTC = 00:00-07:00 Bangkok).
- Vercel usage metrics in the system-quota dashboard — needs Vercel API
  integration (marked "phase ถัดไป" in the UI).
- Daily greeting projections (month forecasts) for quota dashboard — skipped
  intentionally, trivial to add later with `storage_growth_30d_bytes`.

---

## 5. Key file map (for orientation)

```
src/
├── app/
│   ├── api/
│   │   ├── announcements/archive/route.ts    # paginated archive
│   │   ├── careers/apply/
│   │   │   ├── start/route.ts                # create draft + email
│   │   │   ├── resume/route.ts               # (email, ref) → draft
│   │   │   └── [id]/
│   │   │       ├── autosave/route.ts         # PATCH partial
│   │   │       ├── upload/route.ts           # multipart → storage
│   │   │       └── submit/route.ts           # flip status + emails
│   │   └── hradmin/system/quota/route.ts     # system usage
│   ├── careers/
│   │   ├── layout.tsx                        # public, Kanit font
│   │   ├── page.tsx                          # → CareersLandingClient
│   │   ├── landing-client.tsx                # hero + modal
│   │   └── apply/page.tsx                    # Session-B stub
│   ├── hradmin/
│   │   ├── announcements/
│   │   │   ├── page.tsx                      # HR mgmt list
│   │   │   ├── announcements-view.tsx        # tabs + archive table + delete
│   │   │   └── actions.ts                    # deleteAnnouncement
│   │   ├── applicants/
│   │   │   ├── page.tsx                      # list + filters
│   │   │   ├── applicants-view.tsx           # table + tabs + pagination
│   │   │   └── [id]/page.tsx                 # STUB for Session B
│   │   └── settings/quota/
│   │       ├── page.tsx                      # role guard
│   │       └── quota-dashboard.tsx           # 6-section view
│   └── portal/
│       ├── announcements/{page,announcements-view}.tsx
│       ├── checkin/checkin-view.tsx          # uses formatBangkokTime
│       └── dashboard/{page,dashboard-client}.tsx
└── lib/
    ├── creators.ts              # resolve created_by → "ชื่อ (ชื่อเล่น)"
    ├── datetime.ts              # NEW — formatBangkokTime(utc|bangkok)
    ├── careers-ownership.ts     # verifyOwnership(id, ref)
    ├── careers-emails.ts        # 3 Resend templates
    ├── priority-alerts-fetch.ts # for shell emergencyBanner
    └── email.ts                 # Resend wrapper
```

**New components:**
- `src/components/daily-greeting.tsx` — `variant: 'mobile' | 'desktop'`
- `src/components/success-popup.tsx` — centered modal w/ countdown
- `src/components/dashboard/priority-alerts.tsx` — stacked red/amber bars

**New DB artifacts (via Supabase MCP migrations):**
- RPC `public.generate_application_reference()` (was already there)
- RPC `public.get_system_quota()` (added today, SECURITY DEFINER, service_role only)
- All `job_applications` columns already existed; nothing schema-breaking today

---

## 6. Known quirks / gotchas

1. **Two timezone conventions in the DB** — see §3.2. Always declare source
   when calling anything in `src/lib/datetime.ts`.
2. **`navigation.tsx` HR Admin sidebar** is append-order; latest entries are
   "ประกาศข่าวสาร" / "ผู้สมัคร" / "ระบบและทรัพยากร". The legacy
   "dashboard.recruitment" link is still there — intentionally.
3. **`created_by` on announcements is a mix of values** — new rows store
   `session.employeeId ?? session.id`, legacy rows store the string
   `"HR Admin"`. `displayCreator()` handles both.
4. **Dirty guard on create form** — form-level `onInput / onChange` sets
   `isDirty = true`. `beforeunload` warns on refresh. Successful submit clears
   `isDirty` first so the auto-close redirect doesn't double-prompt.
5. **Old `/careers/apply` form** (react-hook-form, ~423 lines against the old
   `applicants` table schema) was **deleted**, not parked. History preserves it
   if anyone wants to reference the UX.

---

## 7. How to resume next session — recommended first message

> "อ่าน docs/SESSION_HANDOFF_APR21.md แล้วเริ่ม Careers Session B ตามข้อ 4.1 —
> เริ่มจาก step 1 ของฟอร์มก่อน เอาแค่ fields ใน step 1 ให้ทำงานครบ (start →
> autosave → photo upload via react-easy-crop) พร้อม reference code ในแถบบน"

That sets a bite-sized chunk for the next session and gives Claude the exact
context it needs. From there, expand to step 2 → 5, then the admin detail page.

---

*Generated 21 Apr 2026 · maintained by whoever is working the session —
append a new handoff file (e.g. `SESSION_HANDOFF_APR22.md`) if you do another
full day of work, don't edit this one.*



<a id="section-5"></a>
# §5. SESSION_HANDOFF_APR22.md

*Source: `docs/SESSION_HANDOFF_APR22.md` (177 บรรทัด)*

---

# Session Handoff — 22 Apr 2026 (EBCI Nexus)

> **เปิดไฟล์นี้ก่อนเริ่มงานใหม่ที่ออฟฟิศ**
> ต่อจาก `docs/SESSION_HANDOFF_APR21.md` — ไฟล์นั้นเป็นภาพรวมใหญ่,
> ไฟล์นี้เป็น delta ของ session ตอนดึก 21 เม.ย. + next step ที่ชัดเจน
> สำหรับ Claude session ใหม่.

---

## 0. TL;DR ใน 30 วินาที

เมื่อคืนปิด 4 commits เล็ก ๆ (avatar fix + mobile more menu): `d52e1ad → ed0354a`
ทั้งหมดอยู่บน `origin/main` แล้ว Vercel deploy auto.
**Careers Session B ยังไม่ได้เริ่มเลย** — เป็น task หลักของวันนี้.

---

## 1. สิ่งที่ปิดไปเมื่อคืน (since SESSION_HANDOFF_APR21.md)

| Commit   | Summary                                                        |
| -------- | -------------------------------------------------------------- |
| `ed0354a` | **fix(mobile)**: strip HR admin items from portal-mode more menu |
| `710b6e2` | **fix(mobile)**: hide system/quota from portal-mode more menu  |
| `4ed7cf5` | **feat(mobile)**: add HR admin menu items to more menu         |
| `d52e1ad` | **fix(sidebar)**: show `photo_url` from employees in avatar    |

### 1.1 Sidebar avatar fix (`d52e1ad`)

**Bug:** พนักงานบางคน (เช่น Sunny/คุณพ่อ) มี `employees.photo_url` แต่ sidebar
avatar โชว์แค่ตัวอักษรแรก (fallback).

**Root cause:** `src/lib/employee-profile.ts` lookup ด้วย `employees.id = session.employeeId`
อย่างเดียว, ถ้า `employeeId` ไม่ได้ถูก seed ใน `user_metadata` จะ fallback ไป
email lookup — แต่ layout ส่ง `session.name` (ไม่ใช่ email) → lookup ล้มเหลวทั้งคู่
→ `photoUrl = null`.

**Fix:** เพิ่ม middle-fallback `employees.user_id = session.id` (pattern เดียวกับ
`src/lib/creators.ts`). Layout ทั้ง 2 (`portal/layout.tsx` + `hradmin/layout.tsx`)
ส่ง `session.id` เป็น arg ที่ 5 ของ `getEmployeeProfile()`. Email lookup ยังอยู่
เป็น safety net ตัวสุดท้าย.

Files touched:
- `src/lib/employee-profile.ts` — เพิ่ม `authUserId` param + 3-step lookup
- `src/app/portal/layout.tsx`, `src/app/hradmin/layout.tsx` — pass `session.id`

### 1.2 Mobile "เพิ่มเติม" — HR admin section (`4ed7cf5 → ed0354a`)

เพิ่มปุ่ม HR admin 4 ตัวใน slide-up panel ของ mobile bottom nav
(`src/components/layout/portal-bottom-nav.tsx`) — **เฉพาะตอนอยู่ใน /hradmin
(admin mode)**. Portal mode ของ hr_admin (ตอนกด "ดูในฐานะพนักงาน") จะ
เหมือน employee เป๊ะ ไม่มี HR items หลุด.

**สถานะสุดท้ายของ "เพิ่มเติม" ตาม role/mode:**

| Role / Mode                          | เห็นอะไรบ้าง                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Employee                             | ยื่นใบลา · ผังองค์กร · ปฏิทิน · ออกจากระบบ                                                           |
| Manager                              | อนุมัติการลา · ยื่นใบลา · ผังองค์กร · ปฏิทิน · ออกจากระบบ                                            |
| HR Admin ใน `/hradmin` (admin mode)  | อนุมัติ · ผังองค์กร · จัดการระบบ · รายงาน · **HR Admin:** ประกาศ / รับสมัคร / การเข้างาน / นำเข้าบัตร / **ระบบและทรัพยากร** · ดูในฐานะพนักงาน · ออกจากระบบ |
| HR Admin ใน `/portal` (portal mode)  | ยื่นใบลา · ผังองค์กร · ปฏิทิน · กลับเป็น HR Admin · ออกจากระบบ *(ไม่มี HR items เด็ดขาด)*            |

Logic: 2 constants `HR_ADMIN_QUICK_ACTIONS` + `HR_ADMIN_SYSTEM_ACTIONS`
inject เข้าแค่ `MORE_CONFIG.hr_admin` เท่านั้น (ไม่ spread เข้า
`HR_ADMIN_PORTAL_MORE`). ทุก row `min-h-[56px]` สำหรับ senior-friendly touch,
panel `max-h-[70vh] overflow-y-auto` กันล้นจอ.

หมายเหตุ: codebase ยังไม่มี role `superadmin` ใน `src/config/roles.ts`
ถ้าต้องเพิ่มใน future ค่อยทำแยก.

---

## 2. Careers Session B — **งานหลักของวันนี้** (ยังไม่ได้เริ่ม)

อ้างอิง `SESSION_HANDOFF_APR21.md` ข้อ 4.1. backend พร้อมทั้งหมดแล้ว,
เหลือแต่ frontend + admin detail page.

### 2.1 Scope (ย่อ)

**2.1a — `/careers/apply` multi-step form rewrite**
- แทนที่ placeholder ที่ `src/app/careers/apply/page.tsx` (ตอนนี้เป็น stub "กำลังพัฒนา")
- 5 ขั้นตอน:
  1. Position + personal info (ต้องมีรูปถ่าย)
  2. Addresses + ID + family history
  3. Education + work experience + document uploads
  4. Skills + health + languages + vehicles
  5. References + PDPA + signature + submit
- Wire ไปที่ 5 API ที่มีอยู่แล้ว:
  - `POST /api/careers/apply/start` (first keystroke → returns `{id, reference_code}`)
  - `PATCH /api/careers/apply/[id]/autosave` (debounce 3s, body `{reference_code, fields}`)
  - `POST /api/careers/apply/[id]/upload` (multipart, `kind` ∈ photo/cv/transcript/id_card_copy/house_registration/other)
  - `POST /api/careers/apply/[id]/submit`
  - `POST /api/careers/apply/resume` (resume flow ถ้า URL มี `?ref=APP-...`)
- Libraries ติดตั้งแล้ว: `react-hook-form@7.71.1`, `react-easy-crop@5.5.7`, `react-signature-canvas@1.1.0-alpha.2`
- Progress bar บนสุดโชว์ Step 1..5 + `last_saved_at` timestamp
- Reference code โชว์ใน header บาร์ตลอดเวลา

**2.1b — `/hradmin/applicants/[id]` detail page**
ปัจจุบันเป็น stub. ต้องการ:
- 5-section layout (mirror form)
- File download ด้วย signed URL refresh (`supabaseAdmin.storage`)
- Status dropdown (draft / submitted / reviewing / shortlisted / interviewed / offered / rejected / withdrawn) → server action update
- Review notes textarea → save ไป `review_notes`
- 12-factor interview evaluation (1-5 scale) → save ไป `interview_evaluation` jsonb

**2.1c — Env vars ที่ต้อง set ก่อน go-live**
- `NEXT_PUBLIC_APP_URL` (fallback `https://nexus.ebcitrade.com`)
- `HR_NOTIFY_EMAIL` (fallback `hr@ebcitrade.com`)

### 2.2 Exact first message ที่แนะนำให้พิมพ์ตอนเริ่ม

> "อ่าน `docs/SESSION_HANDOFF_APR22.md` แล้วเริ่ม Careers Session B ตาม §2.1a —
> ลุยเฉพาะ **Step 1** ก่อน (position + personal info + photo) ให้ครบ flow:
> start → autosave → photo upload via `ImageCropModal` (ที่มีอยู่แล้วใน
> `src/components/ImageCropModal.tsx`) พร้อมแถบ reference code ด้านบน + progress
> bar. ห้ามเริ่ม Step 2-5 จนกว่าจะ confirm ว่า Step 1 ใช้ได้จริง."

ทำงานแบบ bite-sized — Step 1 ก่อน, test, แล้วค่อย Step 2.

### 2.3 ข้อมูล bootstrap ที่ Claude ควรรู้ทันที

- **job_applications columns** ที่ Step 1 ใช้: `photo_url`, `position_applied`,
  `first_name_th`, `last_name_th`, `first_name_en`, `last_name_en`, `nickname`,
  `email`, `phone_mobile`, `date_of_birth`, `age`, `nationality`, `religion`,
  `gender`, `marital_status`, `blood_type`, `id_card_number`, `weight_kg`,
  `height_cm`, `current_step`, `completed_steps`, `reference_code`,
  `application_status`
- **ImageCropModal API**: `<ImageCropModal imageSrc open onClose onCropComplete aspectRatio? />`
  + helper `getCroppedImg(src, pixelCrop, rotation?, maxSize?) → Promise<Blob|null>`
  output JPEG 500×500 max, quality 0.9
- **Upload kind สำหรับ photo**: POST `/api/careers/apply/[id]/upload` with
  `FormData{ file, reference_code, kind: 'photo' }` → update `photo_url` column
  (signed URL 7 วัน)
- **Ownership model**: verifyOwnership(id, reference_code) — public, ไม่ต้อง session
- **Resume flow**: URL `?ref=APP-2026-0001` → modal small email-prompt → POST
  `/api/careers/apply/resume` → redirect กลับมา apply page พร้อม id

---

## 3. Quick env + deploy refresher

- Repo: `caserebel-maker/EBCI-Nexus` (branch `main`)
- Worktree นี้: `.claude/worktrees/beautiful-pasteur-b30921` (branch `claude/beautiful-pasteur-b30921`)
- Push workflow: `git push origin HEAD:main` — deploy ขึ้น `https://nexus.ebcitrade.com` อัตโนมัติ
- DB: Supabase `cluirxjykhchthcpgosz` Free tier
- Test accounts (ย้ำจาก APR21 §1):
  - Admin: `tumyen@gmail.com / 0000` (ปอนด์)
  - L1: `l1test@ebci.test / 0000` (หวาน)
  - L2: `l2test@ebci.test / 0000`
  - Manager (มด): `c.arthit@ebcitrade.com / 0839964333`
- **CLI ที่ควรลง:** `npm i -g vercel` → unlock `vercel env pull`, `vercel logs`

---

## 4. ก่อนเริ่มงาน ตรวจว่า deploy ผ่าน

1. `git log --oneline -5` → ต้องเห็น `ed0354a` บนสุด
2. เปิด https://nexus.ebcitrade.com บน iPhone → test:
   - Sidebar/identity header: avatar ต้องโชว์รูปจริง (login `tumyen@gmail.com`)
   - Mobile "เพิ่มเติม" (bottom nav): ไม่มี HR items ใน portal mode
   - Switch ไป admin mode: เห็น HR Admin section 5 items

ถ้าพังข้อไหนให้ rollback ด้วย `git revert <sha>` ก่อนลุย Careers.

---

## 5. ถ้ามี task อื่นโผล่ก่อน Careers Session B

Deferred cleanups จาก APR21 §4.3 (ยังค้างอยู่ ไม่เร่ง):
- `/hradmin/recruitment` legacy page (decide: retire / merge / leave)
- `checked_in_at` slice(0,10) bug ใน `src/app/hradmin/reports/actions.ts:69`
- Vercel usage metrics ใน quota dashboard (needs Vercel API)
- Daily greeting projections ใน quota dashboard

---

*สร้าง 21 เม.ย. 2026 ตอนดึก (ก่อนนอน) · resume ที่ office วันที่ 22 เม.ย.
ถ้าวัน 22 ทำงานเต็มวัน เขียน `SESSION_HANDOFF_APR23.md` ต่อ ไม่ต้องแก้ไฟล์นี้.*



<a id="section-6"></a>
# §6. SESSION_HANDOFF_APR23.md

*Source: `docs/SESSION_HANDOFF_APR23.md` (317 บรรทัด)*

---

# Session Handoff — ต่อจาก 22 เม.ย. (EBCI Nexus)

> **เปิดไฟล์นี้ก่อนเริ่มงานที่บ้าน**
> ต่อจาก `docs/SESSION_HANDOFF_APR22.md` (ปิดตอนเริ่มวันที่ออฟฟิศ) — ไฟล์นี้
> เป็น delta ของ 22 เม.ย. ทั้งวัน (23 commits) + next step ที่ชัดเจนสำหรับ
> session ใหม่.

---

## 0. TL;DR ใน 60 วินาที

**วันนี้ปิด 23 commits · 7 feature tracks · push main ครบ · build ผ่าน**

ทำไปสามส่วนใหญ่ ๆ:
1. **Careers ครบลูป** — apply form 5 steps + admin detail + 12-factor eval + status workflow + 8 email templates + branding
2. **Leave ครบ Phase 1 + 2** — พนักงานยื่นลาได้ + approver inbox + approve/reject + email chain ครบ
3. **HR Admin** — leave policies management + applicants card grid + menu merge

**ที่ยังเหลือ (ตามลำดับความสำคัญ):**
1. **Email delivery verification** — code พร้อม 100% แต่ต้อง set up Resend domain + Vercel env vars ถึงจะ deliver จริง
2. **Leave Phase 3** — HR admin dashboard (charts, CSV, override approve) — scoped ไว้แต่ยังไม่ได้ทำ
3. **End-to-end manual testing** — 23 commits ยังไม่ได้เทสจริงตามลำดับ

---

## 1. สิ่งที่ปิดวันนี้ (23 commits since `cf3511f`)

| # | Commit | Track | สรุปสั้น |
|---|---|---|---|
| 23 | `0cd406f` | Leave Phase 2 | wire submit → approver email |
| 22 | `a36197a` | Leave Phase 2 | polish 5 leave emails (light canvas + logo) |
| 21 | `9f6fdda` | Leave Phase 2 | approver inbox UI + approve/reject APIs |
| 20 | `d97ca8d` | Branding | polish 8 careers emails (light canvas + logo) |
| 19 | `99fc800` | Branding | careers page header → silver logo |
| 18 | `203fa0a` | Branding | add logos `public/brand/*.png` + README |
| 17 | `73aaf67` | Careers Iter 2 | admin detail page (3 tabs + file downloads) |
| 16 | `82f4bca` | Careers Iter 2 | 12-factor interview evaluation |
| 15 | `45a9dee` | Careers Iter 2 | status workflow (transitions + audit trail) |
| 14 | `bc2d099` | Careers Iter 2 | 5 status-change email templates |
| 13 | `37299c1` | HR Admin | applicants list → 3:4 photo card grid |
| 12 | `0d808f2` | HR Admin | merge duplicate applicant menus |
| 11 | `ed64d40` | Careers | fix email send (await + EMAIL_FROM env) |
| 10 | `a62adfc` | Careers | Step 4 trim (drop typing WPM + vehicle radio) |
| 9 | `794a2be` | Careers | fix date empty-string → null sanitizer |
| 8 | `393fe2e` | Careers Iter 1 | rewrite apply form 5 steps + signature pad |
| 7 | `1ce1913` | Mobile | center announcement modal (not bottom sheet) |
| 6 | `efecae6` | HR Admin | bulk apply policies to balances |
| 5 | `77bb8d5` | HR Admin | leave policy management UI + APIs |
| 4 | `a4160a2` | Leave Phase 1 | employee submission + my page + balance |
| 3 | `218e868` | Mobile | 3 UI fixes (header trunc + greeting + more menu) |
| 2 | `d82067c` | Auth | role resolution fallback from public.User |
| 1 | `e43cbf3` | Careers Iter 1 | apply form Step 1 scaffold + autosave |

### 1.1 Careers (เสร็จทั้งฝั่ง applicant + admin)

**Applicant side:**
- `/careers` landing + `/careers/apply` form 5 steps + `/careers/apply/success`
- APIs: start / resume / autosave (3s debounce) / upload (photo + 4 docs) / submit
- Signature pad (`react-signature-canvas` + dynamic import ssr:false)
- `src/lib/careers-sanitize.ts` — empty-string → null for date/numeric cols

**Admin side (`/hradmin/applicants/*`):**
- List: 3:4 photo card grid (2/3/5 col per breakpoint) with solid status chips
- Detail: sticky header with photo + StatusDropdown + 3 tabs:
  - Personal info (addresses + family + ID)
  - Education timeline + experience + file downloads (re-signed URLs)
  - Skills + references + PDPA + signature + 12-factor evaluation
- Status workflow: state machine in `src/lib/applicant-status.ts`
  (submitted → reviewing → shortlisted → interview → hired/rejected, terminal states disabled)
- 12-factor interview evaluation with auto-computed total/avg/percentage, evaluator audit

**Emails (8 templates, all polished):**
`draft-saved · submitted · hr-notify · reviewing · shortlisted · interview · hired · rejected`
→ Light canvas + silver logo header + maroon footer logo + Inter typography

### 1.2 Leave (Phase 1 + Phase 2 ครบ · Phase 3 ยังไม่เริ่ม)

**Phase 1 — Employee side:**
- `/portal/leave` with balance cards + request history + 4-step new-leave modal
- APIs: `/api/leave/submit`, `/my`, `/balance/[year]`, `/[id]/cancel`
- Storage: `leave-attachments` bucket (created via migration)
- Approval chain logic in `src/lib/leave-approval.ts`
  - Reads `employees.leave_approver_id` override first (จอย → ดำ)
  - Otherwise walks `reports_to_id` chain for first `is_approver=true` with dept scope match
  - **Note:** ปัจจุบัน L2 dept heads มี `approval_scopes=['budget']` ไม่ใช่ `leave`, ดังนั้นใบลา L1 → skip L2 → L3+
  - ถ้า HR ตัดสินใจให้ L2 approve ลาได้ แค่ update `approval_scopes` ใน employees (no code change needed)

**Phase 2 — Approver side:**
- `/portal/leave/inbox` with count badge, 3 filter pills, collapsible cards
- Approve/reject dialogs with optional notes / required reason (≥10 chars)
- Race protection: `.eq('status', 'pending')` on WHERE clause
- Balance transitions: pending→used on approve, pending→available on reject
- Sidebar: "อนุมัติการลา" added to Manager + Employee nav
- Email chain: submit → applicant+approver, approve → applicant, reject → applicant
- 5 templates polished with same light-canvas design as careers

**Test data (4 pending LVs):**
- `LV-2026-0001` (ปอนด์ลากิจ 1 วัน → จิม)
- `LV-2026-0002` (จอยลาพักร้อน 3 วัน → Sunny, override)
- `LV-2026-0003` (หวานลาป่วย 2 วัน → มด)
- `LV-2026-0004` (ปอนด์ลาแต่งงาน 5 วัน → จิม)

### 1.3 Leave Policies (HR Admin)

- `/hradmin/leave/policies` — grouped list by leave type + form modal with live preview
- APIs: CRUD (list/create/update/delete) + preview matching employees + calculate + bulk apply
- `calculate_leave_entitlement(emp_id, type_id, year)` DB function (was already in Supabase)
- Bulk apply: updates `leave_balances.total_days` across all active employees × leave types
- Respects `is_manually_adjusted` flag (skip if HR adjusted by hand)

### 1.4 Branding

- `public/brand/ebci-logo-silver.png` (for dark/maroon bg)
- `public/brand/ebci-logo-maroon.png` (for light bg, email footer)
- `/careers/*` layout header uses silver logo (maroon in dark mode)
- All 13 email templates (8 careers + 5 leave) use logo in header + footer
- Font stack: `Inter, 'Helvetica Neue', Helvetica, Arial, 'Sukhumvit Set', 'Prompt', sans-serif`

---

## 2. สิ่งที่ยังไม่เสร็จ (เริ่มจากอะไรก่อน)

### 2.1 🚨 CRITICAL — Email delivery verification

**ต้อง verify ก่อนทดสอบ Leave Phase 2 หรือ Careers Iter 2:**

1. Resend dashboard → verify domain
   - แนะนำ `ebcinext.com` หรือ `ebcitrade.com`
   - Add DNS records ตามที่ Resend บอก (SPF, DKIM)
   - รอ verify (ปกติ 10-30 นาที)

2. Vercel env vars:
   ```
   RESEND_API_KEY       = re_xxx...
   EMAIL_FROM           = EBCI Careers <careers@ebcinext.com>
   EMAIL_REPLY_TO       = hr@ebcitrade.com
   HR_NOTIFY_EMAIL      = tumyen@gmail.com (หรือ c.arthit@ebcitrade.com)
   NEXT_PUBLIC_APP_URL  = https://ebci-nexus.vercel.app
   ```

3. Redeploy (หรือรอ Vercel auto-deploy)

4. ทดสอบ — submit ใบสมัครใหม่ / submit ใบลาใหม่
   - Network tab → response ควรมี `email_sent: { employee: true, ... }`
   - Vercel log → `[email] sent → <recipient> — id=xxx`
   - Inbox → email มาถึง

**ข้อจำกัดปัจจุบัน:** default `onboarding@resend.dev` ส่งได้แค่ email ที่เป็น owner Resend account (ทดสอบกับ email อื่นจะ silently drop)

### 2.2 Leave Phase 3 — HR Admin Dashboard (ยังไม่เริ่ม)

Route: `/hradmin/leave/admin` (หรือ `/hradmin/leave`)
Access: hr_admin only

Scope (ตาม spec เดิมที่ defer ไว้):
- Tab 1 ภาพรวม: cards สรุป + chart วันลารายเดือน (recharts)
- Tab 2 Balance management: table พนักงานทุกคน + modal แก้ balance
- Tab 3 ใบลาทั้งหมด: filters + override approve/reject + CSV export
- Tab 4 (optional) Leave types read-only

LoC estimate: ~1500 LoC — **เป็น session ใหม่แยก**

### 2.3 Careers Iteration 2 leftovers

- **Download-all zip** — user บอก "DEFER if too complex". Library: `jszip`. ~150 LoC.
- **Review notes auto-save** — ตอนนี้ review_notes ถูก append ตอน status change เท่านั้น; ไม่มี textarea แยกสำหรับ HR จดโน้ตตลอดเวลา
- Tests: status transition edge cases (terminal → no dropdown, สถานะเดิม → 400)

### 2.4 End-to-end test scenarios ที่ค้างอยู่

Leave Phase 2 test matrix (จากรอบล่าสุด):

| Account | Inbox ควรเห็น | Test |
|---|---|---|
| จิม `thanawatana@ebcitrade.com` | LV-2026-0001, LV-2026-0004 | approve LV-0001 → ปอนด์ได้ email + balance pending→used |
| Sunny `sayan@ebcitrade.com` | LV-2026-0002 (จอย override) | reject with ≥10 chars → จอย ได้ email + balance คืน |
| มด `c.arthit@ebcitrade.com` | LV-2026-0003 | approve → หวาน ได้ email |

Careers Iteration 2 test matrix:

1. Login ปอนด์ → `/hradmin/applicants` → card grid render
2. Click APP-2026-0010 (test applicant) → detail page sticky header + 3 tabs
3. Tab 1: ข้อมูลส่วนตัวครบ
4. Tab 2: ดาวน์โหลดไฟล์ได้ (signed URL 1 ชม.)
5. Tab 3: กรอก 12-factor → save → reload → ยังอยู่
6. Status dropdown: submitted → reviewing → shortlisted → interview → hired
   - แต่ละ transition: applicant ได้ email (ถ้า domain verified)
   - review_notes audit trail เขียน `[ts] old → new by <name>` ต่อท้าย

### 2.5 Sidebar polish (nice-to-have)

- Leave inbox ไม่มี badge count — ถ้าอยาก add นี่ ~50 LoC (ต้อง fetch per layout render)
- Applicants count badge — ไม่มี (อาจไม่จำเป็น)

---

## 3. Env vars checklist (Vercel production)

```
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL         = https://cluirxjykhchthcpgosz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    = eyJ...
SUPABASE_SERVICE_ROLE_KEY        = eyJ...

# Email delivery (Phase 2 critical — see §2.1)
RESEND_API_KEY                   = re_xxx
EMAIL_FROM                       = EBCI Careers <careers@ebcinext.com>
EMAIL_REPLY_TO                   = hr@ebcitrade.com
HR_NOTIFY_EMAIL                  = tumyen@gmail.com

# App host (for absolute URLs in emails)
NEXT_PUBLIC_APP_URL              = https://ebci-nexus.vercel.app
```

---

## 4. Key files cheat sheet

```
src/
├── app/
│   ├── careers/
│   │   ├── apply/                           # Full 5-step form
│   │   │   ├── page.tsx
│   │   │   ├── apply-form.tsx               # Main shell
│   │   │   ├── form-types.ts                # SAVABLE_FIELDS + defaults
│   │   │   ├── use-autosave.ts              # 3s debounce + flush
│   │   │   ├── signature-pad.tsx            # react-signature-canvas wrapper
│   │   │   ├── document-upload.tsx          # Reusable file upload
│   │   │   ├── fields.tsx                   # Shared form primitives
│   │   │   ├── success/page.tsx             # Confirmation page
│   │   │   └── steps/step{1..5}-*.tsx       # Individual step components
│   │   └── layout.tsx                       # Careers public layout + logo
│   ├── hradmin/
│   │   ├── applicants/
│   │   │   ├── page.tsx                     # Card grid
│   │   │   ├── applicants-view.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx                 # Server, re-signs URLs
│   │   │       └── detail-view.tsx          # 3 tabs client view
│   │   └── leave/policies/                  # Policy mgmt
│   ├── portal/
│   │   └── leave/
│   │       ├── page.tsx                     # My leave (Phase 1)
│   │       ├── my-leave-view.tsx
│   │       └── inbox/
│   │           ├── page.tsx                 # Approver inbox
│   │           └── inbox-view.tsx
│   └── api/
│       ├── careers/apply/
│       │   ├── start/ · resume/
│       │   └── [id]/{autosave,upload,submit}
│       ├── hradmin/
│       │   ├── applicants/[id]/{status,evaluate}
│       │   └── leave/policies/{...CRUD, preview, calculate, apply}
│       └── leave/
│           ├── inbox/
│           ├── my/ · balance/[year]/ · submit/
│           └── [id]/{approve,reject,cancel}
├── components/hradmin/applicants/
│   ├── StatusBadge.tsx · StatusDropdown.tsx
│   ├── InterviewEvaluation.tsx · FilesList.tsx
└── lib/
    ├── careers-emails.ts                    # 8 templates
    ├── careers-sanitize.ts                  # Empty→null for dates/nums
    ├── careers-ownership.ts                 # verifyOwnership(id, ref)
    ├── applicant-status.ts                  # Transition state machine
    ├── applicant-files.ts                   # refreshSignedUrl
    ├── interview-factors.ts                 # 12 factor labels
    ├── email-leave.ts                       # 5 templates
    ├── leave-approval.ts                    # resolveLeaveApprover
    ├── leave-balance.ts                     # adjustPendingDays
    ├── leave-validations.ts                 # 7 rules + overlap
    └── session-employee.ts                  # 3-tier employee ID resolver
```

---

## 5. Quirks + lessons from today

1. **Fire-and-forget emails die on Vercel.** Always `await Promise.allSettled` +
   surface `email_sent` flags. Hit this twice today (careers submit + leave submit).

2. **`onboarding@resend.dev` only delivers to Resend account owner.**
   Any test with external email silently drops. Must verify domain first.

3. **Empty string `''` in date/numeric columns → Postgres 22007 error.**
   Client forms default to `''` for unfilled fields. Always sanitize server-side
   (see `src/lib/careers-sanitize.ts`). Same class of bug could hit Leave if
   Phase 3 adds date columns — reuse the same helper pattern.

4. **Signed URLs expire.** Upload signs for 7 days, but admin might review weeks
   later. Server pages re-sign at request time — see `src/lib/applicant-files.ts`.
   Leave attachments use the same pattern implicitly (the `/leave/inbox` API
   trusts the stored URL for now; could break if inbox is visited > 7 days
   after upload — fix only when it bites).

5. **Supabase `.update()` race with WHERE guards.** Both approve + reject use
   `.eq('status', 'pending')` on the UPDATE, so a double-click or race between
   two approvers can't double-apply. Same trick works for evaluate + status
   transitions.

6. **Next.js 15 type hint:** dynamic route params changed to `Promise<{...}>`.
   All routes use `await context.params` now.

---

## 6. Recommended first message next session

> "อ่าน `docs/SESSION_HANDOFF_APR23.md` แล้วเริ่มจาก §2.1 — verify email
> delivery ใน Resend dashboard แล้วเทส Leave Phase 2 ตาม §2.4. พอผ่านแล้ว
> ลุย Leave Phase 3 (HR admin dashboard)"

---

*Generated end-of-day 22 เม.ย. 2026 · 23 commits shipped · ship Leave Phase 3 +
test coverage next.*



<a id="section-7"></a>
# §7. SESSION_HANDOFF_APR24.md

*Source: `docs/SESSION_HANDOFF_APR24.md` (241 บรรทัด)*

---

# Session Handoff — 24 เม.ย. 2026 (EBCI Nexus)

> **เปิดไฟล์นี้ก่อนเริ่มงานที่คอมที่บ้าน**
> ต่อจาก `docs/SESSION_HANDOFF_APR23.md` — ไฟล์นี้เป็น delta ของ laptop
> night-session (23 เม.ย.) ที่ปิด Notification Center + topbar polish
> พร้อมแผน next step ที่ชัดสำหรับ Claude session ใหม่.

---

## 0. TL;DR ใน 60 วินาที

**Laptop session ปิด 10 commits · 1 feature track (Notification Center) + UI polish**

1. **Notification Center ครบลูป** — bell + badge + dropdown + 5 API endpoints + hook + wired เข้า leave submit/approve/reject (email chain + in-app noti คู่กัน)
2. **Topbar polish** — ลบ dark-mode toggle · Facebook-style chip icons (rounded-full bg-white/10) · mobile panel ลอยจากด้านบนเหมือน Facebook web
3. **DB schema fix** — drop FK `notifications.recipient_user_id → User(id)` (FK ชี้ไป Prisma CUID ที่ runtime ไปไม่ถึง) · re-seed test notification ด้วย auth UUID

**ไม่ได้ทำ:**
- §2.4 End-to-end test Leave Phase 2 (4 LVs ยังรออยู่ใน DB)
- §2.2 Leave Phase 3 — HR admin dashboard (ยังไม่เริ่ม)
- §2.3 Careers Iter 2 leftovers (download-all zip + review notes autosave)
- Notification Center Phase 2 — ยังไม่ wire careers status changes

---

## 1. สิ่งที่ปิดใน laptop session (since `531dc51`)

| # | Commit | Track | สรุปสั้น |
|---|---|---|---|
| 10 | `16f33ce` | Noti UX | mobile — floating anchored panel (Facebook-style, ไม่ใช่ full-screen) |
| 9  | `1cb6f7d` | Noti UX | (reverted) mobile full-screen sheet |
| 8  | `0412d2d` | Topbar | persistent chip backgrounds (Facebook action-bar feel) |
| 7  | `5b1bb44` | Topbar | (reverted) unified strip rounded-lg |
| 6  | `0d754cb` | Topbar | (reverted) 56 px + gap 4 |
| 5  | `ea67315` | Topbar | (reverted) bump to 48 px |
| 4  | `e15ec5a` | **Noti fix** | use auth UUID for `recipient_user_id` + remove dark-mode toggle |
| 3  | `9f0da3f` | **Noti** | wire leave submit/approve/reject → create notifications |
| 2  | `8ad47d5` | **Noti** | bell icon + dropdown UI in topbar |
| 1  | `d5439be` | **Noti** | database helpers + 5 API endpoints |

หมายเหตุ: commits `5-9` คือการ iterate UI style หลายรอบตาม feedback — ผลลัพธ์สุดท้ายอยู่ใน `0412d2d` (chip style) + `16f33ce` (mobile panel).

### 1.1 Notification Center สรุป scope

**Backend (commit `d5439be`):**
- `src/lib/notifications.ts` — `createNotification()` best-effort wrapper + `getEmployeeUserId` + `resolveSessionUserId` + icon/color defaults
- 5 endpoints: `GET list · GET unread-count · POST [id]/read · POST mark-all-read · DELETE [id]`
- ทุก endpoint session-scoped, expired rows excluded

**UI (commit `8ad47d5`):**
- `src/hooks/useNotifications.ts` — 30s polling, paused on `document.hidden`, optimistic mutations
- `src/components/notifications/` — Bell (badge + chip style) · Dropdown · Item · EmptyState
- Wired ใน `src/components/layout/shell.tsx` topbar

**Wire leave (commit `9f0da3f`):**
- submit → approver gets `leave_request_pending` (amber, Calendar)
- approve → applicant gets `leave_approved` (green, CheckCircle)
- reject → applicant gets `leave_rejected` (red, XCircle)
- ทั้ง 3 ใช้ pattern best-effort try/catch — ไม่ break response ถ้า noti fail

**DB fix (commit `e15ec5a`):**
- **Dropped FKs** ใน Supabase: `notifications_recipient_user_id_fkey` + `notifications_sender_user_id_fkey`
- Re-seeded test row: `recipient_user_id = 9dc14c59-d2a3-4804-abf1-14417507f0dc` (ปอนด์'s auth UUID)
- Simplified `resolveSessionUserId()` → return `session.id` ตรง ๆ
- ปอนด์'s User.id cuid (`cm6ml6x8n...`) ต่างจาก auth UUID — FK เดิมทำให้ resolver ไปถึงไม่ได้

### 1.2 Topbar final style (commit `0412d2d` + `16f33ce`)

**Desktop + mobile:**
- 3 ปุ่ม (Refresh/Bell/Language) เป็น `h-10 rounded-full bg-white/10` chip ตลอดเวลา (ไม่ใช่ hover-only)
- Gap 1.5 (6px) → ติดกันเป็น cluster
- Icons 20px, Globe 20px + "TH" 13px
- Badge bell: 18px red pill

**Mobile dropdown:**
- Floating panel `fixed left-2 right-2 top-[safe-area+56px]` ลอยจากด้านบน
- `max-h-[calc(100dvh-72px)]` กันชน bottom nav
- Backdrop ดำมืด — tap นอก panel = ปิด
- X icon ปิดที่มุมขวา header (desktop ใช้ outside-click)

**Dark-mode toggle ลบออกแล้ว** จาก shell + careers layout + ลบไฟล์ `mode-toggle.tsx`

---

## 2. สิ่งที่ยังไม่เสร็จ — เลือกทางต่อ

### 2.1 ⭐ **OPTION A — Test Leave Phase 2 end-to-end** (แนะนำก่อน)

Noti system ถูก wire แล้ว — ควร test ก่อนว่าทั้ง email + in-app noti ทำงานครบ. ข้อมูล test ยังอยู่ใน DB.

**Test matrix (จาก APR23 §2.4):**

| Step | Login as | Action | Expected |
|---|---|---|---|
| 1 | จิม `thanawatana@ebcitrade.com` / `0863699792` | inbox → approve `LV-2026-0001` | ปอนด์: email "อนุมัติ" + in-app noti + balance pending→used |
| 2 | Sunny `sayan@ebcitrade.com` / … | inbox → reject `LV-2026-0002` (≥10 chars reason) | จอย: email "ปฏิเสธ" + in-app noti + balance คืน |
| 3 | มด `c.arthit@ebcitrade.com` / `0839964333` | inbox → approve `LV-2026-0003` | หวาน: email + in-app noti |
| 4 | ปอนด์ logged in | bell icon badge = 1 (อนุมัติจาก step 1) | click → navigate /portal/leave |

**Time estimate:** 30-45 นาที. ต้อง switch login หลายบัญชี (browser incognito + 3-4 หน้าต่าง).

### 2.2 **OPTION B — Leave Phase 3 (HR admin dashboard)**

Spec: APR23 §2.2. Route `/hradmin/leave/admin` · hr_admin only. ~1500 LoC · เป็น session ใหม่เดี่ยว ๆ.

Scope:
- Tab 1: ภาพรวม (cards + recharts วันลารายเดือน)
- Tab 2: Balance management (table + modal แก้ balance)
- Tab 3: ใบลาทั้งหมด (filters + override approve/reject + CSV export)
- Tab 4 (optional): Leave types read-only

### 2.3 **OPTION C — Notification Center Phase 2 (wire Careers)**

ปัจจุบัน Careers มี 8 email templates ครบ แต่ **ไม่ได้ emit in-app notification**. ทำเพิ่มที่:
- `src/app/api/careers/apply/[id]/submit/route.ts` → HR `application_received`
- `src/app/api/hradmin/applicants/[id]/status/route.ts` → applicant `application_status_changed`
- ใช้ `createNotification()` pattern เดียวกับ leave

**Time estimate:** 20-30 นาที (4-5 call sites · small diffs).

### 2.4 **OPTION D — Careers Iter 2 leftovers** (APR23 §2.3)

- Download-all zip (library: `jszip`, ~150 LoC) — user บอก "DEFER if too complex"
- Review notes auto-save — textarea สำหรับ HR จดโน้ตตลอด (ปัจจุบัน append แค่ตอน status change)
- Tests: status transition edge cases

### 2.5 Deferred / nice-to-have

- Leave inbox count badge on sidebar (~50 LoC)
- `checked_in_at` slice bug ใน `src/app/hradmin/reports/actions.ts:69`
- Vercel usage metrics ใน quota dashboard (needs Vercel API)
- Noti: swipe-to-delete on mobile · group by date · type filter

---

## 3. Key files cheat sheet (delta จาก APR23)

```
src/
├── app/api/notifications/
│   ├── list/route.ts                  # GET items + unread_count + total
│   ├── unread-count/route.ts          # GET cheap count (polled 30 s)
│   ├── mark-all-read/route.ts         # POST RPC mark_all_notifications_read
│   └── [id]/
│       ├── read/route.ts              # POST mark one read
│       └── route.ts                   # DELETE hard delete (owner-scoped)
├── components/notifications/
│   ├── NotificationBell.tsx           # Bell + badge + dropdown trigger
│   ├── NotificationDropdown.tsx       # Responsive panel (desktop drop / mobile floating)
│   ├── NotificationItem.tsx           # Item row (stripe + icon bubble + time ago)
│   └── EmptyState.tsx                 # "ยังไม่มีการแจ้งเตือน"
├── hooks/
│   └── useNotifications.ts            # Polling + optimistic mutations
├── lib/
│   └── notifications.ts               # createNotification + resolvers + icon/color maps
└── components/layout/shell.tsx        # Topbar + bell injection
```

**Modified:**
- `src/app/api/leave/submit/route.ts` — noti after email chain (approver)
- `src/app/api/leave/[id]/approve/route.ts` — noti after email (applicant)
- `src/app/api/leave/[id]/reject/route.ts` — noti after email (applicant)
- `src/components/layout/shell.tsx` — ลบ ModeToggle import + usage
- `src/app/careers/layout.tsx` — ลบ ModeToggle
- `src/components/ui/language-toggle.tsx` — chip style

**Deleted:**
- `src/components/mode-toggle.tsx`

---

## 4. Quirks + lessons

1. **`notifications.recipient_user_id` stores auth UUID ไม่ใช่ User.id cuid.**
   FK เดิมชี้ไป `public."User".id` ที่เป็น CUID จาก Prisma era. Drop FK แล้วใช้ auth UUID ตลอด. `resolveSessionUserId()` ตอนนี้ return `session.id` ตรง ๆ.

2. **ทุก `createNotification()` call wrap ด้วย try/catch ตลอด.**
   Notification เป็น soft side-effect — ถ้าพลาดต้องไม่ break primary action (email + DB update). Pattern จาก `src/app/api/leave/submit/route.ts` ประมาณบรรทัด 260.

3. **Topbar chip style: `bg-white/10` ตลอดเวลา ไม่ใช่แค่ hover.**
   ถ้าเปลี่ยนเป็น transparent จะดูเป็น "ไอคอนลอย" ไม่เป็น cluster. หลักการจาก Facebook action bar.

4. **Mobile dropdown = floating panel, ไม่ใช่ full-screen ไม่ใช่ bottom-sheet.**
   Position: `top: calc(env(safe-area-inset-top,0px) + 56px)` + `left-2 right-2`. Lock body scroll while open.

5. **Pre-existing type errors ใน repo ยังมีอยู่** (embla-carousel, react-signature-canvas typings, reports/actions slice bug, etc.) — ทั้งหมดไม่เกี่ยวกับ noti. ไม่ต้องแก้ในงาน noti.

---

## 5. Env vars checklist (เหมือน APR23 §3)

ทั้งหมด set แล้วบน Vercel production เมื่อบ่าย 22 เม.ย. ไม่ต้องทำซ้ำ:
```
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL
```

Test accounts (ย้ำ):
- Admin: `tumyen@gmail.com / 0000` (ปอนด์/สุริยะ/ม๊อด)
- L1: `l1test@ebci.test / 0000` (หวาน)
- Manager (มด): `c.arthit@ebcitrade.com / 0839964333`
- Manager (จิม): `thanawatana@ebcitrade.com / 0863699792`
- Sunny (คุณพ่อ): `sayan@ebcitrade.com / 0818331367`

---

## 6. Recommended first message (เลือกหนึ่งทาง)

**แนะนำ Option A** (test ก่อนเพราะ noti ยังไม่ผ่าน end-to-end):

> "อ่าน `docs/SESSION_HANDOFF_APR24.md` แล้วทำ §2.1 — test Leave Phase 2
> end-to-end. ช่วยเตรียม SQL query ดูสถานะ 4 LV ก่อน แล้วบอกผมให้ login
> ตามลำดับ + ยืนยันผลแต่ละ step."

**Option B** (ถ้าอยากลุย build):

> "อ่าน `docs/SESSION_HANDOFF_APR24.md` แล้วเริ่ม Leave Phase 3 ตาม §2.2
> — Tab 1 (ภาพรวม) ก่อน. เมื่อครบ tab 1 แล้วค่อย commit + confirm UX
> ก่อนลุย tab 2."

**Option C** (ต่อเนื่องจาก noti):

> "อ่าน `docs/SESSION_HANDOFF_APR24.md` แล้ว wire Careers เข้า Notification
> Center ตาม §2.3 — submit + status change"

---

## 7. Git + deploy state

- Repo: `caserebel-maker/EBCI-Nexus` (branch `main`)
- Last commit: `16f33ce` (mobile floating panel)
- Vercel deploy: auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- Worktree นี้: `.claude/worktrees/beautiful-pasteur-b30921` (branch `claude/beautiful-pasteur-b30921`)
- Push pattern: `git push origin HEAD:main`

**ก่อนเริ่มที่บ้าน:** `git fetch origin && git pull origin main --ff-only` เพื่อ sync

---

*Generated laptop-night 23 เม.ย. 2026 · 10 commits shipped · Leave Phase 2 test + Phase 3 next.
ถ้า home session ทำงานเต็มวัน เขียน `SESSION_HANDOFF_APR25.md` ต่อ ไม่ต้องแก้ไฟล์นี้.*



<a id="section-8"></a>
# §8. SESSION_HANDOFF_APR25.md

*Source: `docs/SESSION_HANDOFF_APR25.md` (282 บรรทัด)*

---

# Session Handoff — 25 เม.ย. 2026 (EBCI Nexus)

> **เปิดไฟล์นี้ก่อนเริ่มงาน session ถัดไป**
> ต่อจาก `docs/SESSION_HANDOFF_APR24.md` — ไฟล์นี้คือ delta ของ morning
> session (23 เม.ย. ~7:30–10:30 บน Office Mac) ที่ปิด 4 commits:
> noti fixes + Leave Phase 3 Tab 1 (Overview dashboard)

---

## 0. TL;DR ใน 60 วินาที

**Morning session ปิด 4 commits · 2 feature tracks**

1. **Notification Center — cleanup + announcement fan-out**
   - ลบ bottom-nav tab "แจ้งเตือน" ซ้ำซ้อนกับ bell dropdown ด้านบน
   - `/portal/notifications` ใช้ `/api/notifications/list` เป็น single source (เลิก Prisma queries บน Announcement+LeaveRequest)
   - `publishAnnouncement()` ยิง `createNotification()` ให้ active employees ทุกคน — emergency/urgent ใช้สี red/amber + title prepend [ฉุกเฉิน]/[ด่วน]

2. **Leave Phase 3 Tab 1 (HR Overview dashboard)**
   - Route ใหม่ `/hradmin/leave` — hr_admin only
   - 4 stats cards + Monthly LineChart + Type Pie + Dept BarChart + Recent Activity
   - Year selector พ.ศ. ↔ ค.ศ. · Server-side Promise.all (5 queries) · force-dynamic
   - Sidebar เพิ่ม "จัดการการลา" (BarChart3 icon) อยู่เหนือ "อนุมัติการลา" เดิม

**ยังไม่ทำ (ลำดับความสำคัญ):**
- ⭐ **§2.1 Leave Phase 2 end-to-end test** — 4 LVs ยัง pending อยู่ใน DB ตั้งแต่ APR23 (ยังไม่มีใคร login approve)
- §2.2 Leave Phase 3 Tab 2 (ใบลาทั้งหมด) — HR view + force-action + CSV export
- §2.3 Leave Phase 3 Tab 3 (วันลาของพนักงาน) — balance grid + adjust modal
- §2.4 Leave Phase 3 Tab 4 (ปฏิทิน) — month view
- §2.5 Careers Iter 2 leftovers — zip download + review notes autosave
- §2.6 Notification Center Phase 2 — wire Careers status changes

---

## 1. Commits ของ morning session

| # | Commit | Track | สรุป |
|---|---|---|---|
| 14 | `61ce108` | **Leave Phase 3** | overview dashboard tab with stats + charts |
| 13 | `57730b4` | **Noti fan-out** | wire `publishAnnouncement` → `createNotification` for all active employees |
| 12 | `586e5cc` | **Noti cleanup** | rewrite `/portal/notifications` as unified full-list page |
| 11 | `d99315c` | **Noti cleanup** | remove duplicate "แจ้งเตือน" bottom nav tab |

(11–14 ต่อจาก `16f33ce` ของ laptop session)

### 1.1 Noti fixes scope (commits 11–13)

**Bottom nav แบบใหม่** (`src/components/layout/portal-bottom-nav.tsx`):

| Role | 4 tabs (+ เพิ่มเติม) |
|---|---|
| employee / manager | หน้าแรก · เช็คอิน · **การลา** · โปรไฟล์ |
| hr_admin (hradmin mode) | หน้าแรก · พนักงาน · ประกาศ · **อนุมัติการลา** |
| hr_admin (portal mode) | หน้าแรก · พนักงาน · ประกาศ · **การลา** |

การลา → `/portal/leave` (CalendarDays), อนุมัติการลา → `/hradmin/leave/admin` (ClipboardCheck). ปุ่ม Bell เดียวในมุมขวาบน topbar — ไม่ซ้ำ.

**`/portal/notifications` เขียนใหม่** (`page.tsx` + `notifications-client.tsx`):
- Server page = thin session-gate shim
- Client เรียก `/api/notifications/list?limit=20&offset=...&unread_only=...`
- Filter pills: ทั้งหมด / ยังไม่อ่าน / อ่านแล้ว (read filter ทำ client-side)
- Pagination "โหลดเพิ่ม" · Optimistic markRead/markAllRead/remove
- ใช้ component `<NotificationItem>` เดียวกับ bell dropdown

**Announcement fan-out** (`src/app/hradmin/hr/actions.ts`):
```ts
// Fires after insert, before email broadcast
const jobs = recipients.map(r => createNotification({
    recipient_user_id: r.user_id as string,
    type: 'announcement',
    title: (priority === 'emergency' || priority === 'urgent')
        ? `[${priorityLabelTh(priority)}] ${headline}` : headline,
    body: content.slice(0, 157).trimEnd() + '…',
    action_url: '/portal/announcements',
    action_label: 'ดูประกาศ',
    entity_type: 'announcement',
    entity_id: announcement.id,
    icon: 'Megaphone',
    color: priorityToNotificationColor(priority),
    sender_name: 'ฝ่ายบุคคล',
}))
await Promise.allSettled(jobs)  // per-recipient failure = log only
```
Priority → color: `emergency=red, urgent=amber, promote/internal=blue`.

### 1.2 Leave Phase 3 Tab 1 scope (commit 14)

**Route:** `/hradmin/leave` — hr_admin only (non-admin redirect `/hradmin/dashboard`)

**Tabs:**
```
[ภาพรวม]   [ใบลาทั้งหมด]      [วันลาของพนักงาน]   [ปฏิทิน]
  ↑active    ↑disabled          ↑disabled          ↑disabled
```
Disabled tabs: `title="ในเร็วๆ นี้"` · `cursor-not-allowed` · badge lofted on hover (desktop)

**5 sections บน Tab 1:**

1. **Stats cards × 4** (grid 2×2 mobile / 4-col desktop)
   - ใบลาทั้งหมด + YoY delta (↑/↓ % vs ปีก่อน, null = ปีแรก)
   - รอการอนุมัติ + "ควรตรวจสอบ" warning tone
   - อนุมัติแล้ว + % ของทั้งหมด
   - อัตราการใช้สิทธิ์ = avg(used+pending / total) ทุก balance row ที่ total > 0 + hint "ลาพักร้อนเฉลี่ย X วัน"

2. **Monthly Trend** — Recharts LineChart 12 เดือน × all active leave_types, legend click toggle visibility, count = approved + pending

3. **Leave Type Distribution** — Recharts PieChart donut, approved only, center total + legend list with count/%, hover highlight

4. **Top 5 Departments** — Recharts horizontal BarChart, maroon gradient (dark→light), sum total_days approved only

5. **Recent Activity** — last 10 requests ทุก status, avatar + action phrase + status pill + "ดูทั้งหมด →" ไป `/hradmin/leave/admin`

**Year Selector** — `?year=2026` querystring · display เป็น พ.ศ. 2569 · `useTransition` spinner ตอน RSC re-fetch

**Architecture:**
- `page.tsx` (server, force-dynamic): 1× `Promise.all` ยิง 5 queries (curRequests, prevYearCount, employees, leaveTypes, balances) + in-memory aggregation → props ส่งให้ client
- `overview-view.tsx` (client): แค่ render — ไม่ยิง API เพิ่ม
- Chart color: `leave_types.color` ก่อน, fallback palette in `palette.ts` keyed by display_order

**Files (9 ใหม่ + 1 แก้):**
```
src/app/hradmin/leave/
├── page.tsx                            # server + auth + data fetch
└── overview-view.tsx                   # client shell + tabs + section grid
src/components/hradmin/leave/
├── StatsCard.tsx                       # icon bubble + value + hint tone
├── MonthlyTrendChart.tsx               # LineChart + legend toggle
├── LeaveTypePie.tsx                    # donut + legend list
├── DepartmentBarChart.tsx              # horizontal bars, maroon gradient
├── RecentActivityList.tsx              # avatar + action phrase + pill
├── YearSelector.tsx                    # BE display / CE storage
└── palette.ts                          # shared color resolver
src/config/navigation.tsx               # + "จัดการการลา" (BarChart3)
```

---

## 2. ยังเปิดอยู่ — ลำดับทำต่อ

### 2.1 ⭐ **Leave Phase 2 end-to-end test** (แนะนำก่อน)

ยังไม่เคย run test แม้จะ ship มาตั้งแต่ APR23 — 4 LVs ยัง pending ใน DB · email + in-app noti pathway ยังไม่ยืนยัน.

**Test matrix:**

| Step | Login as | Action | Expected |
|---|---|---|---|
| 1 | จิม `thanawatana@ebcitrade.com` / `0863699792` | inbox → approve `LV-2026-0001` | ปอนด์: email "อนุมัติ" + in-app noti + balance pending→used |
| 2 | Sunny `sayan@ebcitrade.com` / `0818331367` | inbox → reject `LV-2026-0002` (≥10 chars reason) | จอย: email "ปฏิเสธ" + in-app noti + balance คืน |
| 3 | มด `c.arthit@ebcitrade.com` / `0839964333` | inbox → approve `LV-2026-0003` | หวาน: email + in-app noti |
| 4 | ปอนด์ logged in | bell icon badge = 1 | click → navigate /portal/leave |

**Time:** 30–45 นาที · ต้อง switch login หลายบัญชี (incognito + หลายหน้าต่าง)

### 2.2 Leave Phase 3 Tab 2 — "ใบลาทั้งหมด"

- Table/grid ของ leave_requests ทุก status · filters (status, type, department, date range) · pagination
- Force approve/reject override (HR bypasses approver)
- CSV export (ใช้ `/api/leave/export` เดิมเป็น base)
- Create on behalf of employee (modal + form)
- **Est:** ~1.5 hr

### 2.3 Leave Phase 3 Tab 3 — "วันลาของพนักงาน"

- Balance table 54 emp × 5 types (pivot หรือ expandable row)
- Manual adjust (modal): input delta + reason → audit trail ใน notes
- Yearly reset (admin button): copy entitlement จาก `leave_types.default_days_per_year` ไป new year balances
- **Est:** ~1 hr

### 2.4 Leave Phase 3 Tab 4 — "ปฏิทิน"

- Calendar month view · แต่ละ day คาดด้วยสีตาม density (0/low/med/high)
- Click day → popover list ของคนลาวันนั้น (nickname + leave_type + dates overlap)
- Holiday overlay (dim + "วันหยุด" label)
- **Est:** ~1.5 hr

### 2.5 Careers Iter 2 leftovers (จาก APR23 §2.3)

- Download-all zip ของ documents ของ applicant (lib `jszip`, ~150 LoC)
- Review notes autosave (textarea แยกจาก status change trail)
- End-to-end status workflow test (ยังไม่ผ่าน)

### 2.6 Notification Center Phase 2 — Wire Careers

ปัจจุบัน Careers มี 8 email templates แต่ยังไม่ emit in-app noti. ต้องแก้ 2 call sites:
- `src/app/api/careers/apply/[id]/submit/route.ts` → HR ได้ `application_received` noti
- `src/app/api/hradmin/applicants/[id]/status/route.ts` → applicant ได้ `application_status_changed` noti

ใช้ `createNotification()` pattern เดียวกับ leave. **Est:** 20–30 นาที.

### 2.7 Deferred / nice-to-have (จาก APR24 §2.5)

- Leave inbox count badge บน sidebar (~50 LoC)
- `checked_in_at` slice bug ใน `src/app/hradmin/reports/actions.ts:69`
- Vercel usage metrics ใน quota dashboard (ต้อง Vercel API)
- Noti: swipe-to-delete mobile · group by date · type filter
- Pre-existing TS errors (embla-carousel, react-signature-canvas) — ไม่เกี่ยวกับงานใหม่

---

## 3. Recommended first message (session ถัดไป)

**⭐ แนะนำ §2.1** (test ก่อน — feature ship มา 2 วันแล้วยังไม่ verify):

> "อ่าน `docs/SESSION_HANDOFF_APR25.md` แล้วทำ §2.1 — test Leave Phase 2
> end-to-end. ช่วยเตรียม SQL query ดูสถานะ 4 LV ก่อน แล้วบอกผมให้ login
> ตามลำดับ + ยืนยันผลแต่ละ step."

**Alternate — §2.2** (ถ้าอยาก build ต่อ):

> "อ่าน `docs/SESSION_HANDOFF_APR25.md` แล้วเริ่ม Leave Phase 3 Tab 2
> ตาม §2.2 — ใบลาทั้งหมด · table/grid + filters + force action + CSV."

**Alternate — §2.6** (20–30 นาที ปิดงานเล็ก):

> "อ่าน `docs/SESSION_HANDOFF_APR25.md` แล้ว wire Careers เข้า Notification
> Center ตาม §2.6 — submit + status change · ใช้ pattern เดียวกับ leave."

---

## 4. Key quirks learned morning session

1. **Announcement fan-out ใช้ Promise.allSettled, ไม่ใช่ Promise.all.**
   ถ้า recipient 1 คน `createNotification` fail (เช่น user_id null/duplicate) ต้องไม่ทำให้ publish ล้มทั้งชุด. `createNotification()` เอง swallow errors อยู่แล้ว (return null) — การ wrap อีกชั้นด้วย allSettled กันกรณี unexpected throw.

2. **Year selector — BE display / CE storage.**
   DB เก็บ Gregorian (2026) · UI แสดง Buddhist Era (2569) · querystring ใช้ Gregorian. Formatter เรียบง่าย: `${year + 543} (${year})` ใน option label. อย่าผสมกัน — UI ต้อง CE→BE เวลา render · BE→CE เวลา parse.

3. **Server-side Promise.all สำหรับ dashboard aggregates.**
   Tab 1 ยิง 5 queries พร้อมกันใน `page.tsx` แล้ว aggregate in-memory · client แค่ render. ไม่ต้องมี separate API route ต่อ section · ลด round-trips · อ่านง่ายกว่า. Pattern นี้ใช้ซ้ำได้สำหรับ Tab 2/3/4.

4. **"แจ้งเตือน" tab ซ้ำ = user confusion.**
   Bell ที่ topbar + tab ที่ bottom nav = ดูเหมือน 2 inbox ต่างกัน (แต่จริง ๆ ชี้ที่เดียว). การลบ tab + เปลี่ยนเป็น "การลา"/"อนุมัติการลา" ให้ meaningful discovery ดีกว่า. Lesson: bottom nav ควรเป็น destinations ที่ไม่ซ้ำกับ persistent UI อื่น.

5. **`leave_requests.leave_type_id` ไม่ใช่ `leave_type` (string).**
   Prisma schema รุ่นเก่ายังมี `leave_type: string` (legacy) แต่ code ใหม่ทั้งหมด (approve, reject, submit, inbox, overview) join ผ่าน `leave_type_id` → `leave_types` table. งาน Tab 2/3/4 ต้องระวังตรงนี้.

6. **Recharts + dynamic dataKey.**
   Monthly chart คีย์ `dataKey={t.id}` (UUID) — ทำงานได้ แต่ tooltip/legend ต้องมี formatter ที่ลุกล้อ `leaveTypes.find(x => x.id === key)?.name_th` แปลงกลับ. ถ้าไม่มี formatter จะโชว์ UUID ให้ user เห็น.

---

## 5. Env vars + test accounts (คงเดิมจาก APR24 §5)

ทุกตัว set บน Vercel production แล้ว ไม่ต้อง re-config:
```
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL
```

Test accounts:
- Admin: `tumyen@gmail.com / 0000` (ปอนด์/สุริยะ/ม๊อด)
- L1: `l1test@ebci.test / 0000` (หวาน)
- Manager (มด): `c.arthit@ebcitrade.com / 0839964333`
- Manager (จิม): `thanawatana@ebcitrade.com / 0863699792`
- Sunny (คุณพ่อ): `sayan@ebcitrade.com / 0818331367`

---

## 6. Git + deploy state

- Repo: `caserebel-maker/EBCI-Nexus` (branch `main`)
- **Last commit:** `61ce108` (Leave Phase 3 Tab 1)
- Vercel deploy: auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- Worktree นี้: `.claude/worktrees/priceless-heisenberg-55cb19`
- Push pattern: `git push origin HEAD:main`

**ก่อนเริ่ม session ถัดไป:** `git fetch origin && git pull origin main --ff-only`

---

## 7. Build state

- **Routes:** 34 ทั้งหมด (เพิ่ม `/hradmin/leave` 1 route จาก APR24)
- Build ผ่านด้วย Next 16.2.2 (Turbopack) · compile 3.8s · static pages 33/33
- ไม่มี TS/lint error ใหม่ · pre-existing warnings คงเดิม (workspace root, middleware→proxy)

---

*Generated morning 23 เม.ย. 2026 (Office Mac) · 4 commits shipped ·
Notification Center consolidation + Leave Phase 3 Tab 1 (Overview).
Session ถัดไป: §2.1 Test ก่อน หรือ §2.2 Build Tab 2.*



<a id="section-9"></a>
# §9. SESSION_HANDOFF_APR25_HOME.md

*Source: `docs/SESSION_HANDOFF_APR25_HOME.md` (213 บรรทัด) — **ล่าสุด***

---

# Session Handoff — 25 เม.ย. 2026 (Office → Home)

> **เปิดไฟล์นี้ก่อนเริ่มงานที่บ้าน**
> ต่อจาก `docs/SESSION_HANDOFF_APR25.md` (เขียนเช้า) + session ช่วงบ่าย-เย็นที่ office
> ship อีก 9 commits. ไฟล์นี้คือ delta ของ afternoon/evening block.

---

## 0. TL;DR ใน 60 วินาที

**Office session ปิด 9 commits · 5 feature tracks ต่อเนื่อง**

1. **Sidebar consolidation** — 13 flat items → 7 domain groups (expandable, localStorage-persisted)
2. **Inbox fix + badge system** — จิม's inbox empty bug · amber pending-count pill บน "อนุมัติการลา"
3. **Notification backfill** — 4 legacy pending leaves ได้ noti row
4. **Role-correct approver inbox** — `/hradmin/leave/inbox` ใหม่ (admin shell) · hr_admin sidebar/bottom-nav/deep-link ชี้ไปที่นี่แทน `/portal/*`
5. **Email sender identities** — careers/hr/system แยกกัน · คงไม่ให้ leave email ส่งจาก `careers@ebcinext.com`

**พรุ่งนี้ควรทำอะไรต่อ (เรียงตามความสำคัญ):**
- ⭐ **§2.1 Vercel env vars** — ต้อง set 3 ตัวใหม่ก่อน test email ด้วย identity ใหม่
- **§2.2 Leave Phase 2 end-to-end test** — 4 LVs ยัง pending ใน DB ตั้งแต่ APR23 · ยังไม่เคย verify email + balance transition ครบ
- **§2.3 Leave Phase 3 Tabs 2/3/4** — sidebar links พร้อมแล้ว (`?tab=requests|balances|calendar`) · page ยังไม่ implement tabs เหล่านี้
- **§2.4 Careers wiring เข้า Notification Center** (20–30 นาที · งานเล็ก)

---

## 1. Commits ของ afternoon/office session

| # | Commit | Track | สรุป |
|---|---|---|---|
| 23 | `76a0177` | **Action URL** | migration role-aware action_url (SQL CASE on auth.users role) |
| 22 | `079e349` | **Action URL** | submit route ใช้ `resolveApproverInboxUrl()` |
| 21 | `0c69700` | **Action URL** | helper `src/lib/leave-inbox-url.ts` |
| 20 | `dcccec1` | **Email** | EMAIL_SENDERS map + 3 identities (careers/hr/system) |
| 19 | `dba4ffa` | **Nav** | hr_admin sidebar/bottom-nav → `/hradmin/leave/inbox` |
| 18 | `3398122` | **Admin shell** | new `/hradmin/leave/inbox` route (reuses InboxView) |
| 17 | `4130a68` | **Seed** | backfill 4 pending leave noti rows |
| 16 | `b885445` | **Badges** | sidebar pending-count pill + `/api/leave/pending-count` |
| 15 | `6f69dbd` | **Bug fix** | inbox query + session resolver hardening |
| 14 | `a130674` | **Nav** | consolidate 13 → 7 sidebar groups |

(15–23 ต่อจาก `6804ff9` ของ morning session)

---

## 2. สิ่งที่ยังเปิดอยู่ — ลำดับทำต่อ

### 2.1 ⭐ Vercel env vars — ต้องทำก่อนทุกอย่าง

**เพิ่ม 3 ตัวใหม่บน Vercel (Production + Preview):**
```bash
EMAIL_FROM_CAREERS = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR      = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM  = "EBCI System <no-reply@ebcinext.com>"
```

**DNS check** — ถ้า `ebcinext.com` verified บน Resend (SPF/DKIM/MX ครบ) ทุก address บน domain จะส่งผ่าน. ถ้าไม่ → ส่ง bounces เข้า Resend dashboard → ต้อง verify เพิ่ม.

**Fallback behavior:** ถ้าไม่ set ตัวใดตัวหนึ่ง → fallback ไป `EMAIL_FROM` เดิม (ยังส่งได้ แค่ไม่แยก identity)

**Reply-To:** `EMAIL_REPLY_TO=hr@ebcitrade.com` คงเดิม ไม่ต้องแตะ.

### 2.2 Leave Phase 2 end-to-end test (แนะนำทำ)

4 LVs ยัง pending ใน DB ตั้งแต่ 23 เม.ย. (ก่อนลง fixes วันนี้) · ยังไม่ verify ว่า email + in-app noti + balance transition ครบถ้วน.

**Test matrix** (พร้อม URL ใหม่แล้ว):

| Step | Login | Path | Action | ตรวจ |
|---|---|---|---|---|
| 1 | จิม `thanawatana@ebcitrade.com / 0863699792` | `/hradmin/leave/inbox` | approve `LV-2026-0001` (ปอนด์ ลากิจ 25/4) | email "อนุมัติ" → ปอนด์ (from `hr@ebcinext.com`) + bell noti + balance pending→used |
| 2 | Sunny `sayan@ebcitrade.com / 0818331367` | `/hradmin/leave/inbox` (Sunny role = ?) | reject `LV-2026-0002` (จอย ลาพักร้อน) | ถ้า Sunny เป็น manager (ไม่ใช่ hr_admin) → URL `/portal/leave/inbox` แทน · email "ปฏิเสธ" → จอย · balance คืน |
| 3 | มด `c.arthit@ebcitrade.com / 0839964333` | `/hradmin/leave/inbox` (มด = hr_admin) | approve `LV-2026-0003` (หวาน ลาป่วย) | email + balance pending→used |
| 4 | ปอนด์ logged in | topbar bell + sidebar | — | badge = 1 ใหม่ (อนุมัติจาก step 1) · sidebar "อนุมัติการลา" ไม่มี pending pill (ปอนด์ไม่ใช่ approver ของใคร) |

Time: 30–45 นาที · ต้อง switch login หลายบัญชี (incognito + 3-4 หน้าต่าง)

### 2.3 Leave Phase 3 — Tabs 2/3/4

Sidebar "การลา" group ใน `src/config/navigation.tsx` มี child links พร้อมแล้ว:
- `/hradmin/leave?tab=requests` → **ใบลาทั้งหมด** (ยังไม่ implement)
- `/hradmin/leave?tab=balances` → **วันลาพนักงาน** (ยังไม่ implement)
- `/hradmin/leave?tab=calendar` → **ปฏิทิน** (ยังไม่ implement)

ตอนนี้ page `/hradmin/leave/overview-view.tsx` hardcode `activeTab: TabKey = 'overview'` · ?tab= param ยัง ignore. ต้อง:
1. อ่าน `useSearchParams()` → resolve activeTab
2. Render tab panel ตาม activeTab (แทนที่จะ render overview ตลอด)
3. Build แต่ละ tab:
   - **Tab 2 ใบลาทั้งหมด** (~1.5 ชม) — table + filters + force action + CSV export
   - **Tab 3 วันลาพนักงาน** (~1 ชม) — balance grid + adjust modal + yearly reset
   - **Tab 4 ปฏิทิน** (~1.5 ชม) — month view + density coloring + day popover

### 2.4 Notification Center Phase 2 — Wire Careers

งานเล็กปิดได้ใน session เดียว (~20–30 นาที). Careers email templates 8 ตัวครบแล้วแต่ไม่ emit in-app noti. ต้องแก้ 2 call sites:
- `src/app/api/careers/apply/[id]/submit/route.ts` → HR ได้ `application_received` noti
- `src/app/api/hradmin/applicants/[id]/status/route.ts` → applicant ได้ `application_status_changed` noti

ใช้ pattern เดียวกับ leave submit (ใน `src/app/api/leave/submit/route.ts` ~line 257) — `createNotification()` ห่อด้วย try/catch · best-effort side-effect.

### 2.5 Deferred / nice-to-have

- Leave approver email button (`src/lib/email-leave.ts:238`) ยัง hardcode `/portal/leave/inbox` ใน link — ถ้า approver = hr_admin click ผิด shell. Fix ได้โดย resolve URL ก่อนเรียก email builder. (ไม่ block อะไร)
- `src/config/navigation.tsx:96, 105` — manager/employee variant "อนุมัติการลา" ยังไปที่ `/portal/leave/inbox` · ตั้งใจ (correct for plain managers)
- `checked_in_at` slice bug ใน `src/app/hradmin/reports/actions.ts:69` (pre-existing)
- Careers Iter 2: zip download + review notes autosave
- Pre-existing TS errors (embla-carousel, react-signature-canvas) — ไม่เกี่ยวกับงานใหม่

---

## 3. วิธีใช้ handoff ที่บ้าน (3 ขั้นตอน)

**ขั้น 1:** pull main (worktree ที่บ้านอาจยัง behind)
```bash
cd /path/to/EBCI-Nexus-App
git fetch origin
git pull origin main --ff-only
```

**ขั้น 2:** เปิด Claude Code แล้ว paste ข้อความเริ่ม (เลือก 1 ใน 4 ด้านล่าง ตามที่อยากทำ)

**ขั้น 3:** Claude จะอ่าน doc แล้วทำตามที่เลือก

### 🎯 Recommended first messages (เลือก 1 อัน)

**Option A — เริ่ม Vercel env vars ก่อน (แนะนำที่สุด — 5 นาที):**
> "อ่าน `docs/SESSION_HANDOFF_APR25_HOME.md` แล้วเตรียม checklist + คำสั่ง `vercel env add` สำหรับ §2.1 ให้ผม copy ไปรัน. อย่าเพิ่ง push อะไร — ผมจะรันเอง."

**Option B — test Leave Phase 2 end-to-end (30–45 นาที):**
> "อ่าน `docs/SESSION_HANDOFF_APR25_HOME.md` แล้วทำ §2.2 — test Leave Phase 2 end-to-end. ช่วยเตรียม SQL query ดูสถานะ 4 LV ก่อน แล้วบอกผมให้ login ตามลำดับ + ยืนยันผลแต่ละ step. ระหว่าง test ถ้าเจอ bug ให้ fix ทันที."

**Option C — ลุย Leave Phase 3 Tab 2 (1.5 ชม):**
> "อ่าน `docs/SESSION_HANDOFF_APR25_HOME.md` แล้วเริ่ม Leave Phase 3 Tab 2 ตาม §2.3 — ใบลาทั้งหมด · table + filters (status/type/department/date) + force approve/reject override + CSV export. Read overview-view.tsx ก่อนให้เข้าใจ tab routing pattern."

**Option D — งานเล็กปิด Careers noti (20–30 นาที):**
> "อ่าน `docs/SESSION_HANDOFF_APR25_HOME.md` แล้วทำ §2.4 — wire Careers เข้า Notification Center. 2 call sites: careers submit + status change. ใช้ pattern เดียวกับ `src/app/api/leave/submit/route.ts` line 257 · best-effort try/catch."

---

## 4. Key quirks learned afternoon session

1. **`resolveApproverInboxUrl()` ต้อง fail-safe.**
   Lookup role จาก `auth.users.user_metadata.role` (+ `app_metadata` fallback). ทุก failure → return `/portal/leave/inbox` (universal). อย่า throw — จะทำให้ submit ล้ม.

2. **Sidebar badge polling ใช้ pattern เดียวกับ bell.**
   `usePendingApprovalCount()` poll 60s · pause on `document.hidden` · optimistic fail (keep last count). Badge bubble-up จาก child "อนุมัติการลา" ไป parent "การลา" เมื่อ group collapsed.

3. **session.employeeId อาจ stale.**
   Commit `6f69dbd` hardening: `resolveSessionEmployeeId()` verify ว่า employee row ที่ได้มี `user_id === session.id` ก่อน trust. ถ้าไม่ตรง → fall through ไป lookup ใหม่ + log warning.

4. **Legacy approver_id pathway.**
   มี leave_requests บาง row ที่ approver_id เก็บ auth UUID แทน employees.id (legacy). Inbox API + pending-count API มี secondary fallback: query ด้วย session.id ถ้า primary ด้วย employees.id คืน 0 rows.

5. **Email wrapper function per domain.**
   แทนที่จะ pass `sender: 'hr'` ทุก call site · สร้าง `sendLeaveEmail()` / `sendCareersEmail()` wrapper ในแต่ละไฟล์ → callers ไม่ต้องรู้ key · refactor อนาคตง่าย.

6. **Sidebar nested render pre-hydration fallback.**
   `hydrated` state mirror active group expansion · ก่อน hydrate → mirror `isGroupActive()` result · ไม่ flash groups collapsed ตอน SSR paint.

---

## 5. Env vars + test accounts (คงเดิม)

```
# Existing (already set on Vercel):
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL

# NEW — ต้อง set ที่บ้าน (§2.1):
EMAIL_FROM_CAREERS = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR      = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM  = "EBCI System <no-reply@ebcinext.com>"
```

Test accounts:
- Admin: `tumyen@gmail.com / 0000` (ปอนด์/สุริยะ/ม๊อด)
- L1: `l1test@ebci.test / 0000` (หวาน)
- Manager (มด): `c.arthit@ebcitrade.com / 0839964333`
- Manager (จิม): `thanawatana@ebcitrade.com / 0863699792`
- Sunny (คุณพ่อ): `sayan@ebcitrade.com / 0818331367`

---

## 6. Git + deploy state

- Repo: `caserebel-maker/EBCI-Nexus` (branch `main`)
- **Last commit:** `76a0177` (role-aware backfill migration)
- Vercel deploy: auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- Worktree office: `.claude/worktrees/priceless-heisenberg-55cb19`
- Push pattern: `git push origin HEAD:main`

**ก่อนเริ่มที่บ้าน:** `git fetch origin && git pull origin main --ff-only`

---

## 7. Build + route state

- **Routes:** 36 ทั้งหมด (+2 จาก morning: `/hradmin/leave/inbox`, `/api/leave/pending-count`)
- Build ผ่าน Next 16.2.2 (Turbopack) · compile ~4s
- ไม่มี TS/lint error ใหม่ · pre-existing warnings คงเดิม

---

## 8. DB state สำคัญ

- **4 leave_requests** ยัง pending (LV-2026-0001..0004) — รอ test §2.2
- **4 notifications** `type=leave_request_pending` — action_url ถูกต้องแล้ว (`/hradmin/leave/inbox` ทั้งหมดเพราะทุก approver เป็น hr_admin)
- **0 บน Vercel:** 3 env vars ใหม่ (EMAIL_FROM_CAREERS/HR/SYSTEM) — ต้อง set

---

*Generated afternoon/evening 25 เม.ย. 2026 (Office Mac) · 9 commits shipped ·
Session ปิดที่ action_url fix. ถึงบ้านเปิดไฟล์นี้ → pull main → เลือก Option A/B/C/D ด้านบน.*



---

## 📌 สิ้นสุด Session History (เก่า)

ไฟล์ต้นฉบับทั้ง 9 ไฟล์ยังอยู่ในตำแหน่งเดิม — ไฟล์นี้แค่รวมไว้สำหรับอ่านย้อนหลังสะดวก.

> **เปลี่ยนกฎใหม่ตั้งแต่ §10:** ห้ามสร้าง `SESSION_HANDOFF_*.md` แยกอีก
> session ใหม่ทุกครั้งให้ overwrite `docs/NEXT.md` + append บล็อกสรุปลงในไฟล์นี้แทน
> (กฎนี้ระบุไว้ใน `CLAUDE.md` repo root)

---



<a id="section-10"></a>
# §10. APR25 (Home night) — Leave Tab 4 + Careers Notifications

*Source: this file directly (no separate handoff per CLAUDE.md rule).*
*Date: 2026-04-25 evening at home (continuing from §9 which closed at office).*
*Branch: `main` (worktree `claude/priceless-heisenberg-55cb19`).*
*Commits shipped: 4.*

---

## 0. TL;DR

| Track | What |
|---|---|
| Leave Tab 4 (ปฏิทิน) | Month grid + per-day event stack + day-detail modal + filters (dept/leave_type/status default approved+pending) — replaces "ในเร็วๆ นี้" stub. Holidays best-effort (table doesn't exist on this DB → silently empty). |
| Careers → Notification Center | `application_received` fan-out to all `role='hr_admin'` users on submit; `application_status_changed` to applicant on status change (best-effort, soft email-match against employees → user_id; usually skipped because applicants aren't employees). |

---

## 1. Commits ของ session นี้ (เรียงจากใหม่ → เก่า)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 4 | `615a9d0` | Careers | wire status change → applicant notification (best-effort, email-match lookup, skip if no linkage) |
| 3 | `c692160` | Careers | wire applicant submit → HR notification (fan out to all hr_admin users, mod excluded until permission-flag routing lands) |
| 2 | `550c431` | Leave Tab 4 | activate Tab 4 link in overview/requests/balances tab navs; drop "ในเร็วๆ นี้" footnote + unused Info import |
| 1 | `cf60c6b` | Leave Tab 4 | calendar month view — server fetch (overlap window), client grid + popover modal, filter chips (dept + leave_type), holidays best-effort |

(4 ต่อจาก §9's last commit `cac1b31` = APR25_HOME)

---

## 2. สิ่งที่เพิ่งส่งมอบ — ใช้งานได้จริงแล้ว

### Tab 4: ปฏิทิน (`/hradmin/leave?tab=calendar`)
- Month grid (7 cols × 5–6 rows) with weekend tint (rose), today highlight (maroon), holiday rose-tinted cells
- Each day cell: date number + event count badge + up to 3 avatar dots colored by leave_type + "+N" overflow chip
- Click day → modal listing every leave touching that date (avatar, employee name with nickname, dept, leave_type pill, status pill, multi-day range, half-day annotation), each row links into Tab 2 by reference code
- Filter chips: leave_type (with color dot from `palette.ts`) + department; "all-active" semantic when none selected
- URL: `?month=YYYY-MM` (defaults to today's month if `year=current`, else Jan); `?status=` defaults to `approved+pending` per spec
- Server: single `Promise.all`, requests overlapping the visible month, employees + leave_types + holidays. Holidays fetch wrapped to silently empty if table missing.
- Reuses: `YearSelector`, `formatEmployeeName` + `employeeInitials`, `resolveLeaveColor` (palette), `STATUS_META` (types)

### Careers — `application_received` (HR)
- Fires after the row is flipped to `submitted` and the two careers emails dispatch
- Recipients: every `User` with `role='hr_admin'` (currently only the admin/ปอนด์ row; mod won't get it until route auth itself transitions from role to permission flags)
- Title: `{ชื่อผู้สมัคร} สมัคร{ตำแหน่ง}` · body: `Ref + Thai-formatted submitted date`
- Icon: Briefcase, color: blue, action_url: `/hradmin/applicants/{id}`, sender_name = applicant
- Best-effort: try/catch + `Promise.allSettled` so it can't break the submit response

### Careers — `application_status_changed` (applicant)
- Fires after the status flip + applicant email
- Soft email-match against `employees.email` to derive a `user_id`. Most applicants aren't employees → no row → skip silently.
- When linked: title = `สถานะใบสมัครของคุณเปลี่ยนเป็น "{th label}"`; body = position + Ref + optional notes
- Color tracks status: hired→green, rejected→red, interview/shortlisted→blue, others→amber. Icon: Briefcase. action_url: `/portal/dashboard` (no `/portal/applications` route exists)

---

## 3. สิ่งที่ยังเปิดอยู่ — เรียงตาม priority (carry forward + new)

### 3.1 ⭐ Leave Phase 2 end-to-end test — **ยังเร่งด่วน** (carry from §9)
4 LVs ยัง pending ใน DB ตั้งแต่ Apr 23. ดู §3.1 ของ NEXT.md เก่า — test matrix เดิม ยังใช้ได้.

### 3.2 Vercel env vars ใหม่ — ต้อง set ก่อน test email (carry from §9)
`EMAIL_FROM_CAREERS`, `EMAIL_FROM_HR`, `EMAIL_FROM_SYSTEM`. ใช้ `npx vercel env add ... production` หรือ Dashboard → Settings.

### 3.3 Permission-flag-based route auth (NEW — surfaced by Careers wiring)
`/api/hradmin/applicants/[id]/status` (และ tab อื่นใน /hradmin) ยังเช็ก `session.role !== 'hr_admin'` ตรงๆ. ทำให้ มด (HR Manager preset, role='manager') ถูกบล็อก แม้จะมี permission flags ครบ. ถ้าจะให้ มด ใช้งาน /hradmin ได้ ต้องเปลี่ยน guard เป็น permission-based (`can_edit_employees` / `can_manage_system`). กระทบหลายไฟล์ — ทำเป็น sweep แยก iteration.

### 3.4 Holiday data missing
DB ไม่มีตาราง `holidays` → calendar cells ไม่ highlight วันหยุด (เห็นแต่เสาร์-อาทิตย์). Code ใน calendar tab รองรับแล้ว ถ้า table โผล่ขึ้นมาจะใช้งานได้ทันที. ต้องตัดสินใจว่าจะสร้าง schema + seed หรือใช้ external API.

### 3.5 Bell icon registration for Briefcase
`Briefcase` ถูก hardcode ในการ wire — ตรวจให้แน่ใจว่า `<NotificationItem />` รู้จัก lucide name นี้ใน switch ของ icon mapper. ถ้า fall through default ให้ Bell ก็ยังใช้ได้ (graceful) แต่ดูไม่สวย.

### 3.6 Carryover deferred (จาก §9)
- Bulk adjust balance modal · `email-leave.ts:238` hardcoded `/portal/leave/inbox` (hr_admin จะ click ผิด shell) · Careers Iter 2 zip download + review notes autosave · Pre-existing TS errors (embla-carousel, react-signature-canvas)

---

## 4. Env vars + test accounts (เหมือนเดิม)

ดู §4 ของ NEXT.md (current). Test accounts unchanged from §9.

---

## 5. Git state

- **Last commit:** `615a9d0` (status change → applicant notification)
- **Local main vs origin:** in sync after this session's push
- **Worktree:** `.claude/worktrees/priceless-heisenberg-55cb19` (branch `claude/priceless-heisenberg-55cb19`) — actually NOT used this session, work landed directly on main

---

## 6. Quirks ของ session นี้

1. **Holidays table missing.** `from('holidays')` returns `relation does not exist` on this DB. The portal/calendar page already wraps the call in try/catch; new HR Tab 4 mirrors that with a `.then(ok, err→empty)` adapter so the parallel `Promise.all` doesn't reject. Decision deferred (see §3.4).

2. **`User.username` not `User.email`.** Reaffirms what §1's seed found: `User` table uses `username` (text). Status-change wiring deliberately matches against `employees.email` (which exists), not `User.email` (which doesn't), to find the applicant↔employee linkage.

3. **Cross-month leave spans clip cleanly.** A request that spans Apr 28 → May 3 now shows in BOTH the April and May calendar views — the server expansion clamps each per-day event to the current visible month so cells stay tidy.

4. **`scroll: false` not used in calendar nav.** The month-jump uses `router.replace` without explicit scroll behavior — Next handles it. Filter chip toggles use the same. Watch this on mobile if scroll-to-top jumps annoy.

5. **Status route line-shift.** My edit to `applicants/[id]/status/route.ts` pushed the pre-existing `result.success` TS error from line 100 → line 115. Same error, different line — not introduced by this session.

---

*End of §10 · Session ปิดที่ 4 commits + handoff updated. ถ้าเปิดเครื่องอื่น `git fetch && git pull origin main --ff-only` แล้วอ่าน `docs/NEXT.md` (ไม่ใช่ไฟล์นี้).*



<a id="section-11"></a>
# §11. APR25 (Home night, late) — §3.1 Verification + Reprioritize

*Source: this file. No new commits to source code — only docs updated. Same evening as §10.*
*Spawned by: user asking "ตอนนี้ในระบบล่าสุดถึงไหนแล้ว" → triggered DB state audit.*

---

## Finding

§3.1 (Leave Phase 2 e2e test) was carried forward through the §9 → §10 handoffs as "ยังเร่งด่วน · 4 LVs ยัง pending". The DB snapshot tonight contradicts that completely.

| Ref | NEXT.md said | Actual DB |
|---|---|---|
| LV-2026-0001 ม๊อด ลากิจ 25/4 | "pending — let จิม approve" | **rejected** by จิม Apr 23 ("วันนั้นมีประชุม...") |
| LV-2026-0002 จอย ลาพักร้อน 1-3/5 | "pending — let Sunny reject" | **rejected** by Sunny Apr 23 ("ช่วงนี้งานเร่ง") |
| LV-2026-0003 หวาน ลาป่วย 20-21/4 | "pending — let มด approve" | **approved** by มด Apr 24 ("หายไวๆจ้า") |
| LV-2026-0004 ม๊อด ลาแต่งงาน 10-14/6 | (not listed) | **rejected** by HR override Apr 24 |
| LV-2026-0005 หวาน ลากิจ 15/5 | (not listed) | **approved** (created-on-behalf by HR) |

## Verified working end-to-end

- **Email:** `rejection_reason` populated → HR moved through the UI which dispatches Resend
- **Bell:** notifications table has `leave_request_pending` × 4, `leave_approved` × 4, `leave_rejected` × 3, all with `action_url=/portal/leave`
- **Balance:** หวาน's leave_balances row updated correctly — ลาป่วย used=2/30 (matches LV-0003), ลากิจ used=1/3 (matches LV-0005). ม๊อด's rejected requests left balance untouched.

## Why this slipped

The ที่ออฟฟิศ Apr 23-24 sessions did the UI work, side-effects landed in DB, but no one pushed an updated `NEXT.md` to reflect that §3.1 was done. The next session (this one) opened the file and saw the stale priority.

## Action taken (no code commits)

- `docs/NEXT.md` rewritten:
  - §3.1 marked ✅ done with verification snapshot
  - Priority shuffle: §3.2 = permission-flag-based route auth (most urgent), §3.3 = env vars, §3.4 = holidays, §3.5 = Tab 4 polish, §3.6 = carryover
  - Added §6 DB state snapshot
  - Added §7 quirks/lessons including the "3 places must sync" rule

## Lesson locked in

**Code (commit) · DB (state) · Docs (NEXT.md) — must sync.** A session that does work via UI must still update `NEXT.md` to reflect the resulting DB transitions, otherwise future sessions will redo what's already done. The session-start protocol catches the COMMIT side; the NEXT-update-on-end protocol must catch the DB side.

---

*End of §11 · 0 source commits, 1 docs commit (NEXT.md + SESSION_HISTORY append). Next session starts at NEXT.md §3.2.*



<a id="section-12"></a>
# §12. APR25 (Home night, very late) — Route Auth Sweep + Holidays

*Source: this file. 5 commits shipped (4 sweep + 1 holidays), 27 source files + 2 sql files, all pushed.*
*Same evening as §10/§11.*

---

## 0. TL;DR

| Track | What |
|---|---|
| **Permission-flag route auth sweep** | New `lib/route-auth.ts` helper + replace 26 `session.role !== 'hr_admin'` gates across 7 pages, 15 API routes, 4 server actions. มด (HR Manager preset, role='manager') can now access /hradmin/* per her permission flags. |
| **Holidays table + 2026 seed** | DB had no `holidays` table — code wrote against it via try/catch. Created the schema (with idempotent UNIQUE + generated `year` + indexes), seeded 15 fixed-date Thai 2026 holidays. /hradmin/holidays admin UI now functional, Tab 4 calendar shows holidays. |

---

## 1. Commits

| # | Commit | What |
|---|---|---|
| 5 | `4487768` | feat(db): create holidays table + seed Thai 2026 public holidays |
| 4 | `829fc26` | refactor(hradmin/actions): permission-flag-based guards via isHrStaff |
| 3 | `37947a1` | refactor(api): permission-flag-based guards via isHrStaff (15 routes) |
| 2 | `dabe802` | refactor(hradmin/pages): permission-flag-based guards via isHrStaff |
| 1 | `2213c73` | feat(auth): add lib/route-auth permission-based authorization helper |

---

## 2. Permission sweep design

**Helper (`src/lib/route-auth.ts`):**

```typescript
export const isLegacyHrAdmin: AuthCheck = ({ session }) => session.role === 'hr_admin'
export const canManageSystem:   AuthCheck = ({ permissions }) => permissions.can_manage_system
export const canEditEmployees:  AuthCheck = ({ permissions }) => permissions.can_edit_employees
export const canApproveLeave:   AuthCheck = ({ permissions }) => permissions.can_approve_leave
// ... + canViewAllEmployees, canViewApprovalLimits, canEditApprovalLimits

export const isHrStaff: AuthCheck = (ctx) =>
    isLegacyHrAdmin(ctx) || canEditEmployees(ctx) || canManageSystem(ctx)

export async function getAuth(): Promise<AuthContext | null> {
    const session = await getSession()
    if (!session) return null
    const permissions = await getCurrentPermissions().catch(() => EMPTY_PERMISSIONS)
    return { session, permissions }
}
```

**Pattern (page):**

```typescript
const auth = await getAuth()
if (!auth) redirect('/login')
if (!isHrStaff(auth)) redirect('/portal/dashboard')
```

**Pattern (API):**

```typescript
const auth = await getAuth()
if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

**Files touched (26):**
- 7 server pages: announcements, applicants, applicants/[id], attendance, attendance/reconcile, attendance/import, leave
- 15 API routes: applicants × 2, holidays × 2, hradmin/applicants/{evaluate,status}, hradmin/leave/{balances, balances/export, create-on-behalf, export, force-action}, hradmin/system/quota (narrower: canManageSystem only), leave/balances (HR-override widened), leave/export, leave/v2/hr-pending
- 4 server actions: announcements, attendance/reconcile, attendance/import (2 actions), employees/[id] (3 actions)

**Skipped (intentionally — different concern):**
- `middleware.ts` — role-aware routing, not gating
- `/api/auth/login` — login redirect logic
- `/api/careers/apply/[id]/submit` — fan-out target query (still reaches role='hr_admin' rows; widening is a separate notification-routing decision)
- `new-employee-form.tsx` — form picker for setting access role value (legitimate)
- `/api/leave/{[id]/approve, [id]/reject, team}` — already permit role='manager' alongside hr_admin

**Side benefits:**
- Cookie+JSON.parse pattern in 6 pages collapsed into 3-line `getAuth()` form, dropping brittle try/catch
- "HR Admin" → "HR" in user-facing forbidden messages (since มด ≠ admin)
- Two-step pattern (401 if not signed in, 403 if not authorized) applied uniformly — was inconsistent before

## 3. Holidays migration + seed

**Schema (`supabase/migrations/20260425_create_holidays_table.sql`):**

```sql
CREATE TABLE IF NOT EXISTS public.holidays (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date        date NOT NULL,
    name        text NOT NULL,
    type        text NOT NULL DEFAULT 'public',
    year        int  NOT NULL GENERATED ALWAYS AS (EXTRACT(year FROM date)::int) STORED,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (date, name)  -- idempotent re-seed
);
```

**Seed (`supabase/seeds/holidays_2026.sql`):** 15 fixed-date Thai public holidays for 2026.

**Excluded (need lunar calculation per year):** มาฆบูชา, วิสาขบูชา, อาฬหบูชา, เข้าพรรษา. Add via `/hradmin/holidays` admin UI when Royal Gazette publishes the year's calendar.

**Verified:** April 2026 month query returns 4 holidays (จักรี + สงกรานต์ × 3) — Tab 4 calendar will render them.

## 4. Lessons

1. **`isHrStaff` is the right level of granularity for unlocking มด** — finer-grained narrowing per route can come later when there's a business case (Executive Viewer needs read-only HR dashboards, etc.). Don't over-design upfront.

2. **`session = auth.session` shim** is needed in 4-5 files where the original code referenced `session.id` for audit fields (imported_by, reviewed_by, etc.). Cleanly absorbs the shape change without touching downstream code.

3. **Idempotent migrations are mandatory in this workflow** — `CREATE TABLE IF NOT EXISTS` + `UNIQUE` constraint + `ON CONFLICT DO NOTHING` mean the seed file can be re-applied at any time without breakage. Critical for multi-machine work where another developer might re-run.

4. **`year` as GENERATED ALWAYS column** keeps existing API queries (`eq('year', year)`) fast without rewriting them. Storage cost is negligible at this scale; the alternative (year stored manually) creates a drift risk.

5. **Route-auth sweep showed how legacy patterns calcify:** 26 sites all copy-pasted the same `if (session.role !== 'hr_admin') { return 403 }` block. The helper makes the 27th site take 2 lines instead of 4 + makes the security policy auditable in one place.

---

*End of §12 · 5 commits + 1 migration + 1 seed file. Next session at NEXT.md §3.2 (Vercel env vars, dashboard step).*



<a id="section-13"></a>
# §13. APR25 (Home, almost morning) — Quick Wins Sweep

*Source: this file. 4 commits shipped, all push.*
*Spawned by: user picked "A — quick wins" from the 5-item backlog.*

---

## 0. TL;DR

| Track | What |
|---|---|
| **§3.4 lunar holidays** | Added 4 tentative rows (มาฆ/วิสาข/อาฬห/เข้าพรรษา) marked "(โดยประมาณ — โปรดยืนยัน)" — 2026 holidays now 19 total |
| **§3.3a bell icon mapper** | NO-OP — Briefcase already in ICON_MAP. Confirmed and skipped. |
| **§3.6a email-leave URL** | hardcoded `/portal/leave/inbox` → role-aware via `resolveApproverInboxUrl`, single round-trip shared by email + bell |
| **§3.6b careers fan-out** | `.eq('role', 'hr_admin')` → `.or(role.eq.hr_admin,can_edit_employees.eq.true,can_manage_system.eq.true)` so มด gets HR notifications too |
| **§3.6c submit validation** | new "Rule 6a" in validateLeaveRequest — when total_entitled=0, return "คุณไม่มีสิทธิ์{type}ในปีนี้ — กรุณาติดต่อ HR" instead of confusing "วันลาไม่พอ" |

---

## 1. Commits

| # | Commit | What |
|---|---|---|
| 4 | `03bca9c` | fix(leave/submit): explicit "no entitlement" message when total_days=0 |
| 3 | `1cbbd7f` | feat(careers): widen submit notification fan-out to all HR staff |
| 2 | `5f141a2` | fix(leave/email): role-aware approver inbox URL via resolveApproverInboxUrl |
| 1 | `fb4e40a` | feat(db): seed 4 tentative lunar Buddhist holidays for 2026 |

---

## 2. Notable details

**Lunar holidays — type='religious':** Distinguishing from fixed-date 'public' lets the calendar render them differently if needed (e.g. softer color, "religious" badge). Each name suffixed "(โดยประมาณ — โปรดยืนยัน)" so anyone reading the calendar can spot the uncertainty without consulting docs.

**Email URL fix:** The hardcoded URL existed because the helper (`resolveApproverInboxUrl`) was created later but the email module was never updated. Now `LeaveEmailContext` carries an optional `approverInboxUrl` field; submit/route resolves it once and passes the same URL into both email + bell. Eliminates the duplicate `getEmployeeUserId` + `resolveApproverInboxUrl` calls that lived separately in each block.

**Careers fan-out widening:** Original `.eq('role', 'hr_admin')` was a deliberate placeholder while the broader permission-flag system was being built. Now mirrors `isHrStaff` predicate via Supabase `.or()`. Includes a `Set` dedup so users matching multiple conditions (e.g. ปอนด์ has hr_admin AND can_manage_system AND can_edit_employees) get only one notification.

**Submit validation Rule 6a:** Added BEFORE the existing Rule 6 ("balance check") so the more specific message wins. Skip path: `is_unlimited` types (e.g. ลาเพื่อพัฒนาความรู้) which never have a quota.

---

## 3. What's left from the original backlog

- §3.2 Vercel env vars — 5 min, dashboard step (user task)
- §3.3 Tab 4 mobile polish — needs iPhone testing
- §3.5 Granular permission narrowing — phase 2 of the sweep, ~30-60 min
- §3.6 carryover heavies: Bulk adjust balance modal, Careers Iter 2 zip + review notes
- Pre-existing TS errors in 5 files — not introduced by this session

Estimated remaining: ~3-4 hours for everything except §3.2 + §3.3 mobile.

---

*End of §13 · 4 commits. Total this evening across §10-§13: **18 commits, 4 tracks complete**. Next session at NEXT.md §3.2.*


<a id="section-14"></a>
# §14. APR24 office afternoon — §3.6 carryover sweep

*5 commits · ปิด §3.6 carryover ครบ + critical email recursion fix*

## TL;DR

Office afternoon (Apr 24) ตามคำสั่ง "จัดสิ่งที่ยังไม่ทำให้หมดเลย". ระหว่างเริ่ม session
sync protocol สังเกตเห็น `email-leave.ts` มี infinite recursion ใน wrapper — รุนแรงพอ
เป็น critical bug ที่ block leave + careers email ทุกตัวมาตั้งแต่ Apr 23 commit `dcccec1`.
แก้ปัญหานั้นก่อน แล้วค่อยลุย §3.6 carryover ทั้ง 4 ข้อ.

## Commits

| # | Commit | Track | Note |
|---|---|---|---|
| 5 | `6c4c20a` | TS sweep | 22 → 0 errors · `tsc --noEmit` exit 0 |
| 4 | `e75d154` | §3.6.1 | bulk adjust balance modal · preview/apply 2-step |
| 3 | `d1e0f70` | §3.6.2 | zip download applicant docs (jszip) |
| 2 | `65142be` | §3.6.3 | review notes autosave + audit metadata cols |
| 1 | `ded6fdd` | 🔥 fix | infinite recursion 3 email wrappers |

## What broke (and why it slipped through)

`sendLeaveEmail` / `sendCareersEmail` ใน 3 ไฟล์ wrapper เรียก ตัวเอง แทน `sendEmail`
ที่ import จาก `@/lib/email`. Bug ติดมาตั้งแต่ Apr 23 commit `dcccec1` (separate sender
identities) แต่ไม่มีใครเจอเพราะ:

1. ทุก wrapper-routed email ส่งใน try/catch ที่ swallow exception → log แต่ไม่ throw
2. `announcement broadcast` ใน `hradmin/hr/actions.ts` ยังเรียก `sendEmail` ตรง — ไม่ผ่าน wrapper
3. Code never run end-to-end ในสภาพ "บั๊ก = pure recursion" เพราะ session ก่อนๆ
   ใช้ direct callers (Apr 23-25 e2e tests ผ่าน หลัง apr 25 home night session ที่
   wrapper เริ่มกระจายตัว — ไม่มี leave email submit ตั้งแต่นั้น)

## §3.6 deliverables

### §3.6.3 Review notes autosave
- `PATCH /api/hradmin/applicants/[id]/review-notes` (8 KB cap, fallback for older schema)
- `ReviewNotes.tsx` client — debounce 1.5s, save-on-blur, beforeunload guard, "saved Xs ago"
- Migration: `review_notes_updated_at` + `review_notes_updated_by` cols

### §3.6.2 Zip download
- `GET /api/hradmin/applicants/[id]/download-zip` — bundles 6 single-fields + other_documents
- README.txt manifest with skipped-files list
- Service-role downloads (signed URLs never leak to client)
- Filename: `applicant-<ref>-<nick>-YYYYMMDD.zip`
- jszip 3.10.1 added

### §3.6.1 Bulk adjust modal
- `POST /api/hradmin/leave/balances/bulk` — preview / apply 2-mode
- Actions: `set_total` / `add_total` / `reset_used`
- Scope: all / departments / levels (employee_ids[] also supported)
- Preview must run before Apply enables; config change resets preview

### §3.6.4 TS sweep
22 errors → 0:
- 5× recharts Formatter signature widening (DepartmentBar / LeaveTypePie / MonthlyTrend / hr-dashboard ×2)
- hr-dashboard.tsx missing `useRouter()` call in HRDashboard component
- portal/checkin/actions.ts CheckInPayload widening for WFH (no GPS)
- portal/leave/my-leave-view.tsx `?? null` for filterTypeName
- portal/profile/page.tsx Supabase `as unknown as EmpRow` casts (× 3)
- lib/employee-profile.ts `?? authUserId ?? ''` fallbacks (× 2)
- next.config.ts `as NextConfig` for eslint config

## Build state at end

- `npx tsc --noEmit` → exit **0**
- `npm run build` → ✓ Compiled in 3.1s · 98 routes
- 3 new routes (review-notes / download-zip / balances/bulk)
- 0 new TS errors introduced

## Quirks learned

1. **Email wrapper recursion** — explicit forward beats spread; spread also tripped TS quirk
2. **Recharts `T | undefined`** — `(v) => Number(v ?? 0)` instead of `(v: number) =>`
3. **Web Response BodyInit** — Uint8Array fails in Next 16 lib.dom; wrap in Blob
4. **Preview-then-apply gate** — config change invalidates preview to prevent stale apply
5. **Audit metadata fallback** — API try-with-metadata, fall back to text-only on schema mismatch

---

*End of §14 · 5 commits · §3.6 carryover ปิดครบ. Next session = §3.2 Vercel env vars (5 min, requires user dashboard access) หรือ §3.3 Tab 4 mobile polish (requires real iPhone).*

---

# §15 — APR27 Office afternoon — Hire flow, Contracts, PDF export, Payroll permission system

**Date:** 2026-04-27
**Location:** Office Mac mini
**Commits shipped:** 17
**Last commit:** `6c4adfb`

## TL;DR

Marathon afternoon — closed four heavyweight modules plus a stack of UX polish:

1. **One-click hire** (commits `6f0e2b9` `c079795`) — applicant ↦ employee promotion that copies every shared field (title/names/photo/contact/DOB/emergency contact) and fires a DB trigger to seed leave_balances. HR fan-out notification on every status change. Hire button visibility relaxed to all states except draft/rejected.

2. **Contracts module** (commits `d89511e` `6a57085`) — new `employee_contracts` table + private Storage bucket + ContractsCard on profile + 3-month backfill progress banner on the employees list. Supports 5 contract types with soft-delete only (legal retention).

3. **B&W PDF export** (commits `5f20de0` `c300619` `6773e26` `c55e81c` `63e6e09`) — print-optimized version of the profile page that flattens the dark glass UI to paper while keeping the photo in colour. Single-page A4 target hit by hiding chart/history, dropping card borders, and shrinking font to 9.5pt. Plus three iterations on the INP regression caused by `window.print()` (settled on double `requestAnimationFrame`).

4. **Salary slips + payroll permission** (commit `777a5a3`) — full payroll module with allow-list `can_manage_payroll` flag. Per user's explicit request, มด (อาทิตย์) is permanently excluded from this flag — she retains full HR access but cannot see anyone's salary slips. Bulk upload page parses filenames to match employee codes; in-app + email notification on every new slip; portal page where employees see only their own.

Plus 8 smaller wins: calendar icon white-on-dark fix; bereavement leave 5 days from day 1; warm female-voice rewrite of all 7 careers email templates; approver-chain preview box on the leave form; home-location section with Google Maps embed; new "ข้อมูลส่วนตัว" + "ที่อยู่" cards; auto-seed leave balances trigger; edit-mode gate for upload buttons.

## Commits in order

| # | Commit | Lines | Files | Track |
|---|---|---|---|---|
| 1 | `eabc03c` | 30 | 1 | Forms — calendar icon attempt 1 (filter:invert) |
| 2 | `9529a90` | 38 | 1 | Forms — calendar icon final (inline white SVG) |
| 3 | `7550445` | 36 | 1 | Leave — bereavement 5 days from day 1 (53 active = 265 days seeded) |
| 4 | `6f0e2b9` | 685 | 4 | Hire flow — `/api/hradmin/applicants/[id]/hire` + HireModal + auto-seed trigger |
| 5 | `c079795` | 76 | 3 | Applicants — HR fan-out + relaxed hire button visibility |
| 6 | `2a5047e` | 122 | 1 | Emails — careers templates rewrite (7 templates, "ดิฉัน" + "ค่ะ") |
| 7 | `10bc9f8` | 244 | 2 | Leave — approver chain preview box on form step 2 |
| 8 | `d89511e` | 773 | 3 | Contracts — DB + Storage + API (WIP, no UI yet) |
| 9 | `6a57085` | 293 | 5 | Contracts — UI ContractsCard + backfill progress banner |
| 10 | `5f20de0` | 120 | 2 | Print — B&W PDF export with colour photo |
| 11 | `c300619` | 28 | 1 | Print — hide app shell chrome (sidebar/banner/identity) |
| 12 | `6773e26` | 14 | 2 | Print — defer window.print() (INP attempt 1) |
| 13 | `63e6e09` | 503 | 5 | Profile — home location + DOB/gender/EN name + 1-page print |
| 14 | `c55e81c` | 77 | 3 | Print — double-rAF INP fix + drop card borders |
| 15 | `777a5a3` | 1983 | 19 | **Payroll** — salary slips + allow-list permission gate |
| 16 | `6c4adfb` | 28 | 2 | UX — uploads only in edit mode |

(Commit numbering above is roughly chronological within the session — actual git order matches the commit hashes.)

## DB migrations applied

1. `grant_bereavement_leave_from_day_one` — INSERT 53 rows into leave_balances with total_days=5
2. `set_bereavement_default_days_5` — UPDATE leave_types.bereavement.default_days_per_year = 5 + description
3. `auto_seed_leave_balances_on_employee_insert` — TRIGGER on employees AFTER INSERT to seed every type with non-null default_days_per_year
4. `create_employee_contracts_table` — table + indexes + RLS + storage bucket `employee-contracts`
5. `add_home_location_to_employees` — 4 new columns (lat/lng/label/note) + range CHECK constraints
6. `create_salary_slips_and_payroll_permission` — `salary_slips` table + `User.can_manage_payroll` column + RLS policies + storage bucket `salary-slips`

Plus one direct UPDATE to set `User.can_manage_payroll = true` for ปอนด์ (admin user).

## New routes

- `POST /api/hradmin/applicants/[id]/hire`
- `GET / POST /api/hradmin/employees/[id]/contracts`
- `GET / DELETE /api/hradmin/employees/[id]/contracts/[contractId]`
- `GET / POST /api/hradmin/employees/[id]/salary-slips`
- `GET / DELETE /api/hradmin/employees/[id]/salary-slips/[slipId]`
- `POST /api/hradmin/payroll/bulk-upload`
- `GET /api/portal/payroll`
- `GET /api/portal/payroll/[slipId]`
- `GET /api/leave/approver-chain`
- `/hradmin/payroll/bulk` (page)
- `/portal/payroll` (page)

## Files added

- `src/components/hradmin/employees/ContractsCard.tsx`
- `src/components/hradmin/employees/ContractsCoverageBanner.tsx`
- `src/components/hradmin/employees/LocationSection.tsx`
- `src/components/hradmin/employees/SalarySlipsCard.tsx`
- `src/components/hradmin/applicants/HireModal.tsx`
- `src/lib/payroll-notify.ts`
- `src/lib/salary-slip-persist.ts`
- (Plus all the API routes + page components listed above)

## Quirks learned

1. **`window.print()` blocks the paint loop** — `setTimeout(0)` defers but the dialog still attributes its open-time to the input event because no paint happens between click and print. Fix: double `requestAnimationFrame` so at least one paint cycle completes first. Brave's INP popup stops firing.

2. **Print preview emulates a narrow viewport** — every `lg:hidden` element on the page suddenly becomes visible during print, which is why our app shell (PriorityAlerts banner, DailyGreeting card, mobile identity header, top navbar, bottom nav, spacer) all leaked into PDF exports. Fix: explicit `print:hidden` on each leak point in shell.tsx.

3. **`silverCard`'s `border: 1px solid rgba(255,255,255,0.65)` becomes a white rectangle on paper** — invisible on the dark UI, painfully visible on the printout. Print rule overrides to `border: none` with a subtle bottom rule for separation.

4. **PostgreSQL FK on `leave_balances.employee_id` points at `employees.id` (UUID), not `employees.employee_code`** — first INSERT attempt failed because we used the text code. Always FK to UUID-style id columns; codes are for display.

5. **`'use server'` files don't safely export non-action helpers to other route files** — the bulk-upload route initially imported `persistSlip` from the single-upload route. Next 16's compiler complained. Moved the shared helper to `/lib/salary-slip-persist.ts` (no `'use server'` directive).

6. **Bulk upload filename matching needs longest-first sort** — naive `String.includes()` on the codes would match `060-01` substring inside `060-001` filenames. Sort by `code.length` descending and check longest first.

7. **Salary-slip replace-on-conflict** uses a partial unique index `WHERE deleted_at IS NULL` — re-uploading the same period soft-deletes the old slip, freeing the index, before the new INSERT. Old blob stays in Storage to satisfy 7-year tax retention.

8. **`can_manage_payroll` default false** — true allow-list pattern. Without explicit grant from ปอนด์, no one (not even hr_admin role holders) can see salary data. มด in particular is intentionally never granted per user's explicit instruction — UI cards stay invisible, routes 404, API 403s.

## Build state at end

- `npx tsc --noEmit` → exit **0**
- 17 new commits, all green
- ~110 routes total (up from 100)
- 0 TS errors introduced; 0 regressions

## Open at end of session

User reported just before logging off:
1. "ContractsCard upload button — should be in edit mode only" → fixed in `6c4adfb`
2. "การ์ดสลิปเงินเดือนอยู่ตรงไหน" — likely Vercel deploy lag or session cache (commit `777a5a3` was 5 min before this question). Will verify on laptop after pull + relogin.
3. "Print ยังแสดงไม่ครบ" — new "ข้อมูลส่วนตัว" + "ที่อยู่" sections might be page 2 of preview but visible in saved PDF. Will verify.

Next session priorities (per NEXT.md §3):
- §3.1 Verify salary card visible after pull/relogin
- §3.2 UI permission editor so ปอนด์ can grant `can_manage_payroll` from the app instead of SQL
- §3.3 Create user account for accounting team with `payroll_manager` preset
- §3.4 End-to-end test of bulk upload with sample slips

---

*End of §15 · 17 commits · 4 major modules + 8 polish items · Hire + Contracts + PDF + Payroll permission system live. Continue session = laptop, pull + `อ่าน docs/NEXT.md แล้วทำต่อ`.*

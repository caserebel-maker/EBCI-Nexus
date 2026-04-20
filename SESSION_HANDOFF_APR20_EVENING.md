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

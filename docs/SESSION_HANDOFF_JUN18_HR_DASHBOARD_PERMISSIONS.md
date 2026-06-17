# Session Handoff - 2026-06-18 HR Dashboard + Permissions

## Current State

- Repo: `caserebel-maker/EBCI-Nexus`
- Branch: `main`
- Latest pushed commit at handoff: `ccacdea fix(hradmin): compact absence dates in insights table`
- Production URL: `https://ebci-nexus.vercel.app`
- Worktree note: unrelated untracked local files are still present and intentionally not committed:
  - `.claude/launch.json`
  - `.vscode/settings.json`
  - `Gemini_Generated_Image_6sd1m46sd1m46sd1.psd`
  - `n152logo.psd`
  - `public/n192.png`
  - `public/n512.png`

## What Was Done Tonight

### 1. Employee Dashboard Leave Balance Wording + Logic

Commit: `225a0c2 fix(dashboard): align leave balance display`

- Dashboard leave balance no longer treats one total number as an unclear generic balance.
- Uses the main HR leave categories employees need to know:
  - Annual/vacation leave
  - Personal/business leave
  - Sick leave
- Wording changed so sick leave reads as an entitlement, not as points to spend.
- Added shared display helper:
  - `src/lib/hr-leave-display.ts`
- Dashboard calculation is based on:
  - yearly entitlement
  - used days
  - pending days
  - remaining days

### 2. HR Attendance Insights Dashboard

Commit: `9c24ce9 feat(hradmin): add attendance insights dashboard`

New page:

`/hradmin/attendance/insights`

Purpose:

- Give HR/Admin a dashboard for employee coaching and follow-up.
- Shows absence/leave/late-related signals by month.
- This is meant for HR management review, not a daily employee dashboard widget.

Navigation added under:

`การเข้างาน > สถิติขาด ลา มาสาย`

### 3. Permission Gate For Attendance Insights

Commit: `8925d34 feat(hradmin): gate attendance insights permission`

Added a new permission flag:

`can_view_attendance_insights`

Why:

- The attendance insights page is sensitive.
- It should not be visible to every HR Admin automatically.
- It should be an explicit allow-list permission.

Code changes:

- Added the permission flag to:
  - `src/lib/permissions.ts`
  - `src/lib/permissions-server.ts`
  - `src/lib/permission-presets.ts`
  - `src/lib/route-auth.ts`
- Added the flag to the permissions editor UI/action flow:
  - `src/app/hradmin/settings/permissions/page.tsx`
  - `src/app/hradmin/settings/permissions/actions.ts`
- Gated the page directly:
  - `src/app/hradmin/attendance/insights/page.tsx`
- Hid the HR dashboard shortcut unless the user has permission:
  - `src/app/hradmin/dashboard/page.tsx`
  - `src/app/hradmin/dashboard/hr-dashboard.tsx`
- Hid the sidebar menu item unless the user has permission:
  - `src/components/layout/shell.tsx`

Migration added:

`supabase/migrations/20260617_add_attendance_insights_permission.sql`

### 4. Production DB Permission Applied

The migration was also applied manually to production DB from the home machine using the existing Vercel production `DATABASE_URL`.

Current users granted `can_view_attendance_insights = true`:

- `tumyen@gmail.com` - สุริยะ จันทร์วิภาสวงศ์ (ม๊อด), Super Admin
- `c.arthit@ebcitrade.com` - อาทิตย์ จันทร์วิภาสวงศ์ (มด), HR Admin
- `thanawatana@ebcitrade.com` - ฐานวัฒน์ จันทรกุลเศรษฐ์ (จิม), MD
- `account@ebcitrade.com` - พันธ์ทิพย์ สร้อยมณี (ป้อม)

Mock accounts were explicitly removed from this permission:

- `jim`
- `mod`

### 5. Move Permissions Access Into System Settings Navigation

Commit: `ab69bba chore(nav): surface system permissions settings`

Reason:

- User could not find the permissions page.
- Permission management is system setup, not daily HR operations.

Changed:

- Desktop sidebar now shows under `ตั้งค่าระบบ`:
  - `สิทธิ์การเข้าถึงระบบ`
  - `Audit log`
  - `ระบบและทรัพยากร`
  - `Email Audit`
  - `รายงาน`
  - `แบ็กอัพข้อมูล`
  - `ตั้งค่าทั่วไป`
- Mobile More menu now includes:
  - `สิทธิ์การเข้าถึงระบบ`
  - `Audit log`
- Settings landing page card label changed from:
  - `สิทธิ์ผู้ใช้`
  - to `สิทธิ์การเข้าถึงระบบ`

### 6. Attendance Insights Table Polish

Commit: `ccacdea fix(hradmin): compact absence dates in insights table`

Issue found from screenshot:

- In the employee follow-up table, the `ขาด` column showed absence dates under the count.
- Because the column was narrow, Thai month text such as `มิ.ย.` wrapped vertically and became hard to read.

Fix:

- `ขาด` column now keeps the main absence count compact and prominent.
- Absence dates are no longer rendered as squeezed multi-line text.
- Rows with absences now show a short badge:
  - one absence: date text such as `2 มิ.ย.`
  - multiple absences: `ดูวันที่ X วัน`
- Full absence dates remain available via browser hover/title.

File changed:

- `src/app/hradmin/attendance/insights/insights-view.tsx`

## Verification Done

Build passed after the final navigation change:

```bash
set -a; source .vercel/.env.production.local; set +a; npm run build
```

Result:

- Compiled successfully.
- Static page generation completed.
- Existing Next.js warnings remain:
  - `eslint` key in `next.config.ts` is no longer supported.
  - `middleware` convention warning recommends `proxy`.

Focused TypeScript check for changed permission/dashboard files was clean during the permission work.

Full `npx tsc --noEmit` still reports pre-existing errors in unrelated areas, especially:

- `apps/checkin-kiosk`
- `src/app/hradmin/attendance/card-scans`
- `src/app/portal/announcements`

These were already outside this work.

## Recommended Office Checklist

1. Pull latest main:

```bash
git pull origin main
```

2. Confirm latest commit:

```bash
git log --oneline -3
```

Expected top commits:

- `ccacdea fix(hradmin): compact absence dates in insights table`
- `5a24ad1 docs: add Jun 18 HR permissions handoff`
- `ab69bba chore(nav): surface system permissions settings`

3. Open as ม๊อด / Super Admin:

`/hradmin/settings/permissions`

Confirm:

- Page can be found from sidebar:
  - `ตั้งค่าระบบ > สิทธิ์การเข้าถึงระบบ`
- Permission flag exists:
  - `ดูสถิติขาด ลา มาสาย`

4. Test allowed users:

Log in or impersonate/check as:

- ม๊อด
- มด
- จิม
- พันธ์ทิพย์/ป้อม

Expected:

- Sidebar shows `การเข้างาน > สถิติขาด ลา มาสาย`
- HR Dashboard shows the shortcut card for attendance insights
- Direct URL `/hradmin/attendance/insights` opens

5. Test non-allowed HR Admin:

Expected:

- Sidebar does not show `สถิติขาด ลา มาสาย`
- HR Dashboard does not show the shortcut card
- Direct URL `/hradmin/attendance/insights` redirects back to `/hradmin/dashboard`

6. Check the table layout in Attendance Insights:

Open:

`/hradmin/attendance/insights`

Expected:

- The `ขาด` column no longer shows date text stacked vertically.
- Rows with many absences show a short badge such as `ดูวันที่ 10 วัน`.
- Hovering the badge shows the full date list.

7. If another person should see the page:

Go to:

`ตั้งค่าระบบ > สิทธิ์การเข้าถึงระบบ`

Open that user and tick:

`ดูสถิติขาด ลา มาสาย`

Save.

## Notes For Next Codex

- Do not assume `role = hr_admin` means this page should be visible.
- The source of truth is now `User.can_view_attendance_insights`.
- Super Admin preset includes this permission, but Executive/HR Manager/MIS presets do not grant it automatically.
- If changing permission presets later, keep this page as an explicit allow-list unless Mod asks otherwise.
- Do not commit the unrelated untracked local files listed at the top of this handoff.

# 📌 NEXT — เริ่มงานต่อที่นี่

> **ไฟล์นี้คือ single point of entry** สำหรับ session ถัดไป — ไม่ว่าจะเปิดที่เครื่องไหน
> พิมพ์ประโยคเดียวในช่อง Claude แล้วทำงานได้ทันที.

---

## 🎯 ประโยคเดียวที่ต้องพิมพ์

```
อ่าน docs/NEXT.md แล้วทำต่อ
```

**ก่อนลุย:** `cd /path/to/EBCI-Nexus-App && git pull origin main --ff-only`

---

## 0. TL;DR ใน 30 วินาที

**Session ก่อน (cf60c6b → 48f372d) ปิด 5 commits · 2 tracks:**

1. **Leave Tab 4 "ปฏิทิน"** — month grid + popover modal + filter chips · live
2. **Careers → Notification Center wiring** — submit + status (best-effort try/catch)

**+ Discovered คืนนี้:** §3.1 Leave Phase 2 e2e test = **ทำเสร็จไปแล้ว** ใน Apr 23-24 ที่ออฟฟิศ (DB หลักฐานครบ — 3 rejected + 2 approved + 1 HR override + 1 create-on-behalf · email + bell + balance chain ทำงาน). เลื่อน priority ใหม่.

**อันที่เร่งด่วนที่สุดตอนนี้:** §3.2 — **Permission-flag-based route auth** (เปิด `/hradmin/*` ให้ มด ใช้ตามสิทธิ์, ไม่ใช่ role).

---

## 1. Commits ของ session ก่อน (Apr 25 home night)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 5 | `48f372d` | Docs | refresh NEXT + append §10 SESSION_HISTORY (Tab 4 + Careers wiring) |
| 4 | `615a9d0` | Careers | wire status change → applicant notification (soft email-match) |
| 3 | `c692160` | Careers | wire applicant submit → HR notification (fan out to all hr_admin users) |
| 2 | `550c431` | Leave Tab 4 | activate Tab 4 link in 3 sibling tab navs |
| 1 | `cf60c6b` | Leave Tab 4 | calendar month view — server fetch + grid + popover + filters |

---

## 2. สิ่งที่เพิ่งส่งมอบ — ใช้งานได้จริงแล้ว

### Module: Organization (`/portal/organization` + `/hradmin/organization`)
3 tabs (โครงสร้าง / อำนาจอนุมัติ / สายอนุมัติของฉัน) · sub-views (แผนก / รายบุคคล / ภาพรวม) · permission-aware (L1/L2 เห็นแค่แผนกตัวเอง) · advisor parallel section

### Module: Leave (`/hradmin/leave`)
- Tab 1 ภาพรวม · Tab 2 ใบลาทั้งหมด · Tab 3 วันลาพนักงาน · **Tab 4 ปฏิทิน (เพิ่งใหม่)**
- Force approve/reject + create-on-behalf + manual balance adjust
- CSV export ทั้ง 3 tabs (requests / balances / + calendar รออนาคต)
- **Approver routing + email + bell + balance — verified ใช้งานจริง** (5 LVs ผ่าน flow บน Apr 23-24 ที่ออฟฟิศ)

### Module: Careers (`/careers/apply` + `/hradmin/applicants`)
- Apply 5 steps + autosave + upload · status state machine · 8 email templates
- **In-app notification — เพิ่ง wire คืนนี้** (`application_received` + `application_status_changed`)

### Module: Notification Center
- `createNotification` helper + RPC + bell UI
- Used by: leave (`leave_request_pending` / `leave_approved` / `leave_rejected` / `leave_cancelled`), careers (2 ตัวเพิ่งใหม่)

### อื่นๆ ที่อยู่ใน prod แล้ว
Attendance + card import · Reports (3 tabs) · Holidays admin UI (table ยังไม่มีใน DB) · Recruitment + Applicants admin · Dashboard (HR + Portal) · Profile · Announcements · Check-in (anti-trick + GPS + IP log) · Map (dark/light theme)

---

## 3. สิ่งที่ยังเปิดอยู่ — เรียงตาม priority ใหม่

### 3.1 ✅ ~~Leave Phase 2 end-to-end test~~ — **DONE (verified Apr 25 night)**

จาก DB snapshot:
- LV-2026-0001 ม๊อด ลากิจ 25/4 → **rejected** by จิม Apr 23
- LV-2026-0002 จอย ลาพักร้อน 1-3/5 → **rejected** by Sunny Apr 23
- LV-2026-0003 หวาน ลาป่วย 20-21/4 → **approved** by มด Apr 24 ("หายไวๆจ้า")
- LV-2026-0004 ม๊อด ลาแต่งงาน 10-14/6 → **rejected** by HR override Apr 24
- LV-2026-0005 หวาน ลากิจ 15/5 → **approved** (created-on-behalf by HR)

**Verify:**
- Email — rejection_reason populated ✓ (HR ลง action ผ่าน UI flow ที่ส่ง email)
- Bell — notifications ครบ: `leave_request_pending` × 4, `leave_approved` × 4, `leave_rejected` × 3, `action_url=/portal/leave` ถูก ✓
- Balance — หวาน ลาป่วย used=2/30, ลากิจ used=1/3 (ตรง LV-0003 + LV-0005) · ม๊อด rejected → balance คืน ✓

ยกออกจาก pending แล้ว.

### 3.2 ⭐ Permission-flag-based route auth — **เร่งด่วนที่สุด** (1-2 ชม)

`/hradmin/*` route guard ยัง hardcode `session.role !== 'hr_admin'` → มด (HR Manager preset, role='manager') ถูกบล็อกแม้ permission flags ครบ.

**Sweep targets** (จาก grep):
- `src/middleware.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/applicants/*/route.ts` × 2
- `src/app/api/holidays/*/route.ts` × 2
- `src/app/api/hradmin/applicants/[id]/{evaluate,status}/route.ts`
- `src/app/api/hradmin/leave/balances/{,export}/route.ts`
- + Tab 1/2/3/4 dispatcher ใน `/hradmin/leave/page.tsx`

**Mapping ที่จะใช้:**
- `can_manage_system` → super-admin only routes (login config, system settings)
- `can_edit_employees` → /hradmin/employees, /hradmin/applicants edit, balances edit
- `can_approve_leave` → /hradmin/leave inbox + approve actions
- `can_view_all_employees` → /hradmin dashboards + reports (read-only)
- ตัด `role==='hr_admin'` ทิ้ง (เป็น legacy)

ทำเป็น single sweep · commit แยก per concern (3-5 commits คาดว่า).

### 3.3 Vercel env vars ใหม่ — ต้อง set ก่อน production email polish

```bash
EMAIL_FROM_CAREERS = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR      = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM  = "EBCI System <no-reply@ebcinext.com>"
```

CLI: `npx vercel env add EMAIL_FROM_HR production`. ไม่กระทบ runtime ตอนนี้ (fallback `EMAIL_FROM` ใช้ได้). user ต้อง dashboard.

### 3.4 Holidays table + seed (30-45 นาที)

DB ไม่มีตาราง `holidays` → Tab 4 calendar เห็นแค่เสาร์-อาทิตย์, holiday admin UI ก็ใช้ไม่ได้.

**ทำ:**
1. Create migration: `holidays(id, date, name, type, year, created_at)` — type = 'public' / 'company' / 'religious'
2. Seed Thai public holidays 2026 (วันขึ้นปีใหม่, มาฆบูชา, จักรี, สงกรานต์, แรงงาน, ฉัตรมงคล, วิสาขบูชา, อาฬหบูชา, แม่, ออกพรรษา, ปิยมหาราช, พ่อ, สิ้นปี)
3. Verify portal/calendar + Tab 4 รับข้อมูล + commit

### 3.5 Tab 4 polish (เล็ก, opportunistic)

- Bell icon mapper: `Briefcase` ที่ใช้ใน careers noti — verify `<NotificationItem />` switch รองรับ (ตอนนี้ default fall to Bell — graceful แต่ดูไม่สวย)
- Mobile: ลองใช้บน iPhone จริงก่อน — ถ้า cell เล็กเกินก็ flip เป็น vertical day list

### 3.6 Carryover deferred

- Bulk adjust balance modal · `email-leave.ts:238` hardcoded `/portal/leave/inbox` (hr_admin click ผิด shell) · Careers Iter 2 zip download + review notes autosave · Pre-existing TS errors (embla, signature-canvas, recharts Formatter, 3x `r.value?.success`) · Submit validation: ปล่อย LV ส่งได้ทั้งที่ total=0 (จอย ลาพักร้อน — caught by HR review)

---

## 4. Env vars + test accounts (คงเดิม)

```
# Existing บน Vercel (ไม่ต้อง re-config):
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL

# ยังไม่ set (§3.3):
EMAIL_FROM_CAREERS · EMAIL_FROM_HR · EMAIL_FROM_SYSTEM
```

**Test accounts:**
- Admin: `tumyen@gmail.com / 0000` (ปอนด์/สุริยะ/ม๊อด)
- L1: `l1test@ebci.test / 0000` (หวาน)
- Manager (มด): `c.arthit@ebcitrade.com / 0839964333`
- Manager (จิม): `thanawatana@ebcitrade.com / 0863699792`
- Sunny (คุณพ่อ): `sayan@ebcitrade.com / 0818331367`

---

## 5. Git + deploy state

- **Repo:** `caserebel-maker/EBCI-Nexus` (branch `main`)
- **Last commit:** `48f372d` (docs refresh)
- **Vercel deploy:** auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- Push pattern: `git push origin HEAD:main`
- **ก่อนเริ่ม session ถัดไป:** `git fetch origin && git pull origin main --ff-only`

---

## 6. DB state ปัจจุบัน

- **Employees:** 55 active · 4 มี manager_id · 3 mock approvers (จิม L4 ครบ scope · มด L3 leave+hr · ปุ๊ L3 leave+ot+budget 50k)
- **Users:** 3 rows (admin / mock_jim / mock_mod)
- **leave_requests:** 5 rows · 0 pending · 3 rejected · 2 approved
- **leave_balances:** seeded สำหรับ ปอนด์/จิม/มด/หวาน/จอย ปี 2026
- **notifications:** ทำงานครบ · leave + careers types ทั้งคู่
- **employee_audit_log:** ตารางมี · ยังไม่ได้ enable RLS
- **holidays:** ❌ ตารางไม่มี (§3.4)

---

## 7. Quirks / lessons จาก session ล่าสุด

1. **NEXT.md หลุด sync ได้** — §3.1 carry forward 2 sessions ทั้งที่งาน DB ทำเสร็จไปแล้ว 2 วัน ที่ออฟฟิศ. Lesson: **session ที่ทำงานบน UI flow (เช่น approve LV ผ่านหน้าเว็บ) ต้องมา update NEXT.md ด้วย** ไม่งั้น session ถัดไปจะคิดว่ายังไม่เสร็จ.

2. **Multi-machine protocol works** — session คืนนี้เปิดมาใหม่ ผมเริ่มด้วย `git fetch + status + log` เห็น 0 behind, รู้ว่า code sync แล้ว, อ่าน NEXT.md → เห็น §3.1 → query DB ก่อนจะไปทำซ้ำ → เจอว่าทำไปแล้ว. กฎ "verify ก่อนทำซ้ำ" รักษาไม่ให้งานทับกันได้จริง.

3. **DB เป็น source of truth สำหรับ "เสร็จหรือยัง"** — UI flow + email + bell ทุกอย่าง side-effect ลง DB. SQL snapshot บอกความจริงได้แน่นอนกว่า doc.

4. **3 ที่ที่ระบบ "เสร็จ" ต้อง sync:** Code (commit) · DB (state) · Docs (NEXT.md). หลุดที่ไหนก็เกิดงานทับ.

---

*Generated end of APR25 home-night session (after §3.1 verification) · Last commit `48f372d` · Next: §3.2 permission-flag-based route auth.*

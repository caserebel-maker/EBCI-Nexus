# 📌 NEXT — เริ่มงานต่อที่นี่

> **ไฟล์นี้คือ single point of entry** สำหรับ session ถัดไป — ไม่ว่าจะเปิดที่เครื่องไหน
> พิมพ์ประโยคเดียวในช่อง Claude แล้วทำงานได้ทันที.

---

## 🎯 ประโยคเดียวที่ต้องพิมพ์

```
อ่าน docs/NEXT.md แล้วทำต่อ
```

**ก่อนลุย:** `cd /path/to/EBCI-Nexus-App && git pull origin main --ff-only` (ดึง 5 commits ใหม่ของ session นี้)

---

## 0. TL;DR ใน 30 วินาที

**Session คืนนี้ (Apr 25 home night) ปิด 9 commits รวม 3 tracks:**

1. **Tab 4 Calendar + Careers Notification wiring** (cf60c6b → 48f372d, 5 commits, ทำตอนต้น session)
2. **Permission-flag-based route auth sweep** (2213c73 → 829fc26, 4 commits) — ปลด มด เข้า /hradmin/* ได้ตามสิทธิ์
3. **Holidays table + Thai 2026 seed** (4487768) — Tab 4 calendar + holidays admin UI ใช้งานได้แล้ว

**+ Discovered:** §3.1 Leave Phase 2 e2e test = ทำเสร็จไปแล้ว Apr 23-24 ที่ออฟฟิศ (DB หลักฐานครบ — ดู §11/§12 ของ SESSION_HISTORY).

**อันที่เร่งด่วนที่สุดตอนนี้:** §3.2 — **Vercel env vars** (5 นาที, dashboard step). หลังจากนั้น §3.3 Tab 4 mobile polish, §3.4 lunar holidays.

---

## 1. Commits ของ session นี้ (เรียงจากใหม่ → เก่า)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 9 | `4487768` | DB | create holidays table + seed Thai 2026 holidays (15 fixed-date) |
| 8 | `829fc26` | Auth sweep | hradmin/actions × 4 — permission-flag guards |
| 7 | `37947a1` | Auth sweep | api × 15 — permission-flag guards |
| 6 | `dabe802` | Auth sweep | hradmin/pages × 7 — permission-flag guards |
| 5 | `2213c73` | Auth sweep | new lib/route-auth.ts helper (isHrStaff + atomic + composers) |
| 4 | `af42193` | Docs | §3.1 verification finding + reprioritize |
| 3 | `48f372d` | Docs | refresh NEXT + append §10 SESSION_HISTORY |
| 2 | `615a9d0` | Careers | wire status change → applicant notification |
| 1 | `c692160` | Careers | wire applicant submit → HR notification |
| 0a | `550c431` | Tab 4 | activate Tab 4 in 3 sibling tab navs |
| 0b | `cf60c6b` | Tab 4 | calendar month view (server fetch + grid + popover) |

(11 ต่อจาก `cac1b31` = APR25_HOME handoff)

---

## 2. สิ่งที่เพิ่งส่งมอบ — ใช้งานได้จริงแล้ว

### Module: Leave (`/hradmin/leave`)
- 4 tabs ครบ — overview / requests / balances / **calendar (เพิ่งใหม่)**
- Calendar: month grid + filter chips + day-detail modal · **holidays รองรับแล้ว** (จักรี + สงกรานต์ + ฯลฯ ลองดู เม.ย./พ.ค. 2569)
- e2e flow verified — email + bell + balance ทำงานครบ (Apr 23-24)

### Module: Careers (`/careers/apply` + `/hradmin/applicants`)
- Apply 5 steps + status state machine + 8 email templates
- **In-app notification ครบ** (`application_received` → HR · `application_status_changed` → applicant best-effort)

### Module: Auth + Routing (เพิ่งใหม่)
- `lib/route-auth.ts` helper — isHrStaff, canManageSystem, etc.
- `/hradmin/*` ทั้งหมด (pages + APIs + actions, 26 route guards) → permission-flag-based
- **มด (HR Manager preset, role='manager') เข้า /hradmin/* ได้แล้วทุกหน้า**

### Module: Holidays (เพิ่งใหม่)
- DB schema + 15 seed rows for 2026
- /hradmin/holidays admin UI ใช้งานได้แล้ว (เคย silently fail ตอน SELECT)
- Calendar ทุกที่อ่านได้ (portal/calendar + Tab 4)

### (Carry from §10) Notification Center · Drawer + portal · Name formatter · Tab 1-3 leave — ใช้งานได้ครบ

---

## 3. สิ่งที่ยังเปิดอยู่ — เรียงตาม priority ใหม่

### 3.1 ✅ ~~Leave Phase 2 e2e test~~ — DONE (verified Apr 25)
ดู §11 ของ SESSION_HISTORY.md

### 3.2 ⭐ Vercel env vars — **5 นาที, dashboard step**

ยังไม่ set บน Vercel:

```bash
EMAIL_FROM_CAREERS = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR      = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM  = "EBCI System <no-reply@ebcinext.com>"
```

**Setup:**
1. ไป https://vercel.com/ (login as ปอนด์)
2. EBCI-Nexus → Settings → Environment Variables
3. Add แต่ละตัว — Name + Value + เลือก `Production` (และ `Preview` + `Development` ถ้าจะ test เต็มๆ)
4. Redeploy `nexus.ebcitrade.com` (หรือ trigger ผ่าน push commit)

CLI alternative:
```bash
npx vercel env add EMAIL_FROM_HR production
# แล้วพิมพ์ค่าเมื่อ prompt
```

ผลกระทบถ้าไม่ set: ใช้ fallback `EMAIL_FROM` เดิม (ยังส่งได้). Email identity แค่ไม่แยก HR/Careers/System.

### 3.3 Tab 4 calendar polish (เล็ก, opportunistic)

- **Mobile UX** — ลองใช้บน iPhone จริงก่อน (ปัจจุบันใช้ grid เดียวกับ desktop ลด cell-min-height + เปลี่ยน avatar เป็น dot). ถ้า cell เล็กเกินกด click ยาก → flip เป็น vertical day list บน mobile
- **Bell icon mapper** — `Briefcase` ที่ careers wiring ใช้ — verify `<NotificationItem />` รองรับใน switch (default fall-through ก็ใช้ Bell ได้แต่ไม่สวย)

### 3.4 Lunar Buddhist holidays for 2026

Seed คืนนี้รวมแค่วันหยุดที่ตรงเลข Gregorian (15 วัน). ต้องเพิ่ม 4 วันลูนาร์:
- มาฆบูชา (เดือน 3 ขึ้น 15 ค่ำ)
- วิสาขบูชา (เดือน 6 ขึ้น 15 ค่ำ)
- อาฬหบูชา (เดือน 8 ขึ้น 15 ค่ำ)
- เข้าพรรษา (วันถัดจากอาฬหบูชา)

Add via `/hradmin/holidays` admin UI (ใช้งานได้แล้ว) หรือเพิ่ม INSERT ใน `supabase/seeds/holidays_2026.sql` เมื่อรู้วันที่ตามราชกิจจานุเบกษาแน่นอน.

### 3.5 Granular permission narrowing (deferred — Phase 2 ของ sweep)

Sweep คืนนี้ใช้ `isHrStaff` (= legacy hr_admin OR can_edit_employees OR can_manage_system) ทุกที่ที่เคย gate `role==='hr_admin'`. นี่คือ MINIMUM unlock มด.

ต่อไปอาจจะแยก fine-grained:
- `/hradmin/system/quota` → เปลี่ยนแล้ว เป็น `canManageSystem || isLegacyHrAdmin` (super-admin only)
- `/hradmin/dashboard` (read-only stats) → อาจให้ Executive Viewer (จิม) เข้าได้ด้วย `canViewAllEmployees`
- `/hradmin/leave/inbox` (approve workflow) → อาจ narrower เป็น `canApproveLeave`

Skip ใน iteration นี้ — ทำเมื่อมี case จริง.

### 3.6 Carryover deferred

- Bulk adjust balance modal · `email-leave.ts:238` hardcoded `/portal/leave/inbox` (hr_admin click ผิด shell) · Careers Iter 2 zip download + review notes autosave · Pre-existing TS errors (embla, signature-canvas, recharts Formatter, 5x `r.value?.success` — ไม่ใช่ของ session นี้) · Submit validation: ปล่อย LV ส่งได้ทั้งที่ total=0 (จอย ลาพักร้อน) · Notification fan-out widening (careers/submit ยังหา recipients แค่ role='hr_admin' — ตอน narrowing, อาจจะ widen ให้รวม มด ด้วย)

---

## 4. Env vars + test accounts (คงเดิม)

```
# Existing บน Vercel (ไม่ต้อง re-config):
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL

# ยังไม่ set (§3.2):
EMAIL_FROM_CAREERS · EMAIL_FROM_HR · EMAIL_FROM_SYSTEM
```

**Test accounts:**
- Admin: `tumyen@gmail.com / 0000` (ปอนด์/สุริยะ/ม๊อด) — Super Admin (legacy hr_admin)
- L1: `l1test@ebci.test / 0000` (หวาน) — employee
- Manager (มด): `c.arthit@ebcitrade.com / 0839964333` — **HR Manager preset, เข้า /hradmin ได้แล้ว ✅**
- Manager (จิม): `thanawatana@ebcitrade.com / 0863699792` — Executive Viewer preset
- Sunny (คุณพ่อ): `sayan@ebcitrade.com / 0818331367` — manager (sayan dept)

---

## 5. Git + deploy state

- **Repo:** `caserebel-maker/EBCI-Nexus` (branch `main`)
- **Last commit:** `4487768` (holidays migration + seed)
- **Vercel deploy:** auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- Push pattern: `git push origin HEAD:main`
- **ก่อนเริ่ม session ถัดไป:** `git fetch origin && git pull origin main --ff-only`

---

## 6. DB state ปัจจุบัน

- **Employees:** 55 active · 4 มี manager_id · 3 mock approvers (จิม L4 ครบ scope · มด L3 leave+hr · ปุ๊ L3 leave+ot+budget 50k)
- **Users:** 3 rows (admin / mock_jim / mock_mod)
- **leave_requests:** 5 rows · 0 pending · 3 rejected · 2 approved
- **leave_balances:** seeded สำหรับ ปอนด์/จิม/มด/หวาน/จอย ปี 2026
- **notifications:** ทำงานครบ — leave + careers types
- **employee_audit_log:** ตารางมี · ยังไม่ได้ enable RLS
- **holidays:** ✅ ตารางมี · 15 rows สำหรับ 2026 (ขาดลูนาร์ — §3.4)

---

## 7. Quirks / lessons (carry forward)

1. **NEXT.md หลุด sync ได้ — ต้อง update ตอน UI session จบด้วย** (ดู §11 ของ SESSION_HISTORY.md)
2. **Multi-machine protocol works** — fetch + status + log ก่อนทุกครั้ง รักษาให้งานไม่ทับ
3. **DB เป็น source of truth สำหรับ "เสร็จหรือยัง"** — SQL snapshot เชื่อถือได้กว่า doc
4. **3 ที่ที่ระบบ "เสร็จ" ต้อง sync:** Code (commit) · DB (state) · Docs (NEXT.md)
5. **Route-auth sweep approach:** ใช้ wide composite check (`isHrStaff`) ก่อน — narrow per-route ค่อยทำเมื่อมี business case จริง

---

*Generated end of APR25 home-night session (3 tracks done) · Last commit `4487768` · Next session: §3.2 Vercel env vars (5 นาที dashboard).*

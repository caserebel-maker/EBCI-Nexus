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

**Office afternoon (Apr 24) ปิด A queue ครบ 6 รายการ + employee profile UX fix:**

1. **Critical fix earlier** — email recursion (already shipped earlier today, commit `ded6fdd`)
2. **Employee profile UX** — employee_code editable, dropdown affordance, grouped edit zone
3. **A1** — Bangkok-local date keys (slice bug fixed in 4 places)
4. **A2** — RLS on `employee_audit_log` + `can_view_audit_log` flag
5. **A3** — Forecast section on quota dashboard (storage projection 12 months)
6. **A4** — Notifications: type filter chips + date groups + swipe-to-delete
7. **A5** — Bulk emergency-contact import via paste-CSV
8. **A6** — Vercel deployment activity card (graceful degrade if no token)

**HR ปลอดภัยเริ่มแก้ข้อมูล + ใส่รูปได้แล้ว** — ทุกการแก้ persist ลง production DB ทันที, migrations ที่ผมทำเป็น ADD-only ไม่ลบข้อมูล

---

## 1. Commits ของ session นี้

| # | Commit | Track | สรุป |
|---|---|---|---|
| 11 | `b088f9e` | A5 | bulk emergency-contact import (paste from Excel) |
| 10 | `b8d0fc5` | A4 | notifications: swipe + groups + type filter |
| 9 | `5803ebb` | A3 + A6 | quota: forecast section + Vercel usage card |
| 8 | `b32d82a` | A2 | RLS on employee_audit_log + flag |
| 7 | `c6e8a1d` | UX fix | employee_code editable + dropdown chevron |
| 6 | `b3e81f3` | A1 | Bangkok-local date keys |
| 5 | `3edc4e9` | docs | refresh NEXT + §14 SESSION_HISTORY |
| 4 | `6c4c20a` | TS | sweep 22 → 0 |
| 3 | `b088f9e` & earlier | §3.6 carryover | review notes / zip / bulk adjust |
| 2 | `ded6fdd` | 🔥 | email recursion fix (3 wrappers) |
| 1 | (already in main from APR25 night) | — | — |

(11 ต่อจาก `e85a1a7`)

---

## 2. สิ่งที่เพิ่งส่งมอบ — ใช้งานได้จริงแล้ว

### Module: HR Admin (`/hradmin/employees`)
- **Edit profile** — รหัสพนักงานแก้ได้แล้ว · dropdown มี chevron ชัดเจน · edit zone เรียงเป็น group เดียว (รหัส / ประเภทการจ้าง / สถานะ / แผนก)
- **Bulk emergency-contact import** — `/hradmin/employees/bulk-emergency` paste 4-col จาก Excel · preview ก่อน apply · default ไม่เขียนทับข้อมูลเดิม
- **Quota dashboard** — Forecast section (storage 12-month projection) + Vercel deployment activity card (ถ้า set `VERCEL_API_TOKEN`)

### Module: Notifications (`/portal/notifications`)
- Type filter chips (ทุกประเภท / การลา / ประกาศ / ผู้สมัคร / ระบบ)
- Date groups (วันนี้ / เมื่อวาน / สัปดาห์นี้ / ก่อนหน้านั้น) — Bangkok-local
- Swipe-to-delete บน touch · hover-X บน desktop เหมือนเดิม

### Module: Reports + Time
- `checked_in_at` slice bug แก้แล้ว — late-night Bangkok ลงวันถูก
- `today/yesterday` preset ใน attendance-view ใช้ Bangkok-local
- Urgent-banner dismissal cookie ใช้ Bangkok-local

### Security: Audit log
- RLS เปิดใน `employee_audit_log` · `User.can_view_audit_log` flag · super-admins auto-granted

---

## 3. สิ่งที่ยังเปิดอยู่ — เรียงตาม priority

### 3.1 ✅ ~~Leave Phase 2 e2e test~~ — DONE Apr 25

### 3.2 ⭐ Vercel env vars — **5 นาที, dashboard step**

ยังต้อง set:
```bash
EMAIL_FROM_CAREERS  = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR       = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM   = "EBCI System <no-reply@ebcinext.com>"

# Optional — เปิด Vercel deployment card บน quota dashboard:
VERCEL_API_TOKEN    = "..."   (Account Settings → Tokens)
VERCEL_TEAM_ID      = "team_EE8l0QHf5AlQg5klF8YhfpFJ"
VERCEL_PROJECT_ID   = "prj_buArBae3HxOjH0wstTxZfZszCZT9"
```

ผู้ใช้ login Vercel dashboard เอง · CLI: `npx vercel env add ...`

### 3.3 Tab 4 calendar mobile UX (opportunistic)
iPhone จริงทดสอบ + flip vertical day list ถ้า cell เล็กเกินกด

### 3.4 ✅ ~~Lunar Buddhist holidays~~ — DONE Apr 25

### 3.5 Granular permission narrowing — deferred จนมี business case

### 3.6 ✅ **ปิดครบแล้ว** — review notes / zip / bulk adjust / TS sweep

### 3.7 A queue ✅ **ปิดครบแล้ว** — A1-A6 + employee UX fix

### B. ขอข้อมูลจากผู้ใช้/HR ก่อนทำ
- B3 e2e test feature ใหม่ของ session นี้ (review notes / zip / bulk adjust / forecast / Vercel card / bulk emergency)
- B4 verify ราชกิจจานุเบกษา 2569 lunar holidays
- B5 มด review `EBCI-employees-review.xlsx`

### C. คุยรายละเอียดก่อน
- C1 ตี๋ president's driver — เพิ่ม + leave_approver_id = ดำ
- C2 เบนซ์ override — case decision
- C3 Image crop Phase F — UX design
- C4 Granular permissions Phase 2

---

## 4. Env vars + test accounts (คงเดิม)

```
# Existing บน Vercel:
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL

# ยังไม่ set (§3.2):
EMAIL_FROM_CAREERS · EMAIL_FROM_HR · EMAIL_FROM_SYSTEM
VERCEL_API_TOKEN · VERCEL_TEAM_ID · VERCEL_PROJECT_ID
```

**Test accounts:** ปอนด์ admin / มด HR Manager / จิม Executive / Sunny พ่อ / หวาน L1 — รายการละเอียดอยู่ใน NEXT.md เก่า

---

## 5. Git + deploy state

- **Repo:** `caserebel-maker/EBCI-Nexus`
- **Last commit:** `b088f9e` (bulk emergency-contact import)
- **Vercel deploy:** auto — `https://nexus.ebcitrade.com`
- **Re-deploy ก่อน HR ใช้** — เพื่อให้ feature ใหม่ทั้งหมด live

---

## 6. DB state ปัจจุบัน

- **Employees:** 55 active
- **Migrations applied today:**
  - `add_review_notes_metadata_to_job_applications` (Apr 24 morning)
  - `enable_rls_employee_audit_log` (Apr 24 afternoon — A2)
- **Notifications:** ทำงานครบ — leave + careers types
- **Holidays:** 19 rows สำหรับ 2026 (15 fixed + 4 lunar tentative)

---

## 7. Build + types state

- **Routes:** 100 (+5 จาก APR25 night session)
  - +/api/hradmin/applicants/[id]/review-notes (PATCH)
  - +/api/hradmin/applicants/[id]/download-zip (GET)
  - +/api/hradmin/leave/balances/bulk (POST)
  - +/api/hradmin/employees/bulk-emergency-contact (POST)
  - +/hradmin/employees/bulk-emergency (page)
- **TypeScript:** clean (22 → 0 ก่อนหน้านี้, ไม่มี regression session นี้)
- **Build:** ✓ Compiled in ~3s

---

## 8. Quirks ของ session นี้

1. **`appearance-none` strips native chevron** — ต้อง re-add ด้วย bg-image SVG ใน `style={SEL_CHEVRON}` ทุก select dark theme
2. **`slice(0,10)` on UTC ISO** = wrong calendar day for Bangkok night users — ใช้ `bangkokDateKey()` / `todayBangkokKey()` แทน
3. **Vercel API graceful degrade** — `getVercelUsage()` คืน `has_token: false` เมื่อ env ว่าง · UI ซ่อนการ์ด ไม่ error
4. **Bulk import safety** — overwrite=false default · skip-existing · 1000-row cap
5. **RLS + service-role** — RLS policies don't affect server actions เพราะ service-role bypass · เพิ่ม policy ปลอดภัยทั้งคู่

---

*Generated end of APR24 office afternoon · 11 commits shipped · A queue + employee UX fix ครบ · Last commit `b088f9e` · routes 100*

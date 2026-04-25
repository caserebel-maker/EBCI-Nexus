# 📌 NEXT — เริ่มงานต่อที่นี่

> **ไฟล์นี้คือ single point of entry** สำหรับ session ถัดไป — ไม่ว่าจะเปิดที่เครื่องไหน
> พิมพ์ประโยคเดียวในช่อง Claude แล้วทำงานได้ทันที.

---

## 🎯 ประโยคเดียวที่ต้องพิมพ์

```
อ่าน docs/NEXT.md แล้วทำต่อ
```

แค่นี้. Claude จะอ่านไฟล์นี้ เห็น priority ด้านล่าง แล้วลุยข้อ §3.1 อัตโนมัติ. ถ้าอยากเลือกอย่างอื่นให้เพิ่มเลข `§3.2` / `§3.3` ท้ายประโยค.

**ก่อนลุย:** `cd /path/to/EBCI-Nexus-App && git pull origin main --ff-only` (ดึง 4 commits ใหม่ของ session นี้).

---

## 0. TL;DR ใน 30 วินาที

**Session นี้ปิด 4 commits · 2 tracks**

1. **Leave Phase 3 Tab 4 "ปฏิทิน"** — month-view grid + day-detail modal + dept/leave_type filter chips + holiday-aware (best-effort) — replaces "ในเร็วๆ นี้" stub.
2. **Careers → Notification Center wiring** — `application_received` ไป HR users ตอน submit; `application_status_changed` ไป applicant ตอนเปลี่ยน status (best-effort, ส่วนใหญ่ skip เพราะ applicant ไม่ใช่ employee).

**อันที่เร่งด่วนที่สุด:** §3.1 — **Leave Phase 2 end-to-end test** (ยัง carry มาจาก session ก่อน · 4 LVs ยัง pending ใน DB ตั้งแต่ Apr 23 · ยังไม่เคย verify email + balance transition).

---

## 1. Commits ของ session นี้ (เรียงจากใหม่ → เก่า)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 4 | `615a9d0` | Careers | wire status change → applicant notification (best-effort, soft email-match against employees, skip when no linkage) |
| 3 | `c692160` | Careers | wire applicant submit → HR notification (fan out to all role='hr_admin' users) |
| 2 | `550c431` | Leave Tab 4 | activate Tab 4 link in 3 sibling tab navs; drop "ในเร็วๆ นี้" footnote + unused Info import |
| 1 | `cf60c6b` | Leave Tab 4 | calendar month view — server fetch (overlap window), client grid + popover modal, filter chips, holidays best-effort |

(4 ต่อจาก `cac1b31` = APR25_HOME handoff)

---

## 2. สิ่งที่เพิ่งส่งมอบ — ใช้งานได้จริงแล้ว

### Tab 4: ปฏิทิน (`/hradmin/leave?tab=calendar`)
- Month grid (7 cols × 5–6 rows): weekend tint (rose), today highlight (maroon), holiday rose-tinted cells (when table populates), event count badge per cell, up to 3 leave_type-colored avatar dots + "+N" overflow
- Click day → modal with full list (avatar, employee name+nick, dept, leave_type pill, status pill, multi-day range, half-day annotation); each row links into Tab 2 by reference code
- Filters: leave_type chips (with palette color dot) + department chips. "All-active" semantic when none selected. URL: `?month=YYYY-MM`, `?leave_type=`, `?department=`, `?status=` (default `approved+pending` when omitted, per spec).
- Server (renderCalendarTab): single `Promise.all` — requests overlapping the visible month, employees, leave_types, holidays (best-effort, silently empty on missing table)
- Reuses: `YearSelector`, `formatEmployeeName` + `employeeInitials`, `resolveLeaveColor` (palette.ts), `STATUS_META` (types.ts)
- Test data ที่ visible พรุ่งนี้ใน prod: เม.ย. 2569 → LV-2026-0003 (หวาน 20-21/4 ลาป่วย, approved). พ.ค. 2569 → LV-2026-0005 (หวาน 15/5 ลากิจ, approved). LV-0001/0002 = rejected, default filter ซ่อน.

### Careers → Notification Center
- `/api/careers/apply/[id]/submit/route.ts`: หลัง row → `submitted` + emails ส่งแล้ว fan out `application_received` ไป User ทุกคนที่ `role='hr_admin'`. title = "{ชื่อ} สมัคร{ตำแหน่ง}", icon Briefcase, color blue, action_url `/hradmin/applicants/{id}`.
- `/api/hradmin/applicants/[id]/status/route.ts`: หลัง update + email applicant พยายามหา linked user_id ผ่าน `employees.email` match (โดย `ilike`). พบ → `application_status_changed` (color ตาม status: hired=green, rejected=red, interview/shortlisted=blue, others=amber). ไม่พบ → skip silently (case ปกติ — applicant ยังไม่ใช่ employee).
- ทั้งคู่ wrap try/catch + `Promise.allSettled` เพื่อให้ noti fail ไม่กระทบ submit/status response.

### (Carry from §9) Tab 2/3, drawer fixes, name formatter — ดู §10 ของ SESSION_HISTORY.md

---

## 3. สิ่งที่ยังเปิดอยู่ — เรียงตาม priority

### 3.1 ⭐ Leave Phase 2 end-to-end test — **เร่งด่วน** (carry from APR25)

4 LVs ยัง pending ใน DB ตั้งแต่ Apr 23 — feature ship มาหลาย session แต่ยังไม่เคย verify email + balance transition + noti chain ครบ.

**Test matrix (เหมือนเดิม):**

| Step | Login | Path | Action | ตรวจสอบ |
|---|---|---|---|---|
| 1 | จิม `thanawatana@ebcitrade.com / 0863699792` | `/hradmin/leave/inbox` | approve `LV-2026-0001` (ปอนด์ ลากิจ 25/4) | email "อนุมัติ" → ปอนด์ + bell badge + balance pending→used |
| 2 | Sunny `sayan@ebcitrade.com / 0818331367` | `/portal/leave/inbox` | reject `LV-2026-0002` (จอย ลาพักร้อน) | email ปฏิเสธ + balance คืน |
| 3 | มด `c.arthit@ebcitrade.com / 0839964333` | `/hradmin/leave/inbox` | approve `LV-2026-0003` (หวาน ลาป่วย) | email + balance |
| 4 | ปอนด์ logged in | topbar bell | — | badge = 1 ใหม่ · click → /portal/leave |

**Time:** 30–45 นาที · ต้อง switch login หลายบัญชี (incognito).

**คำสั่ง:** `ทำ §3.1 test Leave Phase 2 · เตรียม SQL query ดูสถานะ 4 LV ก่อน แล้วบอกให้ login ทีละขั้น`

### 3.2 Vercel env vars ใหม่ — ต้อง set ก่อน test email

```bash
EMAIL_FROM_CAREERS = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR      = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM  = "EBCI System <no-reply@ebcinext.com>"
```

ถ้าไม่ set → fallback `EMAIL_FROM` (ยังส่งได้). ถ้าจะทดสอบ §3.1 ควร set ก่อน เพื่อ verify identity แยกด้วย.

### 3.3 Permission-flag-based route auth (NEW — surfaced คืนนี้)

Careers wiring คืนนี้ตอกย้ำว่า `/hradmin/*` route guard ยัง hardcode `session.role !== 'hr_admin'`. ผลคือ มด (HR Manager preset, role='manager') ถูกบล็อกไม่ให้เข้า /hradmin แม้ permission flags จะครบ. ต้องเปลี่ยน guard เป็น permission-based (`can_edit_employees` / `can_manage_system`) — กระทบหลายไฟล์ ทำเป็น sweep แยก iteration. (Tab 1 dashboard, Tab 2/3/4 dispatcher, applicants routes, holidays, balances, force-action, etc.)

### 3.4 Leave Tab 4 polish (small)

- Holiday data: DB ไม่มีตาราง `holidays` → calendar เห็นแต่เสาร์-อาทิตย์ Pink. ต้องตัดสินใจ: สร้าง schema + seed (วันหยุดราชการไทย), หรือใช้ external API.
- Mobile: ปัจจุบันใช้ grid เดียวกับ desktop (ลด cell-min-height + เปลี่ยน avatar เป็น dot). ถ้าใช้งานจริงไม่ workable ค่อย flip เป็น vertical day list.
- Bell icon mapper: `Briefcase` ที่ wire คืนนี้ ต้องตรวจ `<NotificationItem />` ว่า lucide map ครอบคลุมไหม (default fall-through ก็ใช้ได้แต่ดูไม่สวย).

### 3.5 Carryover deferred (จาก APR25_HOME)

- Bulk adjust balance modal (ปรับหลายคนพร้อมกัน — ยังไม่ทำใน Tab 3 iteration)
- Leave approver email button (`src/lib/email-leave.ts:238`) hardcoded `/portal/leave/inbox` — hr_admin จะ click ผิด shell
- Careers Iter 2 leftovers: zip download documents + review notes autosave
- Pre-existing TS errors (embla-carousel, react-signature-canvas, recharts Formatter types in MonthlyTrendChart/LeaveTypePie/DepartmentBarChart, `r.value?.success` in 2 careers routes — ไม่ใช่ของ session นี้)

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
- Admin: `tumyen@gmail.com / 0000` (ปอนด์/สุริยะ/ม๊อด)
- L1: `l1test@ebci.test / 0000` (หวาน)
- Manager (มด): `c.arthit@ebcitrade.com / 0839964333`
- Manager (จิม): `thanawatana@ebcitrade.com / 0863699792`
- Sunny (คุณพ่อ): `sayan@ebcitrade.com / 0818331367`

---

## 5. Git + deploy state

- **Repo:** `caserebel-maker/EBCI-Nexus` (branch `main`)
- **Last commit:** `615a9d0` (careers status change → applicant notification)
- **Vercel deploy:** auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- Worktree office (legacy): `.claude/worktrees/priceless-heisenberg-55cb19` — ไม่ได้ใช้ session นี้ (commit ตรง main)
- Push pattern: `git push origin HEAD:main`
- **ก่อนเริ่ม session ถัดไป:** `git fetch origin && git pull origin main --ff-only`

---

## 6. Build state

- **Routes:** เพิ่ม Tab 4 (no new API endpoint — server-fetched ใน `/hradmin/leave` page.tsx เดิม)
- Build ผ่าน Next 16.2.2 (Turbopack)
- **TS errors:** 0 ใหม่จาก session นี้. Pre-existing errors เดิม (embla, signature-canvas, recharts Formatter, 3x `r.value?.success`) ไม่กระทบ.

---

## 7. Key file map (ไฟล์ที่แตะใน session นี้)

```
src/
├── app/
│   ├── api/
│   │   ├── careers/apply/[id]/submit/route.ts          # +createNotification fan-out (HR users)
│   │   └── hradmin/applicants/[id]/status/route.ts     # +createNotification (applicant via email-match)
│   └── hradmin/leave/
│       ├── page.tsx                                     # +renderCalendarTab + month param + IMPLEMENTED_TABS
│       ├── calendar-view.tsx                            # NEW — full Tab 4 client (~470 lines)
│       ├── overview-view.tsx                            # remove comingSoon + footnote + unused Info
│       ├── requests-view.tsx                            # remove comingSoon
│       └── balances-view.tsx                            # remove comingSoon

# Reused (no change):
src/lib/format-employee-name.ts, src/lib/notifications.ts,
src/components/hradmin/leave/{palette,types,YearSelector}.ts
```

---

## 8. Quirks ของ session นี้

1. **Holidays table missing.** `from('holidays')` returns `relation does not exist`. Wrapped the parallel fetch with `.then(ok, ()=>{data:[]})` adapter so `Promise.all` doesn't reject. Calendar gracefully shows weekends only. (See §3.4 for resolution path.)

2. **Cross-month leave spans clip cleanly.** A leave Apr 28 → May 3 now appears in both April AND May views — the server expansion clamps per-day events to the visible month so day-cells stay tidy. No de-dupe needed because they're independent month renders.

3. **Status route default of `approved+pending`.** Per spec: when `?status=` omitted, default to `['approved','pending']`. Explicit `?status=` (empty) is preserved as empty so power users can opt out — keeps the URL contract honest.

4. **mod (HR Manager preset) won't get HR notifications yet** because the route's own guard is still role-based (`hr_admin`). Same gap surfaces everywhere `/hradmin/*` lives. See §3.3 — fix is a separate sweep.

5. **Soft email-match for applicant→user_id.** No `user_id` column on `job_applications`. Status-change notification falls back to `employees.email ilike applicantEmail` to discover linkage; usually returns null and the noti silently skips. Email is still authoritative — this just adds a courtesy bell badge for the rare existing-employee re-application.

6. **Multi-machine session protocol now alive.** This session demonstrated the full flow: open laptop home → `git fetch` → user said pull → reads `CLAUDE.md` + `docs/NEXT.md` → executes plan from there. Session END writes to `NEXT.md` (overwrite) + appends `SESSION_HISTORY.md` (no new HANDOFF file). Pattern locked in `CLAUDE.md`.

---

*Generated end of APR25 home-night session · 4 commits shipped · Last commit `615a9d0`.
ที่เครื่องอื่นพิมพ์ `อ่าน docs/NEXT.md แล้วทำต่อ` แล้ว Claude จะเริ่มที่ §3.1 อัตโนมัติ.*

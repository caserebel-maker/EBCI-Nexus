# 📌 NEXT — เริ่มงานต่อที่นี่

> **ไฟล์นี้คือ single point of entry** สำหรับ session ถัดไป — ไม่ว่าจะเปิดที่เครื่องไหน
> พิมพ์ประโยคเดียวในช่อง Claude แล้วทำงานได้ทันที.

---

## 🎯 ประโยคเดียวที่ต้องพิมพ์

```
อ่าน docs/NEXT.md แล้วทำต่อ
```

แค่นี้. Claude จะอ่านไฟล์นี้ เห็น priority ด้านล่าง แล้วลุยข้อ §3.1 อัตโนมัติ. ถ้าอยากเลือกอย่างอื่นให้เพิ่มเลข `§3.2` / `§3.3` ท้ายประโยค.

**ก่อนลุย:** `cd /path/to/EBCI-Nexus-App && git pull origin main --ff-only` (ดึง 13 commits ใหม่ของ session นี้).

---

## 0. TL;DR ใน 30 วินาที

**Session นี้ปิด 13 commits · ทั้งหมด Leave Management Phase 3**

1. **Tab 2 "ใบลาทั้งหมด"** — table + filters + CSV export + force approve/reject + create-on-behalf
2. **Tab 3 "วันลาพนักงาน"** — pivot table + manual balance adjust + CSV export
3. **Drawer fixes × 2** — portal + mobile full-screen + z-index normalization (topbar chips z-[100] → z-[60])
4. **Name format helper** — full name + (nickname) across all leave tables

**อันที่เร่งด่วนที่สุด:** §3.1 — **Leave Phase 2 end-to-end test** (4 LVs ยัง pending ใน DB ตั้งแต่ Apr 23 · ยังไม่เคย verify email + balance transition).

---

## 1. Commits ของ session นี้ (เรียงจากใหม่ → เก่า)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 13 | `cac1b31` | **Name UX** | show full name + (nickname) across all leave tables + new `format-employee-name.ts` helper |
| 12 | `d00ffc4` | **Tab 3** | activate Tab 3 "วันลาพนักงาน" in nav |
| 11 | `7e83be7` | **Tab 3** | CSV export for balances (14 cols, notes joined with ` \| `) |
| 10 | `50ce851` | **Tab 3** | adjust balance modal (portal z-[90]) + PATCH API with audit trail |
| 9 | `fe52877` | **Tab 3** | pivot table + filters (dept/level/type/search + quick filters) |
| 8 | `c1dd7e8` | **Drawer fix** | z-index normalize — shell topbar chips z-[100] → z-[60] |
| 7 | `5428625` | **Drawer fix** | mobile full-screen + conditional actions + React portal |
| 6 | `a9431a9` | **Tab 2** | activate Tab 2 in nav |
| 5 | `ad22f17` | **Tab 2** | create leave on behalf of employee (auto-approved) |
| 4 | `0acc901` | **Tab 2** | force approve/reject override (balance delta by old/new state) |
| 3 | `67da7ab` | **Tab 2** | CSV export (UTF-8 BOM, Excel Thai safe) |
| 2 | `2cf412f` | **Tab 2** | requests table + filters + pagination + detail drawer |
| 1 | `c19d012` | **Docs** | consolidate 9 handoffs → `SESSION_HISTORY.md` |

(13 ต่อจาก `f44a168` = APR25_HOME handoff)

---

## 2. สิ่งที่เพิ่งส่งมอบ — ใช้งานได้จริงแล้ว

### Tab 2: ใบลาทั้งหมด (`/hradmin/leave?tab=requests`)
- URL-driven filters: `status` / `leave_type` / `department` / `q` (employee search) / `from` / `to` / `page`
- 8-column desktop table + mobile card list
- Row click → portal detail drawer (mobile full-screen, desktop right-slide 520px)
- ⋯ menu: ดูรายละเอียด · บังคับอนุมัติ · บังคับปฏิเสธ · ยกเลิก
- Drawer footer: conditional actions per status (no more disabled buttons)
- CSV export (UTF-8 BOM, 12 cols) · `/api/hradmin/leave/export`
- Force-action API (`/api/hradmin/leave/force-action`): handles balance delta across ANY state transition
- Create-on-behalf API + modal: typeahead employee search, auto-approved flow

### Tab 3: วันลาพนักงาน (`/hradmin/leave?tab=balances`)
- Desktop pivot table: 25 employees × N leave types per page
- Mobile card layout (1 card = 1 employee, rows = leave types)
- Cell badge `"used / total"` with tone (gray / green / amber / red) + violet dot for `is_manually_adjusted`
- Filters: quick pills (ใช้สิทธิ์เยอะ / ยังไม่ใช้ / ปรับแต่งเอง) + Level L1-L5 + dept + leave type + search
- Click cell → focused adjust modal · Pencil → edit all types at once
- PATCH API (`/api/hradmin/leave/balances`): upsert + audit line in `notes` + `is_manually_adjusted=true`
- CSV export (14 cols) · `/api/hradmin/leave/balances/export`
- Reason ≥ 10 chars required, warning when new total < used+pending (allowed)

### Drawer UX (z-index + portal)
- `RequestDetailDrawer` portals to `document.body` via `createPortal`
- Mobile: full-viewport takeover, back-arrow left, safe-area insets
- Desktop: right-slide 480/520px with backdrop
- **Shell topbar chips `z-[100] → z-[60]`** — fixes the "bell + globe visible over drawer" bug

### Name formatter (`src/lib/format-employee-name.ts`)
- `formatEmployeeName(emp)` → `"สุริยะ จันทรวงศ์ (ม๊อด)"`
- `employeeInitials(emp)` → avatar initials (2 chars)
- Accepts both snake_case (DB rows) + camelCase (client props)

---

## 3. สิ่งที่ยังเปิดอยู่ — เรียงตาม priority

### 3.1 ⭐ Leave Phase 2 end-to-end test — **เร่งด่วน**

4 LVs ยัง pending ใน DB ตั้งแต่ Apr 23 — feature ship มาหลาย session แต่ยังไม่เคย verify email + balance transition + noti chain ครบ.

**Test matrix:**

| Step | Login | Path | Action | ตรวจสอบ |
|---|---|---|---|---|
| 1 | จิม `thanawatana@ebcitrade.com / 0863699792` | `/hradmin/leave/inbox` | approve `LV-2026-0001` (ปอนด์ ลากิจ 25/4) | email "อนุมัติ" → ปอนด์ (from `hr@ebcinext.com` ถ้า env set แล้ว) + bell badge + balance pending→used |
| 2 | Sunny `sayan@ebcitrade.com / 0818331367` | `/portal/leave/inbox` | reject `LV-2026-0002` (จอย ลาพักร้อน) | email ปฏิเสธ + balance คืน |
| 3 | มด `c.arthit@ebcitrade.com / 0839964333` | `/hradmin/leave/inbox` | approve `LV-2026-0003` (หวาน ลาป่วย) | email + balance |
| 4 | ปอนด์ logged in | topbar bell | — | badge = 1 ใหม่ · click → /portal/leave |

**Time:** 30–45 นาที · ต้อง switch login หลายบัญชี (incognito). ถ้าเจอ bug ให้ fix ทันที.

**คำสั่งเพิ่มเติม:** `ทำ §3.1 test Leave Phase 2 · ช่วยเตรียม SQL query ดูสถานะ 4 LV ก่อน แล้วบอกผมให้ login ทีละขั้น`

### 3.2 Vercel env vars ใหม่ — ต้อง set ก่อน test email

```bash
EMAIL_FROM_CAREERS = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR      = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM  = "EBCI System <no-reply@ebcinext.com>"
```

ถ้าไม่ set → ใช้ `EMAIL_FROM` เดิม (ยังส่งได้ · แต่ leave email จะส่งจาก `careers@…` ต่อไป). **ถ้าจะทดสอบ §3.1 ควร set ก่อน** เพื่อ verify identity แยกด้วย.

CLI: `npx vercel env add EMAIL_FROM_HR production` (แล้วพิมพ์ค่า). หรือไป Vercel Dashboard → Settings → Environment Variables.

### 3.3 Leave Phase 3 Tab 4: ปฏิทิน — ~1.5 ชม

Sidebar link พร้อมแล้ว (`/hradmin/leave?tab=calendar`) แต่ page ยัง stub `ในเร็วๆ นี้`. ต้องสร้าง:
- Calendar month view
- Density coloring per day (0/low/med/high based on approved leave count)
- Day click → popover with "ใครลาวันนั้น" list
- Holiday overlay (dim + "วันหยุด" label จาก `holidays` table)
- Year/month nav via querystring

Pattern: อ้างอิง Tab 2/3 — server fetch in `page.tsx` branch, client view = new `calendar-view.tsx`.

### 3.4 Careers → Notification Center — 20–30 นาที · งานเล็ก

Careers email templates 8 ตัวครบแล้วแต่ยังไม่ emit in-app noti. 2 call sites:
- `src/app/api/careers/apply/[id]/submit/route.ts` → HR `application_received`
- `src/app/api/hradmin/applicants/[id]/status/route.ts` → applicant `application_status_changed`

ใช้ pattern เดียวกับ `src/app/api/leave/submit/route.ts` line 257 — best-effort try/catch.

### 3.5 Deferred / nice-to-have

- Bulk adjust balance modal (ปรับหลายคนพร้อมกัน — ยังไม่ทำใน Tab 3 iteration นี้)
- Leave approver email button (`src/lib/email-leave.ts:238`) ยัง hardcode `/portal/leave/inbox` — hr_admin จะ click ผิด shell
- Careers Iter 2 leftovers: zip download documents + review notes autosave
- Pre-existing TS errors (embla-carousel, react-signature-canvas)

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
- **Last commit:** `cac1b31` (name format refactor)
- **Vercel deploy:** auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- Worktree: `.claude/worktrees/priceless-heisenberg-55cb19` (branch `claude/priceless-heisenberg-55cb19`)
- Push pattern: `git push origin HEAD:main`
- **ก่อนเริ่ม session ถัดไป:** `git fetch origin && git pull origin main --ff-only`

---

## 6. Build state

- **Routes:** 39 (+5 จาก APR25_HOME: `/api/hradmin/leave/export`, `/force-action`, `/create-on-behalf`, `/balances`, `/balances/export`)
- Build ผ่าน Next 16.2.2 (Turbopack) · compile ~4s
- ไม่มี TS/lint error ใหม่

---

## 7. Key file map (ส่วนที่เพิ่มใน session นี้)

```
src/
├── app/
│   ├── api/
│   │   ├── employees/search/route.ts               # typeahead (for create-on-behalf)
│   │   └── hradmin/leave/
│   │       ├── export/route.ts                     # requests CSV
│   │       ├── force-action/route.ts               # approve/reject/cancel override
│   │       ├── create-on-behalf/route.ts           # HR creates leave for employee
│   │       └── balances/
│   │           ├── route.ts                        # PATCH balance + audit
│   │           └── export/route.ts                 # balances CSV
│   └── hradmin/leave/
│       ├── page.tsx                                # dispatch: overview | requests | balances
│       ├── overview-view.tsx                       # Tab 1 (pre-existing, tab list updated)
│       ├── requests-view.tsx                       # Tab 2 client wrapper
│       └── balances-view.tsx                       # Tab 3 client wrapper
├── components/hradmin/leave/
│   ├── types.ts                                    # shared types (requests + balances)
│   ├── RequestFilters.tsx                          # Tab 2 filter bar
│   ├── RequestsTable.tsx                           # Tab 2 table + cards
│   ├── RequestDetailDrawer.tsx                     # Tab 2 drawer (portal + z-[80])
│   ├── ForceActionDialog.tsx                       # Tab 2 confirm (z-[90])
│   ├── CreateOnBehalfModal.tsx                     # Tab 2 form (z-[90])
│   ├── BalancesFilters.tsx                         # Tab 3 filters
│   ├── BalancesTable.tsx                           # Tab 3 desktop pivot
│   ├── BalancesCards.tsx                           # Tab 3 mobile cards
│   └── AdjustBalanceModal.tsx                      # Tab 3 form (portal + z-[90])
└── lib/
    └── format-employee-name.ts                     # name helper (used across 6 files)
```

**Modified:**
- `src/components/layout/shell.tsx` — topbar chips z-[100] → z-[60]

---

## 8. Quirks ของ session นี้

1. **z-index scale ใหม่**:
   ```
   z-[60]   topbar chips (+ bell/language dropdowns inside)
   z-50     sidebar, bottom nav
   z-[80]   drawer panel (RequestDetailDrawer portal)
   z-[90]   confirm dialogs (ForceAction, CreateOnBehalf, AdjustBalance)
   z-[100]  emergency banner, ImageCropModal
   ```

2. **Portal mount กัน trap**: `RequestDetailDrawer` + `AdjustBalanceModal` ใช้ `createPortal(…, document.body)` + `mounted` state → หลุดจาก parent ที่ transform/overflow.

3. **Conditional action buttons** (drawer footer): grid auto-sizes columns ตามจำนวน actions ที่ valid ต่อ status. No more disabled buttons.

4. **Balance delta across transitions** (force-action): compute old/new "consumption bucket" (pending / used / none) → delta ที่ pending_days + used_days. Clamp ≥ 0.

5. **Quick filter ต้อง resolve employee pool ก่อน paginate** (Tab 3): ถ้าใส่ `filter=adjusted` แต่ paginate หลัง → page 1 ว่างเปล่าเพราะ employees rows ที่ adjusted กระจาย. Fix: pre-fetch balance rows → allowlist employee_ids → apply to empQuery ก่อน range().

6. **Name format fallback**: ถ้า `first_name_th + last_name_th` ว่างแต่มี nickname → แสดง nickname อย่างเดียว · ไม่ใช่ `—`.

---

*Generated end of APR24 afternoon session · 13 commits shipped · Last commit `cac1b31`.
ถึงบ้านพิมพ์ `อ่าน docs/NEXT.md แล้วทำต่อ` แล้ว Claude จะเริ่มที่ §3.1 อัตโนมัติ.*

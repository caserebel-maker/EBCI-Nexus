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

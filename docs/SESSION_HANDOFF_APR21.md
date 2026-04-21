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

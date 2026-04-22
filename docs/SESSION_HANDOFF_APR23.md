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

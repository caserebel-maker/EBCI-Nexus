# Session Handoff — 24 เม.ย. 2026 (EBCI Nexus)

> **เปิดไฟล์นี้ก่อนเริ่มงานที่คอมที่บ้าน**
> ต่อจาก `docs/SESSION_HANDOFF_APR23.md` — ไฟล์นี้เป็น delta ของ laptop
> night-session (23 เม.ย.) ที่ปิด Notification Center + topbar polish
> พร้อมแผน next step ที่ชัดสำหรับ Claude session ใหม่.

---

## 0. TL;DR ใน 60 วินาที

**Laptop session ปิด 10 commits · 1 feature track (Notification Center) + UI polish**

1. **Notification Center ครบลูป** — bell + badge + dropdown + 5 API endpoints + hook + wired เข้า leave submit/approve/reject (email chain + in-app noti คู่กัน)
2. **Topbar polish** — ลบ dark-mode toggle · Facebook-style chip icons (rounded-full bg-white/10) · mobile panel ลอยจากด้านบนเหมือน Facebook web
3. **DB schema fix** — drop FK `notifications.recipient_user_id → User(id)` (FK ชี้ไป Prisma CUID ที่ runtime ไปไม่ถึง) · re-seed test notification ด้วย auth UUID

**ไม่ได้ทำ:**
- §2.4 End-to-end test Leave Phase 2 (4 LVs ยังรออยู่ใน DB)
- §2.2 Leave Phase 3 — HR admin dashboard (ยังไม่เริ่ม)
- §2.3 Careers Iter 2 leftovers (download-all zip + review notes autosave)
- Notification Center Phase 2 — ยังไม่ wire careers status changes

---

## 1. สิ่งที่ปิดใน laptop session (since `531dc51`)

| # | Commit | Track | สรุปสั้น |
|---|---|---|---|
| 10 | `16f33ce` | Noti UX | mobile — floating anchored panel (Facebook-style, ไม่ใช่ full-screen) |
| 9  | `1cb6f7d` | Noti UX | (reverted) mobile full-screen sheet |
| 8  | `0412d2d` | Topbar | persistent chip backgrounds (Facebook action-bar feel) |
| 7  | `5b1bb44` | Topbar | (reverted) unified strip rounded-lg |
| 6  | `0d754cb` | Topbar | (reverted) 56 px + gap 4 |
| 5  | `ea67315` | Topbar | (reverted) bump to 48 px |
| 4  | `e15ec5a` | **Noti fix** | use auth UUID for `recipient_user_id` + remove dark-mode toggle |
| 3  | `9f0da3f` | **Noti** | wire leave submit/approve/reject → create notifications |
| 2  | `8ad47d5` | **Noti** | bell icon + dropdown UI in topbar |
| 1  | `d5439be` | **Noti** | database helpers + 5 API endpoints |

หมายเหตุ: commits `5-9` คือการ iterate UI style หลายรอบตาม feedback — ผลลัพธ์สุดท้ายอยู่ใน `0412d2d` (chip style) + `16f33ce` (mobile panel).

### 1.1 Notification Center สรุป scope

**Backend (commit `d5439be`):**
- `src/lib/notifications.ts` — `createNotification()` best-effort wrapper + `getEmployeeUserId` + `resolveSessionUserId` + icon/color defaults
- 5 endpoints: `GET list · GET unread-count · POST [id]/read · POST mark-all-read · DELETE [id]`
- ทุก endpoint session-scoped, expired rows excluded

**UI (commit `8ad47d5`):**
- `src/hooks/useNotifications.ts` — 30s polling, paused on `document.hidden`, optimistic mutations
- `src/components/notifications/` — Bell (badge + chip style) · Dropdown · Item · EmptyState
- Wired ใน `src/components/layout/shell.tsx` topbar

**Wire leave (commit `9f0da3f`):**
- submit → approver gets `leave_request_pending` (amber, Calendar)
- approve → applicant gets `leave_approved` (green, CheckCircle)
- reject → applicant gets `leave_rejected` (red, XCircle)
- ทั้ง 3 ใช้ pattern best-effort try/catch — ไม่ break response ถ้า noti fail

**DB fix (commit `e15ec5a`):**
- **Dropped FKs** ใน Supabase: `notifications_recipient_user_id_fkey` + `notifications_sender_user_id_fkey`
- Re-seeded test row: `recipient_user_id = 9dc14c59-d2a3-4804-abf1-14417507f0dc` (ปอนด์'s auth UUID)
- Simplified `resolveSessionUserId()` → return `session.id` ตรง ๆ
- ปอนด์'s User.id cuid (`cm6ml6x8n...`) ต่างจาก auth UUID — FK เดิมทำให้ resolver ไปถึงไม่ได้

### 1.2 Topbar final style (commit `0412d2d` + `16f33ce`)

**Desktop + mobile:**
- 3 ปุ่ม (Refresh/Bell/Language) เป็น `h-10 rounded-full bg-white/10` chip ตลอดเวลา (ไม่ใช่ hover-only)
- Gap 1.5 (6px) → ติดกันเป็น cluster
- Icons 20px, Globe 20px + "TH" 13px
- Badge bell: 18px red pill

**Mobile dropdown:**
- Floating panel `fixed left-2 right-2 top-[safe-area+56px]` ลอยจากด้านบน
- `max-h-[calc(100dvh-72px)]` กันชน bottom nav
- Backdrop ดำมืด — tap นอก panel = ปิด
- X icon ปิดที่มุมขวา header (desktop ใช้ outside-click)

**Dark-mode toggle ลบออกแล้ว** จาก shell + careers layout + ลบไฟล์ `mode-toggle.tsx`

---

## 2. สิ่งที่ยังไม่เสร็จ — เลือกทางต่อ

### 2.1 ⭐ **OPTION A — Test Leave Phase 2 end-to-end** (แนะนำก่อน)

Noti system ถูก wire แล้ว — ควร test ก่อนว่าทั้ง email + in-app noti ทำงานครบ. ข้อมูล test ยังอยู่ใน DB.

**Test matrix (จาก APR23 §2.4):**

| Step | Login as | Action | Expected |
|---|---|---|---|
| 1 | จิม `thanawatana@ebcitrade.com` / `0863699792` | inbox → approve `LV-2026-0001` | ปอนด์: email "อนุมัติ" + in-app noti + balance pending→used |
| 2 | Sunny `sayan@ebcitrade.com` / … | inbox → reject `LV-2026-0002` (≥10 chars reason) | จอย: email "ปฏิเสธ" + in-app noti + balance คืน |
| 3 | มด `c.arthit@ebcitrade.com` / `0839964333` | inbox → approve `LV-2026-0003` | หวาน: email + in-app noti |
| 4 | ปอนด์ logged in | bell icon badge = 1 (อนุมัติจาก step 1) | click → navigate /portal/leave |

**Time estimate:** 30-45 นาที. ต้อง switch login หลายบัญชี (browser incognito + 3-4 หน้าต่าง).

### 2.2 **OPTION B — Leave Phase 3 (HR admin dashboard)**

Spec: APR23 §2.2. Route `/hradmin/leave/admin` · hr_admin only. ~1500 LoC · เป็น session ใหม่เดี่ยว ๆ.

Scope:
- Tab 1: ภาพรวม (cards + recharts วันลารายเดือน)
- Tab 2: Balance management (table + modal แก้ balance)
- Tab 3: ใบลาทั้งหมด (filters + override approve/reject + CSV export)
- Tab 4 (optional): Leave types read-only

### 2.3 **OPTION C — Notification Center Phase 2 (wire Careers)**

ปัจจุบัน Careers มี 8 email templates ครบ แต่ **ไม่ได้ emit in-app notification**. ทำเพิ่มที่:
- `src/app/api/careers/apply/[id]/submit/route.ts` → HR `application_received`
- `src/app/api/hradmin/applicants/[id]/status/route.ts` → applicant `application_status_changed`
- ใช้ `createNotification()` pattern เดียวกับ leave

**Time estimate:** 20-30 นาที (4-5 call sites · small diffs).

### 2.4 **OPTION D — Careers Iter 2 leftovers** (APR23 §2.3)

- Download-all zip (library: `jszip`, ~150 LoC) — user บอก "DEFER if too complex"
- Review notes auto-save — textarea สำหรับ HR จดโน้ตตลอด (ปัจจุบัน append แค่ตอน status change)
- Tests: status transition edge cases

### 2.5 Deferred / nice-to-have

- Leave inbox count badge on sidebar (~50 LoC)
- `checked_in_at` slice bug ใน `src/app/hradmin/reports/actions.ts:69`
- Vercel usage metrics ใน quota dashboard (needs Vercel API)
- Noti: swipe-to-delete on mobile · group by date · type filter

---

## 3. Key files cheat sheet (delta จาก APR23)

```
src/
├── app/api/notifications/
│   ├── list/route.ts                  # GET items + unread_count + total
│   ├── unread-count/route.ts          # GET cheap count (polled 30 s)
│   ├── mark-all-read/route.ts         # POST RPC mark_all_notifications_read
│   └── [id]/
│       ├── read/route.ts              # POST mark one read
│       └── route.ts                   # DELETE hard delete (owner-scoped)
├── components/notifications/
│   ├── NotificationBell.tsx           # Bell + badge + dropdown trigger
│   ├── NotificationDropdown.tsx       # Responsive panel (desktop drop / mobile floating)
│   ├── NotificationItem.tsx           # Item row (stripe + icon bubble + time ago)
│   └── EmptyState.tsx                 # "ยังไม่มีการแจ้งเตือน"
├── hooks/
│   └── useNotifications.ts            # Polling + optimistic mutations
├── lib/
│   └── notifications.ts               # createNotification + resolvers + icon/color maps
└── components/layout/shell.tsx        # Topbar + bell injection
```

**Modified:**
- `src/app/api/leave/submit/route.ts` — noti after email chain (approver)
- `src/app/api/leave/[id]/approve/route.ts` — noti after email (applicant)
- `src/app/api/leave/[id]/reject/route.ts` — noti after email (applicant)
- `src/components/layout/shell.tsx` — ลบ ModeToggle import + usage
- `src/app/careers/layout.tsx` — ลบ ModeToggle
- `src/components/ui/language-toggle.tsx` — chip style

**Deleted:**
- `src/components/mode-toggle.tsx`

---

## 4. Quirks + lessons

1. **`notifications.recipient_user_id` stores auth UUID ไม่ใช่ User.id cuid.**
   FK เดิมชี้ไป `public."User".id` ที่เป็น CUID จาก Prisma era. Drop FK แล้วใช้ auth UUID ตลอด. `resolveSessionUserId()` ตอนนี้ return `session.id` ตรง ๆ.

2. **ทุก `createNotification()` call wrap ด้วย try/catch ตลอด.**
   Notification เป็น soft side-effect — ถ้าพลาดต้องไม่ break primary action (email + DB update). Pattern จาก `src/app/api/leave/submit/route.ts` ประมาณบรรทัด 260.

3. **Topbar chip style: `bg-white/10` ตลอดเวลา ไม่ใช่แค่ hover.**
   ถ้าเปลี่ยนเป็น transparent จะดูเป็น "ไอคอนลอย" ไม่เป็น cluster. หลักการจาก Facebook action bar.

4. **Mobile dropdown = floating panel, ไม่ใช่ full-screen ไม่ใช่ bottom-sheet.**
   Position: `top: calc(env(safe-area-inset-top,0px) + 56px)` + `left-2 right-2`. Lock body scroll while open.

5. **Pre-existing type errors ใน repo ยังมีอยู่** (embla-carousel, react-signature-canvas typings, reports/actions slice bug, etc.) — ทั้งหมดไม่เกี่ยวกับ noti. ไม่ต้องแก้ในงาน noti.

---

## 5. Env vars checklist (เหมือน APR23 §3)

ทั้งหมด set แล้วบน Vercel production เมื่อบ่าย 22 เม.ย. ไม่ต้องทำซ้ำ:
```
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL
```

Test accounts (ย้ำ):
- Admin: `tumyen@gmail.com / 0000` (ปอนด์/สุริยะ/ม๊อด)
- L1: `l1test@ebci.test / 0000` (หวาน)
- Manager (มด): `c.arthit@ebcitrade.com / 0839964333`
- Manager (จิม): `thanawatana@ebcitrade.com / 0863699792`
- Sunny (คุณพ่อ): `sayan@ebcitrade.com / 0818331367`

---

## 6. Recommended first message (เลือกหนึ่งทาง)

**แนะนำ Option A** (test ก่อนเพราะ noti ยังไม่ผ่าน end-to-end):

> "อ่าน `docs/SESSION_HANDOFF_APR24.md` แล้วทำ §2.1 — test Leave Phase 2
> end-to-end. ช่วยเตรียม SQL query ดูสถานะ 4 LV ก่อน แล้วบอกผมให้ login
> ตามลำดับ + ยืนยันผลแต่ละ step."

**Option B** (ถ้าอยากลุย build):

> "อ่าน `docs/SESSION_HANDOFF_APR24.md` แล้วเริ่ม Leave Phase 3 ตาม §2.2
> — Tab 1 (ภาพรวม) ก่อน. เมื่อครบ tab 1 แล้วค่อย commit + confirm UX
> ก่อนลุย tab 2."

**Option C** (ต่อเนื่องจาก noti):

> "อ่าน `docs/SESSION_HANDOFF_APR24.md` แล้ว wire Careers เข้า Notification
> Center ตาม §2.3 — submit + status change"

---

## 7. Git + deploy state

- Repo: `caserebel-maker/EBCI-Nexus` (branch `main`)
- Last commit: `16f33ce` (mobile floating panel)
- Vercel deploy: auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- Worktree นี้: `.claude/worktrees/beautiful-pasteur-b30921` (branch `claude/beautiful-pasteur-b30921`)
- Push pattern: `git push origin HEAD:main`

**ก่อนเริ่มที่บ้าน:** `git fetch origin && git pull origin main --ff-only` เพื่อ sync

---

*Generated laptop-night 23 เม.ย. 2026 · 10 commits shipped · Leave Phase 2 test + Phase 3 next.
ถ้า home session ทำงานเต็มวัน เขียน `SESSION_HANDOFF_APR25.md` ต่อ ไม่ต้องแก้ไฟล์นี้.*

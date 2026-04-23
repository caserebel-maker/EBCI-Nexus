# Session Handoff — 25 เม.ย. 2026 (Office → Home)

> **เปิดไฟล์นี้ก่อนเริ่มงานที่บ้าน**
> ต่อจาก `docs/SESSION_HANDOFF_APR25.md` (เขียนเช้า) + session ช่วงบ่าย-เย็นที่ office
> ship อีก 9 commits. ไฟล์นี้คือ delta ของ afternoon/evening block.

---

## 0. TL;DR ใน 60 วินาที

**Office session ปิด 9 commits · 5 feature tracks ต่อเนื่อง**

1. **Sidebar consolidation** — 13 flat items → 7 domain groups (expandable, localStorage-persisted)
2. **Inbox fix + badge system** — จิม's inbox empty bug · amber pending-count pill บน "อนุมัติการลา"
3. **Notification backfill** — 4 legacy pending leaves ได้ noti row
4. **Role-correct approver inbox** — `/hradmin/leave/inbox` ใหม่ (admin shell) · hr_admin sidebar/bottom-nav/deep-link ชี้ไปที่นี่แทน `/portal/*`
5. **Email sender identities** — careers/hr/system แยกกัน · คงไม่ให้ leave email ส่งจาก `careers@ebcinext.com`

**พรุ่งนี้ควรทำอะไรต่อ (เรียงตามความสำคัญ):**
- ⭐ **§2.1 Vercel env vars** — ต้อง set 3 ตัวใหม่ก่อน test email ด้วย identity ใหม่
- **§2.2 Leave Phase 2 end-to-end test** — 4 LVs ยัง pending ใน DB ตั้งแต่ APR23 · ยังไม่เคย verify email + balance transition ครบ
- **§2.3 Leave Phase 3 Tabs 2/3/4** — sidebar links พร้อมแล้ว (`?tab=requests|balances|calendar`) · page ยังไม่ implement tabs เหล่านี้
- **§2.4 Careers wiring เข้า Notification Center** (20–30 นาที · งานเล็ก)

---

## 1. Commits ของ afternoon/office session

| # | Commit | Track | สรุป |
|---|---|---|---|
| 23 | `76a0177` | **Action URL** | migration role-aware action_url (SQL CASE on auth.users role) |
| 22 | `079e349` | **Action URL** | submit route ใช้ `resolveApproverInboxUrl()` |
| 21 | `0c69700` | **Action URL** | helper `src/lib/leave-inbox-url.ts` |
| 20 | `dcccec1` | **Email** | EMAIL_SENDERS map + 3 identities (careers/hr/system) |
| 19 | `dba4ffa` | **Nav** | hr_admin sidebar/bottom-nav → `/hradmin/leave/inbox` |
| 18 | `3398122` | **Admin shell** | new `/hradmin/leave/inbox` route (reuses InboxView) |
| 17 | `4130a68` | **Seed** | backfill 4 pending leave noti rows |
| 16 | `b885445` | **Badges** | sidebar pending-count pill + `/api/leave/pending-count` |
| 15 | `6f69dbd` | **Bug fix** | inbox query + session resolver hardening |
| 14 | `a130674` | **Nav** | consolidate 13 → 7 sidebar groups |

(15–23 ต่อจาก `6804ff9` ของ morning session)

---

## 2. สิ่งที่ยังเปิดอยู่ — ลำดับทำต่อ

### 2.1 ⭐ Vercel env vars — ต้องทำก่อนทุกอย่าง

**เพิ่ม 3 ตัวใหม่บน Vercel (Production + Preview):**
```bash
EMAIL_FROM_CAREERS = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR      = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM  = "EBCI System <no-reply@ebcinext.com>"
```

**DNS check** — ถ้า `ebcinext.com` verified บน Resend (SPF/DKIM/MX ครบ) ทุก address บน domain จะส่งผ่าน. ถ้าไม่ → ส่ง bounces เข้า Resend dashboard → ต้อง verify เพิ่ม.

**Fallback behavior:** ถ้าไม่ set ตัวใดตัวหนึ่ง → fallback ไป `EMAIL_FROM` เดิม (ยังส่งได้ แค่ไม่แยก identity)

**Reply-To:** `EMAIL_REPLY_TO=hr@ebcitrade.com` คงเดิม ไม่ต้องแตะ.

### 2.2 Leave Phase 2 end-to-end test (แนะนำทำ)

4 LVs ยัง pending ใน DB ตั้งแต่ 23 เม.ย. (ก่อนลง fixes วันนี้) · ยังไม่ verify ว่า email + in-app noti + balance transition ครบถ้วน.

**Test matrix** (พร้อม URL ใหม่แล้ว):

| Step | Login | Path | Action | ตรวจ |
|---|---|---|---|---|
| 1 | จิม `thanawatana@ebcitrade.com / 0863699792` | `/hradmin/leave/inbox` | approve `LV-2026-0001` (ปอนด์ ลากิจ 25/4) | email "อนุมัติ" → ปอนด์ (from `hr@ebcinext.com`) + bell noti + balance pending→used |
| 2 | Sunny `sayan@ebcitrade.com / 0818331367` | `/hradmin/leave/inbox` (Sunny role = ?) | reject `LV-2026-0002` (จอย ลาพักร้อน) | ถ้า Sunny เป็น manager (ไม่ใช่ hr_admin) → URL `/portal/leave/inbox` แทน · email "ปฏิเสธ" → จอย · balance คืน |
| 3 | มด `c.arthit@ebcitrade.com / 0839964333` | `/hradmin/leave/inbox` (มด = hr_admin) | approve `LV-2026-0003` (หวาน ลาป่วย) | email + balance pending→used |
| 4 | ปอนด์ logged in | topbar bell + sidebar | — | badge = 1 ใหม่ (อนุมัติจาก step 1) · sidebar "อนุมัติการลา" ไม่มี pending pill (ปอนด์ไม่ใช่ approver ของใคร) |

Time: 30–45 นาที · ต้อง switch login หลายบัญชี (incognito + 3-4 หน้าต่าง)

### 2.3 Leave Phase 3 — Tabs 2/3/4

Sidebar "การลา" group ใน `src/config/navigation.tsx` มี child links พร้อมแล้ว:
- `/hradmin/leave?tab=requests` → **ใบลาทั้งหมด** (ยังไม่ implement)
- `/hradmin/leave?tab=balances` → **วันลาพนักงาน** (ยังไม่ implement)
- `/hradmin/leave?tab=calendar` → **ปฏิทิน** (ยังไม่ implement)

ตอนนี้ page `/hradmin/leave/overview-view.tsx` hardcode `activeTab: TabKey = 'overview'` · ?tab= param ยัง ignore. ต้อง:
1. อ่าน `useSearchParams()` → resolve activeTab
2. Render tab panel ตาม activeTab (แทนที่จะ render overview ตลอด)
3. Build แต่ละ tab:
   - **Tab 2 ใบลาทั้งหมด** (~1.5 ชม) — table + filters + force action + CSV export
   - **Tab 3 วันลาพนักงาน** (~1 ชม) — balance grid + adjust modal + yearly reset
   - **Tab 4 ปฏิทิน** (~1.5 ชม) — month view + density coloring + day popover

### 2.4 Notification Center Phase 2 — Wire Careers

งานเล็กปิดได้ใน session เดียว (~20–30 นาที). Careers email templates 8 ตัวครบแล้วแต่ไม่ emit in-app noti. ต้องแก้ 2 call sites:
- `src/app/api/careers/apply/[id]/submit/route.ts` → HR ได้ `application_received` noti
- `src/app/api/hradmin/applicants/[id]/status/route.ts` → applicant ได้ `application_status_changed` noti

ใช้ pattern เดียวกับ leave submit (ใน `src/app/api/leave/submit/route.ts` ~line 257) — `createNotification()` ห่อด้วย try/catch · best-effort side-effect.

### 2.5 Deferred / nice-to-have

- Leave approver email button (`src/lib/email-leave.ts:238`) ยัง hardcode `/portal/leave/inbox` ใน link — ถ้า approver = hr_admin click ผิด shell. Fix ได้โดย resolve URL ก่อนเรียก email builder. (ไม่ block อะไร)
- `src/config/navigation.tsx:96, 105` — manager/employee variant "อนุมัติการลา" ยังไปที่ `/portal/leave/inbox` · ตั้งใจ (correct for plain managers)
- `checked_in_at` slice bug ใน `src/app/hradmin/reports/actions.ts:69` (pre-existing)
- Careers Iter 2: zip download + review notes autosave
- Pre-existing TS errors (embla-carousel, react-signature-canvas) — ไม่เกี่ยวกับงานใหม่

---

## 3. วิธีใช้ handoff ที่บ้าน (3 ขั้นตอน)

**ขั้น 1:** pull main (worktree ที่บ้านอาจยัง behind)
```bash
cd /path/to/EBCI-Nexus-App
git fetch origin
git pull origin main --ff-only
```

**ขั้น 2:** เปิด Claude Code แล้ว paste ข้อความเริ่ม (เลือก 1 ใน 4 ด้านล่าง ตามที่อยากทำ)

**ขั้น 3:** Claude จะอ่าน doc แล้วทำตามที่เลือก

### 🎯 Recommended first messages (เลือก 1 อัน)

**Option A — เริ่ม Vercel env vars ก่อน (แนะนำที่สุด — 5 นาที):**
> "อ่าน `docs/SESSION_HANDOFF_APR25_HOME.md` แล้วเตรียม checklist + คำสั่ง `vercel env add` สำหรับ §2.1 ให้ผม copy ไปรัน. อย่าเพิ่ง push อะไร — ผมจะรันเอง."

**Option B — test Leave Phase 2 end-to-end (30–45 นาที):**
> "อ่าน `docs/SESSION_HANDOFF_APR25_HOME.md` แล้วทำ §2.2 — test Leave Phase 2 end-to-end. ช่วยเตรียม SQL query ดูสถานะ 4 LV ก่อน แล้วบอกผมให้ login ตามลำดับ + ยืนยันผลแต่ละ step. ระหว่าง test ถ้าเจอ bug ให้ fix ทันที."

**Option C — ลุย Leave Phase 3 Tab 2 (1.5 ชม):**
> "อ่าน `docs/SESSION_HANDOFF_APR25_HOME.md` แล้วเริ่ม Leave Phase 3 Tab 2 ตาม §2.3 — ใบลาทั้งหมด · table + filters (status/type/department/date) + force approve/reject override + CSV export. Read overview-view.tsx ก่อนให้เข้าใจ tab routing pattern."

**Option D — งานเล็กปิด Careers noti (20–30 นาที):**
> "อ่าน `docs/SESSION_HANDOFF_APR25_HOME.md` แล้วทำ §2.4 — wire Careers เข้า Notification Center. 2 call sites: careers submit + status change. ใช้ pattern เดียวกับ `src/app/api/leave/submit/route.ts` line 257 · best-effort try/catch."

---

## 4. Key quirks learned afternoon session

1. **`resolveApproverInboxUrl()` ต้อง fail-safe.**
   Lookup role จาก `auth.users.user_metadata.role` (+ `app_metadata` fallback). ทุก failure → return `/portal/leave/inbox` (universal). อย่า throw — จะทำให้ submit ล้ม.

2. **Sidebar badge polling ใช้ pattern เดียวกับ bell.**
   `usePendingApprovalCount()` poll 60s · pause on `document.hidden` · optimistic fail (keep last count). Badge bubble-up จาก child "อนุมัติการลา" ไป parent "การลา" เมื่อ group collapsed.

3. **session.employeeId อาจ stale.**
   Commit `6f69dbd` hardening: `resolveSessionEmployeeId()` verify ว่า employee row ที่ได้มี `user_id === session.id` ก่อน trust. ถ้าไม่ตรง → fall through ไป lookup ใหม่ + log warning.

4. **Legacy approver_id pathway.**
   มี leave_requests บาง row ที่ approver_id เก็บ auth UUID แทน employees.id (legacy). Inbox API + pending-count API มี secondary fallback: query ด้วย session.id ถ้า primary ด้วย employees.id คืน 0 rows.

5. **Email wrapper function per domain.**
   แทนที่จะ pass `sender: 'hr'` ทุก call site · สร้าง `sendLeaveEmail()` / `sendCareersEmail()` wrapper ในแต่ละไฟล์ → callers ไม่ต้องรู้ key · refactor อนาคตง่าย.

6. **Sidebar nested render pre-hydration fallback.**
   `hydrated` state mirror active group expansion · ก่อน hydrate → mirror `isGroupActive()` result · ไม่ flash groups collapsed ตอน SSR paint.

---

## 5. Env vars + test accounts (คงเดิม)

```
# Existing (already set on Vercel):
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL

# NEW — ต้อง set ที่บ้าน (§2.1):
EMAIL_FROM_CAREERS = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR      = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM  = "EBCI System <no-reply@ebcinext.com>"
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
- **Last commit:** `76a0177` (role-aware backfill migration)
- Vercel deploy: auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- Worktree office: `.claude/worktrees/priceless-heisenberg-55cb19`
- Push pattern: `git push origin HEAD:main`

**ก่อนเริ่มที่บ้าน:** `git fetch origin && git pull origin main --ff-only`

---

## 7. Build + route state

- **Routes:** 36 ทั้งหมด (+2 จาก morning: `/hradmin/leave/inbox`, `/api/leave/pending-count`)
- Build ผ่าน Next 16.2.2 (Turbopack) · compile ~4s
- ไม่มี TS/lint error ใหม่ · pre-existing warnings คงเดิม

---

## 8. DB state สำคัญ

- **4 leave_requests** ยัง pending (LV-2026-0001..0004) — รอ test §2.2
- **4 notifications** `type=leave_request_pending` — action_url ถูกต้องแล้ว (`/hradmin/leave/inbox` ทั้งหมดเพราะทุก approver เป็น hr_admin)
- **0 บน Vercel:** 3 env vars ใหม่ (EMAIL_FROM_CAREERS/HR/SYSTEM) — ต้อง set

---

*Generated afternoon/evening 25 เม.ย. 2026 (Office Mac) · 9 commits shipped ·
Session ปิดที่ action_url fix. ถึงบ้านเปิดไฟล์นี้ → pull main → เลือก Option A/B/C/D ด้านบน.*

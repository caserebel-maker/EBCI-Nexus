# Session Handoff — 22 Apr 2026 (EBCI Nexus)

> **เปิดไฟล์นี้ก่อนเริ่มงานใหม่ที่ออฟฟิศ**
> ต่อจาก `docs/SESSION_HANDOFF_APR21.md` — ไฟล์นั้นเป็นภาพรวมใหญ่,
> ไฟล์นี้เป็น delta ของ session ตอนดึก 21 เม.ย. + next step ที่ชัดเจน
> สำหรับ Claude session ใหม่.

---

## 0. TL;DR ใน 30 วินาที

เมื่อคืนปิด 4 commits เล็ก ๆ (avatar fix + mobile more menu): `d52e1ad → ed0354a`
ทั้งหมดอยู่บน `origin/main` แล้ว Vercel deploy auto.
**Careers Session B ยังไม่ได้เริ่มเลย** — เป็น task หลักของวันนี้.

---

## 1. สิ่งที่ปิดไปเมื่อคืน (since SESSION_HANDOFF_APR21.md)

| Commit   | Summary                                                        |
| -------- | -------------------------------------------------------------- |
| `ed0354a` | **fix(mobile)**: strip HR admin items from portal-mode more menu |
| `710b6e2` | **fix(mobile)**: hide system/quota from portal-mode more menu  |
| `4ed7cf5` | **feat(mobile)**: add HR admin menu items to more menu         |
| `d52e1ad` | **fix(sidebar)**: show `photo_url` from employees in avatar    |

### 1.1 Sidebar avatar fix (`d52e1ad`)

**Bug:** พนักงานบางคน (เช่น Sunny/คุณพ่อ) มี `employees.photo_url` แต่ sidebar
avatar โชว์แค่ตัวอักษรแรก (fallback).

**Root cause:** `src/lib/employee-profile.ts` lookup ด้วย `employees.id = session.employeeId`
อย่างเดียว, ถ้า `employeeId` ไม่ได้ถูก seed ใน `user_metadata` จะ fallback ไป
email lookup — แต่ layout ส่ง `session.name` (ไม่ใช่ email) → lookup ล้มเหลวทั้งคู่
→ `photoUrl = null`.

**Fix:** เพิ่ม middle-fallback `employees.user_id = session.id` (pattern เดียวกับ
`src/lib/creators.ts`). Layout ทั้ง 2 (`portal/layout.tsx` + `hradmin/layout.tsx`)
ส่ง `session.id` เป็น arg ที่ 5 ของ `getEmployeeProfile()`. Email lookup ยังอยู่
เป็น safety net ตัวสุดท้าย.

Files touched:
- `src/lib/employee-profile.ts` — เพิ่ม `authUserId` param + 3-step lookup
- `src/app/portal/layout.tsx`, `src/app/hradmin/layout.tsx` — pass `session.id`

### 1.2 Mobile "เพิ่มเติม" — HR admin section (`4ed7cf5 → ed0354a`)

เพิ่มปุ่ม HR admin 4 ตัวใน slide-up panel ของ mobile bottom nav
(`src/components/layout/portal-bottom-nav.tsx`) — **เฉพาะตอนอยู่ใน /hradmin
(admin mode)**. Portal mode ของ hr_admin (ตอนกด "ดูในฐานะพนักงาน") จะ
เหมือน employee เป๊ะ ไม่มี HR items หลุด.

**สถานะสุดท้ายของ "เพิ่มเติม" ตาม role/mode:**

| Role / Mode                          | เห็นอะไรบ้าง                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Employee                             | ยื่นใบลา · ผังองค์กร · ปฏิทิน · ออกจากระบบ                                                           |
| Manager                              | อนุมัติการลา · ยื่นใบลา · ผังองค์กร · ปฏิทิน · ออกจากระบบ                                            |
| HR Admin ใน `/hradmin` (admin mode)  | อนุมัติ · ผังองค์กร · จัดการระบบ · รายงาน · **HR Admin:** ประกาศ / รับสมัคร / การเข้างาน / นำเข้าบัตร / **ระบบและทรัพยากร** · ดูในฐานะพนักงาน · ออกจากระบบ |
| HR Admin ใน `/portal` (portal mode)  | ยื่นใบลา · ผังองค์กร · ปฏิทิน · กลับเป็น HR Admin · ออกจากระบบ *(ไม่มี HR items เด็ดขาด)*            |

Logic: 2 constants `HR_ADMIN_QUICK_ACTIONS` + `HR_ADMIN_SYSTEM_ACTIONS`
inject เข้าแค่ `MORE_CONFIG.hr_admin` เท่านั้น (ไม่ spread เข้า
`HR_ADMIN_PORTAL_MORE`). ทุก row `min-h-[56px]` สำหรับ senior-friendly touch,
panel `max-h-[70vh] overflow-y-auto` กันล้นจอ.

หมายเหตุ: codebase ยังไม่มี role `superadmin` ใน `src/config/roles.ts`
ถ้าต้องเพิ่มใน future ค่อยทำแยก.

---

## 2. Careers Session B — **งานหลักของวันนี้** (ยังไม่ได้เริ่ม)

อ้างอิง `SESSION_HANDOFF_APR21.md` ข้อ 4.1. backend พร้อมทั้งหมดแล้ว,
เหลือแต่ frontend + admin detail page.

### 2.1 Scope (ย่อ)

**2.1a — `/careers/apply` multi-step form rewrite**
- แทนที่ placeholder ที่ `src/app/careers/apply/page.tsx` (ตอนนี้เป็น stub "กำลังพัฒนา")
- 5 ขั้นตอน:
  1. Position + personal info (ต้องมีรูปถ่าย)
  2. Addresses + ID + family history
  3. Education + work experience + document uploads
  4. Skills + health + languages + vehicles
  5. References + PDPA + signature + submit
- Wire ไปที่ 5 API ที่มีอยู่แล้ว:
  - `POST /api/careers/apply/start` (first keystroke → returns `{id, reference_code}`)
  - `PATCH /api/careers/apply/[id]/autosave` (debounce 3s, body `{reference_code, fields}`)
  - `POST /api/careers/apply/[id]/upload` (multipart, `kind` ∈ photo/cv/transcript/id_card_copy/house_registration/other)
  - `POST /api/careers/apply/[id]/submit`
  - `POST /api/careers/apply/resume` (resume flow ถ้า URL มี `?ref=APP-...`)
- Libraries ติดตั้งแล้ว: `react-hook-form@7.71.1`, `react-easy-crop@5.5.7`, `react-signature-canvas@1.1.0-alpha.2`
- Progress bar บนสุดโชว์ Step 1..5 + `last_saved_at` timestamp
- Reference code โชว์ใน header บาร์ตลอดเวลา

**2.1b — `/hradmin/applicants/[id]` detail page**
ปัจจุบันเป็น stub. ต้องการ:
- 5-section layout (mirror form)
- File download ด้วย signed URL refresh (`supabaseAdmin.storage`)
- Status dropdown (draft / submitted / reviewing / shortlisted / interviewed / offered / rejected / withdrawn) → server action update
- Review notes textarea → save ไป `review_notes`
- 12-factor interview evaluation (1-5 scale) → save ไป `interview_evaluation` jsonb

**2.1c — Env vars ที่ต้อง set ก่อน go-live**
- `NEXT_PUBLIC_APP_URL` (fallback `https://nexus.ebcitrade.com`)
- `HR_NOTIFY_EMAIL` (fallback `hr@ebcitrade.com`)

### 2.2 Exact first message ที่แนะนำให้พิมพ์ตอนเริ่ม

> "อ่าน `docs/SESSION_HANDOFF_APR22.md` แล้วเริ่ม Careers Session B ตาม §2.1a —
> ลุยเฉพาะ **Step 1** ก่อน (position + personal info + photo) ให้ครบ flow:
> start → autosave → photo upload via `ImageCropModal` (ที่มีอยู่แล้วใน
> `src/components/ImageCropModal.tsx`) พร้อมแถบ reference code ด้านบน + progress
> bar. ห้ามเริ่ม Step 2-5 จนกว่าจะ confirm ว่า Step 1 ใช้ได้จริง."

ทำงานแบบ bite-sized — Step 1 ก่อน, test, แล้วค่อย Step 2.

### 2.3 ข้อมูล bootstrap ที่ Claude ควรรู้ทันที

- **job_applications columns** ที่ Step 1 ใช้: `photo_url`, `position_applied`,
  `first_name_th`, `last_name_th`, `first_name_en`, `last_name_en`, `nickname`,
  `email`, `phone_mobile`, `date_of_birth`, `age`, `nationality`, `religion`,
  `gender`, `marital_status`, `blood_type`, `id_card_number`, `weight_kg`,
  `height_cm`, `current_step`, `completed_steps`, `reference_code`,
  `application_status`
- **ImageCropModal API**: `<ImageCropModal imageSrc open onClose onCropComplete aspectRatio? />`
  + helper `getCroppedImg(src, pixelCrop, rotation?, maxSize?) → Promise<Blob|null>`
  output JPEG 500×500 max, quality 0.9
- **Upload kind สำหรับ photo**: POST `/api/careers/apply/[id]/upload` with
  `FormData{ file, reference_code, kind: 'photo' }` → update `photo_url` column
  (signed URL 7 วัน)
- **Ownership model**: verifyOwnership(id, reference_code) — public, ไม่ต้อง session
- **Resume flow**: URL `?ref=APP-2026-0001` → modal small email-prompt → POST
  `/api/careers/apply/resume` → redirect กลับมา apply page พร้อม id

---

## 3. Quick env + deploy refresher

- Repo: `caserebel-maker/EBCI-Nexus` (branch `main`)
- Worktree นี้: `.claude/worktrees/beautiful-pasteur-b30921` (branch `claude/beautiful-pasteur-b30921`)
- Push workflow: `git push origin HEAD:main` — deploy ขึ้น `https://nexus.ebcitrade.com` อัตโนมัติ
- DB: Supabase `cluirxjykhchthcpgosz` Free tier
- Test accounts (ย้ำจาก APR21 §1):
  - Admin: `tumyen@gmail.com / 0000` (ปอนด์)
  - L1: `l1test@ebci.test / 0000` (หวาน)
  - L2: `l2test@ebci.test / 0000`
  - Manager (มด): `c.arthit@ebcitrade.com / 0839964333`
- **CLI ที่ควรลง:** `npm i -g vercel` → unlock `vercel env pull`, `vercel logs`

---

## 4. ก่อนเริ่มงาน ตรวจว่า deploy ผ่าน

1. `git log --oneline -5` → ต้องเห็น `ed0354a` บนสุด
2. เปิด https://nexus.ebcitrade.com บน iPhone → test:
   - Sidebar/identity header: avatar ต้องโชว์รูปจริง (login `tumyen@gmail.com`)
   - Mobile "เพิ่มเติม" (bottom nav): ไม่มี HR items ใน portal mode
   - Switch ไป admin mode: เห็น HR Admin section 5 items

ถ้าพังข้อไหนให้ rollback ด้วย `git revert <sha>` ก่อนลุย Careers.

---

## 5. ถ้ามี task อื่นโผล่ก่อน Careers Session B

Deferred cleanups จาก APR21 §4.3 (ยังค้างอยู่ ไม่เร่ง):
- `/hradmin/recruitment` legacy page (decide: retire / merge / leave)
- `checked_in_at` slice(0,10) bug ใน `src/app/hradmin/reports/actions.ts:69`
- Vercel usage metrics ใน quota dashboard (needs Vercel API)
- Daily greeting projections ใน quota dashboard

---

*สร้าง 21 เม.ย. 2026 ตอนดึก (ก่อนนอน) · resume ที่ office วันที่ 22 เม.ย.
ถ้าวัน 22 ทำงานเต็มวัน เขียน `SESSION_HANDOFF_APR23.md` ต่อ ไม่ต้องแก้ไฟล์นี้.*

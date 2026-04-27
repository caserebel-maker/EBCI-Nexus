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

**Office afternoon session (Apr 24) ปิด §3.6 ทุกข้อ + critical bug + TS sweep ครบ:**

1. 🔥 **Critical fix** — `email-leave.ts` / `leave-email.ts` / `careers-emails.ts` ทุก leave + careers email crash ด้วย infinite recursion ตั้งแต่ commit `dcccec1` (Apr 23) — fix แล้ว
2. **§3.6.3** Review notes autosave บน /hradmin/applicants/[id] — debounced 1.5s, "saved Xs ago" indicator
3. **§3.6.2** Zip download เอกสาร applicant ทั้งหมด (jszip) — README.txt บอกว่าอะไรหายไป
4. **§3.6.1** Bulk adjust balance modal สำหรับ year-end rollover (preview + apply 2 step)
5. **§3.6.4** TS errors sweep — **22 → 0** · `tsc --noEmit` exit 0 · build clean 98 routes

**§3.6 carryover ปิดครบหมดแล้ว** — เหลือแต่ §3.2 (Vercel env vars dashboard step) + §3.3 (mobile polish iPhone test) ที่ทำแทนผู้ใช้ไม่ได้

---

## 1. Commits ของ session นี้ (เรียงจากใหม่ → เก่า)

| # | Commit | Track | สรุป |
|---|---|---|---|
| 5 | `6c4c20a` | **TS sweep** | pre-existing TS errors 22 → 0 (recharts × 5 + null narrows + Supabase cast + next.config) |
| 4 | `e75d154` | **§3.6.1** | bulk adjust balance modal + API + preview/apply flow |
| 3 | `d1e0f70` | **§3.6.2** | zip download applicant docs (jszip) + README.txt manifest |
| 2 | `65142be` | **§3.6.3** | review notes autosave + audit metadata cols + migration |
| 1 | `ded6fdd` | 🔥 **Bug fix** | infinite recursion in 3 email wrappers (sendLeaveEmail / sendCareersEmail) |

(5 ต่อจาก `e85a1a7` = APR25 night handoff)

---

## 2. สิ่งที่เพิ่งส่งมอบ — ใช้งานได้จริงแล้ว

### Module: Careers (`/hradmin/applicants/[id]`)
- **Review notes** — textarea ด้านล่างของ detail page · autosave 1.5s · "saved Xs ago" indicator · audit metadata (`review_notes_updated_by` + `_at`)
- **Download ZIP** — ปุ่มข้าง "พิมพ์" ที่หัวหน้า · ดึง 6 single-fields + other_documents → ZIP เดียว · README.txt บอกว่าอะไรหายไป
- Email บั๊กที่กิน leave + careers ทั้งระบบ → ปลดบล็อกแล้ว

### Module: Leave (Tab 3 = `/hradmin/leave?tab=balances`)
- **Bulk adjust** — ปุ่ม amber "ปรับยอดหลายคน" ที่ action bar · 4-step form (ประเภท → action → scope → reason) · preview ก่อน apply · audit line ทุกแถว

### Carryover from APR25 night
- Tab 1-4 leave management ครบ · Calendar with holidays · Notification Center · Drawer + portal · Auth sweep · ทั้งหมด live

---

## 3. สิ่งที่ยังเปิดอยู่ — เรียงตาม priority

### 3.1 ✅ ~~Leave Phase 2 e2e test~~ — DONE Apr 25

### 3.2 ⭐ Vercel env vars — **5 นาที, dashboard step**

ยังต้อง set:
```bash
EMAIL_FROM_CAREERS = "EBCI Careers <careers@ebcinext.com>"
EMAIL_FROM_HR      = "EBCI HR <hr@ebcinext.com>"
EMAIL_FROM_SYSTEM  = "EBCI System <no-reply@ebcinext.com>"
```

ผู้ใช้ login Vercel dashboard เอง · CLI alternative ใช้ `npx vercel env add EMAIL_FROM_HR production`

**🚨 ตอนนี้สำคัญกว่าเดิม** — เพิ่งแก้บั๊ก infinite recursion ที่ blocking email **ทุกตัว** ของ leave + careers ตั้งแต่ Apr 23. หลัง deploy ใหม่ email จะส่งได้จริงแล้ว — ตอนนี้ค่อยเป็น "send identity แยก" priority.

### 3.3 Tab 4 calendar mobile UX (opportunistic)

- iPhone จริงทดสอบ cell-min-height + dot avatar
- ถ้าเล็กเกินกด → flip vertical day list บน mobile

### 3.4 ✅ ~~Lunar Buddhist holidays~~ — DONE Apr 25 (tentative · verify ราชกิจจานุเบกษา 2569)

### 3.5 Granular permission narrowing — deferred จนมี business case

### 3.6 ✅ **ปิดหมดแล้ว** — review notes / zip download / bulk adjust / TS sweep

---

## 4. Env vars + test accounts (คงเดิม)

```
# Existing บน Vercel:
NEXT_PUBLIC_SUPABASE_URL · NEXT_PUBLIC_SUPABASE_ANON_KEY · SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY · EMAIL_FROM · EMAIL_REPLY_TO · HR_NOTIFY_EMAIL · NEXT_PUBLIC_APP_URL

# ยังไม่ set (§3.2):
EMAIL_FROM_CAREERS · EMAIL_FROM_HR · EMAIL_FROM_SYSTEM
```

**Test accounts:**
- Admin: `tumyen@gmail.com / 0000` (ปอนด์/สุริยะ/ม๊อด) — Super Admin
- L1: `l1test@ebci.test / 0000` (หวาน) — employee
- Manager (มด): `c.arthit@ebcitrade.com / 0839964333` — HR Manager preset
- Manager (จิม): `thanawatana@ebcitrade.com / 0863699792` — Executive Viewer
- Sunny (พ่อ): `sayan@ebcitrade.com / 0818331367` — manager

---

## 5. Git + deploy state

- **Repo:** `caserebel-maker/EBCI-Nexus` (branch `main`)
- **Last commit:** `6c4c20a` (TS sweep — clean tsc, 98 routes)
- **Vercel deploy:** auto — `https://nexus.ebcitrade.com` + `https://ebci-nexus.vercel.app`
- **🚨 Re-deploy ก่อน test email** — Apr 24 deploy มี recursion bug; ต้อง redeploy หลัง `ded6fdd`
- Push pattern: `git push origin HEAD:main`

---

## 6. DB state ปัจจุบัน

- **Employees:** 55 active · 4 มี manager_id · 3 mock approvers
- **Users:** 3 rows (admin / mock_jim / mock_mod)
- **leave_requests:** 5 rows · 0 pending · 3 rejected · 2 approved
- **leave_balances:** seeded ปอนด์/จิม/มด/หวาน/จอย ปี 2026
- **notifications:** ทำงานครบ — leave + careers types
- **holidays:** 19 rows สำหรับ 2026 (15 fixed + 4 lunar tentative)
- **job_applications:** schema เพิ่ม `review_notes_updated_at` + `_by` (migration apply แล้ว)

---

## 7. Build + types state

- **Build:** ✓ Compiled · 98 routes (+3 จาก APR25)
  - +/api/hradmin/applicants/[id]/review-notes
  - +/api/hradmin/applicants/[id]/download-zip
  - +/api/hradmin/leave/balances/bulk
- **TypeScript:** `tsc --noEmit` exit **0** (ก่อน session = 22 errors)
- **Dependencies:** เพิ่ม `jszip ^3.10.1` ใน package.json

---

## 8. Quirks ของ session นี้

1. **🔥 Email wrapper recursion** — `sendLeaveEmail` / `sendCareersEmail` ทั้ง 3 wrappers เรียกตัวเองตั้งแต่ commit `dcccec1` (Apr 23) → ทุก leave + careers email = stack overflow ตั้งแต่นั้น. คงไม่มีใครรู้เพราะ direct callers ของ `sendEmail` (announcement broadcast) ยังทำงานได้. **ถ้าใช้ wrapper pattern อีกในอนาคต — explicit forward, อย่า spread.**

2. **Recharts Formatter widening** — @types/recharts ใหม่ ValueType/NameType เป็น `T | undefined`. handler signature ต้องรับ undefined: `(v) => Number(v ?? 0)` แทน `(v: number) =>`.

3. **Web Response BodyInit edge-case** — Uint8Array<ArrayBufferLike> ไม่ตรง BodyInit ใน Next 16 lib.dom. Wrap ใน Blob แทน → `new Blob([bytes as BlobPart])`.

4. **Bulk adjust UX gating** — preview ต้อง run ก่อน apply (button disabled). config change ใดๆ ลบ preview state อัตโนมัติ → กัน HR apply stale plan โดยไม่ตั้งใจ.

5. **GenericStringError on Supabase rows** — ผ่าน `as unknown as EmpRow` แทน direct cast เมื่อ row type อาจมี error variant.

6. **Review notes audit metadata fallback** — API try ใส่ `_updated_at`/`_updated_by` ก่อน, ถ้า schema ยังไม่มี fall back ไป update แค่ `review_notes`. Migration apply แล้วบน prod แต่ keep fallback ไว้กัน schema drift ใน dev branches.

---

*Generated end of APR24 office afternoon · 5 commits shipped · Last commit `6c4c20a` · §3.6 carryover ปิดครบ · เหลือ §3.2 (Vercel dashboard) + §3.3 (mobile polish) ที่ทำแทนไม่ได้*

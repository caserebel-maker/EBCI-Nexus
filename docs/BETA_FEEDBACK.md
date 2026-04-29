# BETA_FEEDBACK — Leave Module + Check-in Workflow

> **Source**: Beta tester feedback collected 29 เม.ย. 2569
> **Status**: Triaged, awaiting strategic decisions on P2 items
> **Owner**: ม๊อด (สุริยะ)
> **Last updated**: 29 เม.ย. 2569 (late evening)

---

## §0 TL;DR

17 feedback items from beta testers. Triaged into 4 priority buckets:

| Bucket | Count | Status |
|---|---|---|
| 🔥 P0 — Bugs blocking beta expansion | 5 | Ready to code |
| ⚡ P1 — High-value new features | 6 | Ready to spec |
| 🤔 P2 — Strategic decisions needed | 3 | **BLOCKED — needs ม๊อด's call** |
| 📋 P3 — Data/config (no logic change) | 3 | Ready to apply |

**Recommended sequence**: decide P2 first → ship P0 batch → spec P1 individually → apply P3 alongside.

---

## §1 P0 — Bugs / Critical Logic Gaps

These break correct behaviour. Must ship before expanding beta beyond current 4 testers.

### §1.1 Half-day leave support
**Problem**: ลาครึ่งวันเช้า/บ่ายไม่ support — ระบบนับเป็นวันเต็มหมด
**Linked questions**:
- ถ้าลาเช้า ตอนบ่ายต้องเช็คอินยังไง?
- ระบบจะตัดวันลายังไง (0.5 วัน?)
**Scope**:
- Add `half_day` enum to leave_requests: `none | morning | afternoon`
- Compute leave-balance deduction as 0.5 when set
- Check-in validation: morning leave → afternoon check-in still required, vice versa
- Display: "ลา 0.5 วัน (เช้า)" or "ลา 0.5 วัน (บ่าย)"
**Priority**: P0 — affects every approved leave count

### §1.2 Approver chain not enforced
**Problem**: ระบบอนุมัติการลา ยังไม่ผ่านผู้บังคับบัญชา
**Question to verify**: regression from §3.16 work today, or never wired up for new submissions?
**Action**: trace `/portal/leave` submit → check if it routes to `resolveLeaveApprover()` (added today as commit `40f42ac`) or bypasses to HR direct
**Priority**: P0 — governance issue

### §1.3 Leave-day check-in suppression
**Problem**: ถ้าอนุมัติลาแล้ว ไม่ต้องกดเช็คอิน
**Current behaviour**: ระบบยังเตือน/บังคับเช็คอินทั้งที่อนุมัติลาแล้ว
**Scope**:
- Check-in dashboard: hide "เช็คอิน" CTA if today has approved full-day leave
- Half-day leave: hide CTA only for the leaved half (morning leave → still show afternoon CTA)
- Backend: don't count missing check-in as "ขาด" if day has approved leave
**Priority**: P0 — false-negative ขาดงาน reports

### §1.4 Cancel/withdraw submitted leave
**Problem**: ถ้ากดลาไปแล้ว เปลี่ยนใจ ไม่อยากลาจะทำไง ยกเลิกได้มั้ย
**Scope**:
- Pending leave (ยังไม่อนุมัติ) → user can withdraw directly (status: `withdrawn`)
- Approved leave (อนุมัติแล้ว) → user request cancellation, approver must confirm (new flow: `cancellation_requested` → `cancelled` or `cancellation_rejected`)
- Refund leave-balance days when cancelled
- Don't refund if cancellation comes after the leave date (already taken)
**Priority**: P0 — common user need

### §1.5 Half-day workflow integration
**Problem** (consequence of §1.1): ลาเช้าครึ่งวัน เช็คอินบ่ายยังไง / มาสายตอนบ่ายนับยังไง
**Decision needed**:
- ลาเช้า → check-in window starts at 13:00? Or normal 08:30 with allowance?
- ลาบ่าย → check-out by 12:00? Or normal 17:00?
**Priority**: P0 — bundle with §1.1

---

## §2 P1 — High-value New Features

Worth shipping in dedicated sprints. Each one is a self-contained feature.

### §2.1 Comp day (สลับวันหยุด) instead of leave
**Problem**: คนที่มาทำงานวันหยุด ต้องเขียนใบลา = ผิดเชิงตรรกะ ควรเป็น comp day
**Scope**:
- New table `comp_days` (worked_on date, comp_used_on date | null, employee_id)
- HR adds entry when employee works on holiday
- Employee can "use" comp day → auto-converts to time off without lowering leave balance
- Display: "สิทธิ์วันหยุดสะสม X วัน" on dashboard
**Effort**: medium (new model + UI + admin tooling)

### §2.2 Welfare/สวัสดิการ tracker
**Problem**: สวัสดิการต่างๆ มีอะไรบ้าง เบิกไปแล้วเท่าไหร่ เหลือเท่าไหร่ ทั้งของบุตร และของเราเหลือเท่าไหร่
**Open questions** (need ม๊อด input):
- รายการสวัสดิการมีอะไรบ้าง? (medical, ค่ารักษาพยาบาลบุตร, ค่าทำฟัน, ฯลฯ)
- Annual reset วันไหน? (1 ม.ค. หรือตามอายุงาน?)
- Limits per employee (flat) or per family member?
- ใครอนุมัติ — HR direct, or via supervisor first?
**Effort**: large (new domain — schema + claim flow + HR back-office)

### §2.3 Streak meter — 3/6/9/12 เดือน ไม่ขาด/ลา/สาย
**Problem**: ปัจจุบันมีรางวัล 3-6-9-12 เดือน ไม่ลาด/ขาด/สาย แต่ไม่มี dashboard ให้พนักงานเช็คเอง
**Scope**:
- New page `/portal/welfare-streak` (หรือ embed บน dashboard)
- แสดงเดือนต่อเนื่อง + เป้าหมายถัดไป
- Visual: progress bar / circular gauge / ladder
- Reset rules: ขาด 1 ครั้ง = reset, ลา/สาย = ตามนโยบาย (ม๊อด ต้องระบุ)
**Open question**: นับ "สาย" จากอะไร — ทุกครั้ง, หรือเกินกี่นาที?
**Effort**: medium

### §2.4 Draft + autosave ใบลา
**Problem**: บางคนอาจอยากสร้างไว้ก่อน ยังไม่ได้ตัดสินใจ — ทำให้ไม่ต้องเริ่มใหม่แต่ต้น
**Scope**:
- Add `status: 'draft'` to leave_requests
- Form: autosave every 10s (debounced) when user has typed
- Drafts list on `/portal/leave` separate from submitted
- "ดำเนินการต่อ" button to resume + edit
- Auto-cleanup drafts > 30 วัน
**Effort**: small-medium

### §2.5 Remember password (long-lived session)
**Problem**: คนแก่เยอะ บางทีอาจลืม
**Scope**:
- Extend session cookie max-age from 7 days → 30 days when "จำฉันไว้" checked
- Already signed (commit `a70f303` today) → safe to extend
- Login page: add checkbox
**Security note**: still requires hash + signed cookie. ไม่ใช่ plaintext password storage.
**Effort**: small

### §2.6 Policy reading page in app
**Problem**: ควรมี policy การลาต่างๆให้อ่านในระบบด้วย
**Scope**:
- New page `/portal/leave-policy` (read-only)
- Renders from a single MD file in repo (e.g. `content/leave-policy.md`)
- HR can edit via PR or future admin UI
- Link from leave form ("ดูนโยบายการลา →")
**Effort**: small (with MD file approach)

---

## §3 P2 — Strategic Decisions (BLOCKED)

These are not technical questions — they're business/UX choices ม๊อด must make first. **Do not start coding any of these until decided.**

### §3.1 ⚠️ ตัดเช็คอินที่ออฟฟิศออก?

**Proposal**: เหลือแค่เช็คอินสำหรับ WFH อย่างเดียว — เช็คอินที่บริษัทใช้บัตรไปเหมือนเดิม

**Trade-offs**:
| Option | Pros | Cons |
|---|---|---|
| A. ตัดออก (เหลือ WFH only) | UX สะอาด, ไม่ต้องเช็คอินซ้ำกับบัตร, ลด confusion | ต้อง integrate ข้อมูลบัตร → ระบบ (ปัจจุบันทำมั้ย?) เพื่อให้ HR ดู attendance ได้ที่เดียว |
| B. คงไว้ทั้งคู่ (status quo) | ไม่ต้อง integrate, ระบบมี attendance log ครบเอง | ผู้ใช้เช็คอินซ้ำซ้อน (บัตร + แอป), เปลือง tap |
| C. คงไว้แต่ optional (employee choose) | ความยืดหยุ่น | ข้อมูลไม่ consistent — บางคนเช็ค บางคนไม่เช็ค |

**Decision needed**: A, B, or C?
**Dependency**: ถ้า A → ต้องตอบเพิ่มว่าระบบบัตรปัจจุบัน sync เข้า DB ของ Nexus ได้ไหม / ยังไง

### §3.2 ⚠️ WFH check-in ส่ง Telegram?

**Proposal**: ระบบ WFH ให้เด้งไปที่ Telegram (แทน in-app notification เท่านั้น)

**Trade-offs**:
| Option | Pros | Cons |
|---|---|---|
| A. Telegram only | คนเห็นทันที, ไม่ต้องเปิดแอป | ต้อง setup Telegram bot + invite ทุกคน |
| B. In-app only (status quo) | ไม่มี dependency ภายนอก | คนไม่เปิดแอปก็ไม่เห็น |
| C. ทั้งคู่ (Telegram + in-app) | Backup notification | ซ้ำซ้อน, dev cost x2 |

**Decision needed**: A, B, or C?
**Dependency**: ถ้า A หรือ C → ต้องสร้าง Telegram bot, แจก chat_id, store mapping `employee → telegram_chat_id`

### §3.3 ⚠️ Notify approval ทาง email — เปลี่ยน timing?

**Proposal**: อนุมัติลาก่อน → แล้วค่อยส่ง notify ทางเมล (ลด spam risk)

**Current behaviour** (ต้อง verify): ส่ง email ทันทีตอน submit ใบลา + ตอนอนุมัติ + ตอนปฏิเสธ = 2-3 emails per request
**Proposed behaviour**: ส่ง email เฉพาะ "approved" และ "rejected" — ตอน submit ไม่ส่ง

**Trade-offs**:
| Option | Pros | Cons |
|---|---|---|
| A. Email after decision only | ลด spam, ไม่กระทบ approval flow | Approver ไม่ได้ email reminder ตอน submit — ต้องเปิดแอปเช็คเอง |
| B. Status quo (email ทุก step) | Approver ไม่พลาด | Email เยอะ, เสี่ยง spam folder |
| C. Email approver ตอน submit + email requester ตอน decision | สมดุล | Logic ซับซ้อน |

**Decision needed**: A, B, or C?
**Note**: Resend (production email) มี deliverability ดี แต่ถ้า volume สูง user mark spam → domain reputation drop

---

## §4 P3 — Data/Config Updates

No new logic — just config or data changes.

### §4.1 Leave categories (11 ประเภท)

จากที่ม๊อดลิสต์มา:

| # | ประเภท | จำนวน | เงื่อนไข |
|---|---|---|---|
| 1 | ลากิจ | 3 วัน/ปี | ขั้นต่ำกี่ชั่วโมง? **(ม๊อดต้อง decide)** |
| 2 | ลาพักร้อน | ตามอายุงาน ไม่เกิน 12 วัน | ตาราง year-of-service mapping ต้องระบุ |
| 3 | ลาป่วย | 30 วัน/ปี | ≥3 วัน → ต้องแนบใบรับรองแพทย์ |
| 4 | ลาทำหมัน | 3 วัน | ได้รับค่าจ้าง |
| 5 | ลาคลอด | (ตามกฎหมาย — 98 วัน?) | for female only — ต้องเช็ค `employees.gender` (commit `64e4c4e` วันนี้) |
| 6 | ลารับราชการทหาร | (ตามหมายเรียก) | |
| 7 | ลาเกณฑ์ทหาร | (ตามหมายเรียก) | for male only |
| 8 | ลาพัฒนาความรู้ | (ระบุ) | |
| 9 | ลาอุปสมบท | (ระบุ — for male) | |
| 10 | ลาสมรส | (ระบุ) | |
| 11 | ลาพ่อ/แม่เสียชีวิต | (ระบุ) | |

**Action**:
- ม๊อด ต้อง fill in missing values (จำนวนวัน + เงื่อนไข) ก่อน
- จากนั้น Claude Code seed `leave_categories` table
- Update leave form dropdown
- Wire validation rules (gender filter for ลาคลอด, ลาเกณฑ์ทหาร, ลาอุปสมบท)

### §4.2 Sick leave attachment requirement

**Rule**: ลาป่วย ≥3 วัน → required attachment (ใบรับรองแพทย์), <3 วัน → optional
**Current**: leave attachment exists (commit `558c98b` วันนี้แก้ harden upload) — แต่ไม่บังคับตามจำนวนวัน
**Action**: add validation in `/portal/leave` submit + server-side check

### §4.3 ลากิจ minimum hours

**Question**: ลากิจ ขั้นต่ำกี่ชั่วโมง? — Need ม๊อด decide
**Options**: 1 ชม / 2 ชม / 4 ชม (ครึ่งวัน) / no minimum
**Once decided**: add to leave_categories config + form validation

---

## §5 Recommended Sequence

1. **NOW (on laptop)** — Commit this file. Don't start coding.
2. **NEXT 24h** — ม๊อด decide §3.1, §3.2, §3.3 (P2 strategic)
3. **NEXT 24h** — ม๊อด fill in §4.1 missing values + §4.3 hours
4. **THEN at office** — Update this file with decisions, then prompt Claude Code:
   ```
   อ่าน docs/BETA_FEEDBACK.md → ทำ §1 (P0) ทั้ง 5 ข้อ
   commit แยกตาม subsection (§1.1, §1.2, ... §1.5)
   ```
5. **AFTER P0 ships** — beta retest กับ 4 testers เดิม → ถ้า OK ค่อยขยายวง
6. **THEN** — pick P1 items one at a time (เริ่มจาก §2.5 remember password ที่ effort เล็ก, value สูง)
7. **APPLY P3 alongside P0/P1** — data changes ไม่ต้อง wait

---

## §6 Open Questions Master List

ม๊อด ต้องตอบคำถามเหล่านี้ก่อน Claude Code ทำงานต่อได้:

- [ ] §1.5 ลาเช้า → check-in window start time?
- [ ] §1.5 ลาบ่าย → check-out time?
- [ ] §2.2 รายการสวัสดิการมีอะไรบ้าง?
- [ ] §2.2 Annual reset วันไหน?
- [ ] §2.2 Limits per employee or per family member?
- [ ] §2.3 นับ "สาย" จากกี่นาที?
- [ ] §3.1 เช็คอินออฟฟิศ — keep / drop / optional?
- [ ] §3.1 ถ้า drop → ระบบบัตร sync เข้า DB ได้ยังไง?
- [ ] §3.2 WFH notification — Telegram / in-app / both?
- [ ] §3.3 Email timing — A / B / C?
- [ ] §4.1 จำนวนวัน + เงื่อนไข ของ ลาคลอด, ลารับราชการทหาร, ลาเกณฑ์ทหาร, ลาพัฒนาความรู้, ลาอุปสมบท, ลาสมรส, ลาพ่อ/แม่เสียชีวิต
- [ ] §4.3 ลากิจ ขั้นต่ำกี่ชั่วโมง?

---

## §7 Beta Tester Reference

Original feedback collected from 4 active beta testers (ดูรายชื่อใน `docs/NEXT.md` §11 health check).
Feedback session: 29 เม.ย. 2569
Captured by: ม๊อด (via Claude session on laptop, on the road)

> "หลังจากทดสอบกับกลุ่มเล็กแล้ว มี feedback ดังนี้..."

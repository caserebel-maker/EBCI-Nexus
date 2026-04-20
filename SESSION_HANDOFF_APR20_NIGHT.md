# Session Handoff — EBCI Nexus (Home Night → Office Morning)

**Date:** 2026-04-20 night
**From:** Home Mac mini (`/Volumes/C1TB/EB-CI/EBCI-Nexus`)
**To:** Office Mac (`/Volumes/1TB-NVME/...` หรือ path ของเครื่อง)
**Branch:** `main` (remote is ahead of office by 3 commits)

---

## 🚀 เริ่มต้นที่ออฟฟิศ (5 นาที)

```bash
cd <path-ไปยัง-EBCI-Nexus-บน-office-mac>
git pull origin main       # ดึง 3 commits ใหม่
npm run dev                # เปิด dev server (port 3001)
```

จากนั้นเปิด browser ไปที่: **http://localhost:3001/portal/organization**

---

## ✅ Smoke test checklist

### Tab 1 — โครงสร้าง
- [ ] Default sub-view = มุมมองแผนก (ผัง tree)
- [ ] กด **มุมมองรายบุคคล** → เห็น avatar cards แยก level
- [ ] URL เปลี่ยนเป็น `?sub=people` (แชร์ link ได้)
- [ ] Browser back button คืนค่า

### Tab 2 — อำนาจอนุมัติ ⭐ (Phase 2 ใหม่)
- [ ] URL = `?view=authority`
- [ ] เห็น filter chips: ทั้งหมด / การลา / OT / เบิกเงิน / HR
- [ ] เห็น approver cards 3 ใบ (**จิม / มด / ปุ๊**)
- [ ] กด "การลา" → เห็นทั้ง 3 คน (ทุกคนมี scope `leave`)
- [ ] กด "เบิกเงิน" → เห็นแค่ **จิม + ปุ๊** (มด ไม่มี budget scope)
- [ ] กด "HR" → เห็นแค่ **จิม + มด**
- [ ] Badge สีถูก: leave=เขียว / ot=เหลือง / budget=ฟ้า / hr=ชมพู
- [ ] **Login admin** → เห็นวงเงินเป๊ะ (เช่น "≤ 1,000,000 บาท") + L4 tag
- [ ] Section "พนักงานที่ไม่ได้เป็นผู้อนุมัติ (52 คน)" กดเปิดได้

### Tab 3 — สายอนุมัติของฉัน ⭐ (Phase 2 ใหม่)
- [ ] URL = `?view=my-chain`
- [ ] profile card สีทอง (ตัวคุณเอง) อยู่บน
- [ ] ถ้า login เป็นคนที่มี manager → เห็น chain step พร้อม badge "อนุมัติ N" และ last step = "อนุมัติสุดท้าย"
- [ ] ถ้า login เป็นคนที่ไม่มี manager → empty state "ยังไม่ได้กำหนดผู้บังคับบัญชา"

### Permission masking test (สำคัญ)
- [ ] Login **admin** (ปอนด์) → Tab 2 แสดงวงเงินเป๊ะ + L tag
- [ ] Login **mock_mod** (username=`mod`, password=`0000`) → Tab 2 แสดง tier icon (💎 วงเงินกลาง) แทน ไม่เห็น L tag
  - ⚠ Note: mod preset มี `can_view_approval_limits=true` → ยังเห็นเป๊ะ ถ้าอยาก test tier ต้อง change preset หรือใช้ user ไม่มี permission
- [ ] Login **mock_jim** (username=`jim`, password=`0000`) → เห็นเป๊ะเหมือนกัน (Executive Viewer มีสิทธิ์ดู)

---

## 🗂️ ไฟล์ที่ commit ไปคืนนี้ (3 commits)

1. **717d56c** — tabs shell + structure sub-toggle + stub tabs 2/3
2. **0c6a124** — sync seed-permissions.sql (username ไม่ใช่ email)
3. **777e283** — Phase 2: Tab 2 + Tab 3 real content + mock approvers

### ไฟล์ที่ควรรู้

- `src/app/portal/organization/tabs-shell.tsx` — 3-tab navigation + query params
- `src/app/portal/organization/tab-structure.tsx` — sub-toggle dept/people
- `src/app/portal/organization/tab-authority.tsx` — Tab 2 (ใหม่)
- `src/app/portal/organization/tab-my-chain.tsx` — Tab 3 (ใหม่)
- `src/lib/permissions.ts` — `getCurrentPermissions()`, tier helpers
- `src/lib/permission-presets.ts` — 4 presets
- `prisma/seed-permissions.sql` — seed mock users (applied แล้ว)
- `prisma/seed-approvers.sql` — seed mock approvers (applied แล้ว)

---

## ⚠️ ข้อควรรู้ / แก้เมื่อพร้อม

1. **Mock data ใน DB** — 3 rows ใน User (`admin`, `mock_jim`, `mock_mod`) และ 3 rows ใน employees มี `is_approver=true` เป็นของปลอมให้ test ได้ เปลี่ยนเป็นของจริงเมื่อ HR กำหนดแล้ว
2. **Password plaintext** — admin/jim/mod ใช้ `0000` plaintext ตาม convention เดิม (ของปอนด์) เปลี่ยนเป็น bcrypt ทีหลังถ้าจะ deploy prod
3. **จิม (mock_jim) role=manager** — spec เดิมว่า role=`hr_admin` แต่ spec เพิ่งแก้ให้ 1 คนเท่านั้น ถ้า มด ต้องเข้า `/hradmin/*` ได้ ต้องแก้ route guard ให้เช็ก permission flag แทน role
4. **Linkage User ↔ Employee** — mock_jim, mock_mod ไม่มี link กับ employee record (User ไม่มี column employeeId) → Tab 3 เข้าด้วย mock_jim/mod จะแสดง empty state
5. **Tab 1 ยัง call `supabaseAdmin.from('employees')` ที่ page.tsx** — ถ้าจะ scale ขึ้นอีก ค่อย extract เป็น shared server action

---

## ➡️ Phase 3 ที่จะทำต่อ (spec §7.5 + §9)

- Admin Management page `/portal/admin/permissions` — Super Admin แก้ preset ของคนอื่นได้
- Audit log viewer (ดูประวัติการแก้ข้อมูลพนักงาน)
- API filtering สำหรับ endpoints อื่น (เมื่อเริ่ม expose approval_limit_thb ผ่าน REST)
- Route guards ที่ใช้ permission flags (ไม่ใช่ role) — ให้ มด เข้า hradmin ได้

---

## Quick references

- **Local port:** 3001
- **Supabase project:** `cluirxjykhchthcpgosz` (EBCI Nexus, ap-southeast-1)
- **Spec doc:** `/Volumes/2TB-MAC/OldDownload/12OldDownload/ebci-nexus-org-authority-spec.md`
- **Remote:** https://github.com/caserebel-maker/EBCI-Nexus

*หลับฝันดีครับ 🌙*

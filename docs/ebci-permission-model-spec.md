# EBCI Nexus — Permission Model & UI Visibility

> ลด "ดราม่า" และเคารพความรู้สึกพนักงานในวัฒนธรรมไทย
> Permission แบ่งตาม role โดย L1/L2 จะเห็นข้อมูลจำกัดกว่า L3+/Admin

## Permission Matrix

| Feature | L1 พนักงาน | L2 หัวหน้าแผนก | L3 หัวหน้าฝ่าย | L4-5 / Admin |
|---|---|---|---|---|
| Tab 1: ผังแผนกตัวเอง | ✅ | ✅ | ✅ | ✅ |
| Tab 1: ผังทั้งบริษัท | ❌ | ❌ | ✅ | ✅ |
| Tab 2: chain ตัวเอง | ✅ | ✅ | ✅ | ✅ |
| Tab 2: approvers ทั้งบริษัท | คลิกขยาย | คลิกขยาย | ✅ default | ✅ default |
| Tab 2: วงเงินตัวเลขเป๊ะ | ❌ tier icon | ❌ tier icon | ✅ | ✅ |
| Tab 3: chain ตัวเอง | ✅ | ✅ | ✅ | ✅ |
| Edit employee | ❌ | ❌ | ❌ | ✅ |
| Level number บนการ์ด | ❌ | ❌ | ❌ | ✅ HR/Admin |

## Tab 1 — โครงสร้าง

**L1/L2:** เห็นแค่ผังแผนกตัวเอง + ปุ่ม "ดูผู้บริหารระดับสูง" (collapsible → MD + ประธาน)
**L3+/Admin:** เห็นผังเต็มทั้งบริษัท

ห้ามแสดง Level badge บนการ์ด ยกเว้น admin role

## Tab 2 — อำนาจอนุมัติ

**L1/L2:** แสดง 3 sections:
1. การลา/OT — chain ของตัวเอง (L3+ เท่านั้น)
2. เบิกเงิน — chain + tier icon (💧💎🔥♾️)
3. HR — fixed list: ป้อม, มด, ม๊อด, จิม
+ ปุ่ม "ดูผู้อนุมัติทั้งหมด" (collapsible)

**L3+/Admin:** เห็นทั้งหมด + filter chips + วงเงินตัวเลขเป๊ะ

## Tab 3 — สายอนุมัติของฉัน

ทุก role เห็นเหมือนกัน: walk up reports_to_id
แสดง: คุณ → หัวหน้า → MD → ประธาน

## Backend APIs

### /api/organization/structure
- L1/L2: filter ตาม department + secondary_department
- L3+: ทั้งหมด
- ส่ง topExecutives (L4+) แยก

### /api/organization/approvers
- Walk up chain ของ user
- รวม HR approvers (is_approver + 'hr' in scopes)
- รวม top executives
- Filter วงเงิน: L1/L2 → ลบ approval_limit_thb ส่งแค่ tier

### /api/organization/my-chain
- Walk up reports_to_id จนหยุดที่ NULL หรือ Level 5

## Test Scenarios

1. L1 (ครีม): เห็นแค่แผนกประสานงานเอกสาร, วงเงิน tier
2. L3 (ตู่): เห็นผังเต็ม + วงเงินตัวเลขเป๊ะ
3. Admin (ม๊อด): เห็นทุกอย่าง + Level badge + Edit

## Database — ไม่ต้องเปลี่ยน schema

ใช้ field ที่มี:
- approval_level
- can_view_all_employees
- can_view_approval_limits
- can_manage_system

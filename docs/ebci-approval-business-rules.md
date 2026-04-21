# EBCI Nexus — Approval Business Rules

> เอกสารเสริม spec — สำหรับ implement Tab 2

## Approval Scopes

| Scope | คำอธิบาย | ใครอนุมัติ |
|---|---|---|
| `leave` | การลา | L3+ ทุกคน |
| `ot` | OT | L3+ ทุกคน |
| `hr` | HR (สมัครงาน, ปรับตำแหน่ง) | มด, ป้อม, ม๊อด, จิม, ดำ |
| `budget` | เบิกเงิน | L2+ ตามวงเงิน |

## วงเงินเบิกเงิน (Tier System)

| Tier | Limit | Icon | ระดับ |
|---|---|---|---|
| 💧 เล็ก | ≤ 30,000 บาท | small | L2 |
| 💎 กลาง | ≤ 100,000 บาท | medium | L3 |
| 🔥 ใหญ่ | ≤ 500,000 บาท | large | (ไม่มีคนใช้) |
| ♾️ ไม่จำกัด | NULL | unlimited | L4 (MD), L5 (ประธาน) |

## Logic แปลง limit → tier

```typescript
function limitToTier(limit: number | null) {
  if (limit === null) return 'unlimited'
  if (limit <= 30000) return 'small'
  if (limit <= 100000) return 'medium'
  if (limit <= 500000) return 'large'
  return 'unlimited'
}

const TIER_DISPLAY = {
  small:     { icon: '💧', th: 'เล็ก',     amount: '≤ 30,000' },
  medium:    { icon: '💎', th: 'กลาง',     amount: '≤ 100,000' },
  large:     { icon: '🔥', th: 'ใหญ่',     amount: '≤ 500,000' },
  unlimited: { icon: '♾️', th: 'ไม่จำกัด', amount: 'ไม่จำกัด' },
}
```

## Approvers ทั้งหมด (33 คน)

### L5 - ประธาน
- ดำ — [leave, ot, budget, hr] — ♾️

### L4 - MD
- จิม — [leave, ot, budget, hr] — ♾️

### L3 - หัวหน้าฝ่าย (11)
- HR Approvers (3): มด, ป้อม, ม๊อด — [leave, ot, budget, hr] — 💎
- Regular L3 (8): เก๋, ต่าย, ตุ๊ก, ตู่, โต, โต้ย, ปุ๊, พงษ์, เล็ก — [leave, ot, budget] — 💎

### L2 - หัวหน้าแผนก (19)
ทั้งหมด: [budget] — 💧

## Logic getApproversForUser

```typescript
async function getApproversForUser(user) {
  // Walk up หา L3+ สำหรับ leave/ot
  const leaveOtApprovers = []
  let cursor = user.reports_to_id
  while (cursor) {
    const mgr = await getEmployee(cursor)
    if (!mgr) break
    if (mgr.is_approver && mgr.approval_scopes.includes('leave')) {
      leaveOtApprovers.push(mgr)
    }
    if (mgr.approval_level >= 4) break
    cursor = mgr.reports_to_id
  }
  
  // Budget chain
  const budgetApprovers = []
  cursor = user.reports_to_id
  while (cursor) {
    const mgr = await getEmployee(cursor)
    if (!mgr) break
    if (mgr.is_approver && mgr.approval_scopes.includes('budget')) {
      budgetApprovers.push(mgr)
    }
    cursor = mgr.reports_to_id
  }
  
  // HR fixed list
  const hrApprovers = await db
    .from('employees')
    .where('is_approver', true)
    .contains('approval_scopes', ['hr'])
  
  return { leaveOt: leaveOtApprovers, budget: budgetApprovers, hr: hrApprovers }
}
```

## Edge Cases

1. L2 ไม่อนุมัติลา/OT → ระบบข้าม L2 ไปหา L3 คนแรก
2. L1 ไม่อยู่ HR → แสดง HR fixed list
3. ม๊อด เป็น HR Approver แต่แสดงตำแหน่งจริง "หัวหน้าฝ่ายนวัตกรรม"
4. Tier 🔥 ไม่มีคนใช้ — ไม่ต้องแสดงในตัวอย่าง

## Test Cases

### Test 1: L1 (ครีม - แผนกประสานงานเอกสาร)
Walk up: ฝน (L2) → ตู่ (L3) → จิม (L4) → ดำ (L5)
Expected:
- การลา/OT: ตู่, จิม
- เบิกเงิน: ฝน (💧), ตู่ (💎), จิม (♾️), ดำ (♾️)
- HR: ป้อม, มด, ม๊อด, จิม

### Test 2: L2 (จักร - IT)
Walk up: ปุ๊ (L3) → จิม → ดำ
Expected:
- การลา/OT: ปุ๊, จิม
- เบิกเงิน: จักร (เอง 💧), ปุ๊ (💎), จิม (♾️), ดำ (♾️)
- HR: ป้อม, มด, ม๊อด, จิม

### Test 3: L3 (ม๊อด)
เห็น approvers ทุกคน + filter chips + วงเงินตัวเลขเป๊ะ

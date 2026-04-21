# EBCI Nexus — Organization Module Implementation
## Session: April 21, 2026

## 🎯 Feature Completed: Role-Based Organization Viewer

### Overview
Complete organization chart module with role-based permissions, approval chains, and flexible override system.

### Three Main Tabs

**Tab 1: โครงสร้าง (Structure)**
- Department view (tree layout, vertical wrap)
- Company overview (departments only, no employees)
- People view (L3+ and admin only)
- Permission filter: L1/L2 see only their own department

**Tab 2: อำนาจอนุมัติ (Authority)**
- My approvers for leave/OT
- Budget approvers with tier icons (small/medium/large/unlimited)
- HR approvers (hidden from L1/L2)
- All approvers section (L3+ and admin)

**Tab 3: สายอนุมัติของฉัน (My Chain)**
- Walk up reports_to_id
- Stops at MD (Level 4) for regular employees
- Override via leave_approver_id for special cases (e.g., president's secretary)
- Shows override badge ⭐ when applicable

## 🗄️ Database Schema

### New columns in `employees` table:

| Column | Type | Purpose |
|--------|------|---------|
| reports_to_id | text (FK) | Direct manager in hierarchy |
| secondary_department | text | Dual-role department |
| is_advisor | boolean | Separate advisors from regular staff |
| is_approver | boolean | Can approve requests |
| approval_scopes | text[] | [leave, ot, budget, hr] |
| approval_limit_thb | numeric | Budget limit (NULL = unlimited) |
| leave_approver_id | text (FK) | Override: leave goes to different approver |
| emergency_contact_name | text | Emergency contact name |
| emergency_contact_phone | text | Emergency contact phone |
| emergency_contact_relation | text | Relation (พี่ชาย, ภรรยา, etc.) |
| emergency_contact_address | text | Emergency contact address |

## 📊 Data Statistics

- 48 active employees
- 7 advisors
- 33 approvers (69% of active)
- 5 HR approvers: ม๊อด, มด, ป้อม, จิม, ดำ
- 1 leave override: จอย → ดำ
- 20 departments

## 🔑 Permission Matrix

| Feature | L1/L2 | L3 | L4+ / Admin |
|---------|-------|-----|------|
| Department tree | own only | own + company | company |
| Authority - chain | yes | yes | yes |
| Authority - HR section | no | yes | yes |
| Authority - all approvers | no | yes | yes |
| Authority - exact amounts | no (tiers) | yes | yes |
| My chain | yes | yes | yes |
| Level badges | no | no | admin only |
| Edit employee | no | no | admin only |

## 🧪 Test Accounts

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| tumyen@gmail.com | 0000 | Super Admin | Full access test |
| l1test@ebci.test | 0000 | L1 (หวาน) | Employee view |
| l2test@ebci.test | 0000 | L2 (จักร) | Department head view |
| joytest@ebci.test | 0000 | L1 override | Override badge test |

## ⏭️ Pending Work (Not Blocking)

- Wait for มด to review EBCI-employees-review.xlsx
- Add ตี๋ (president's driver) to system + set leave_approver_id = ดำ
- Evaluate if เบนซ์ (สำนักประธาน) needs override
- Image crop feature for profile photo upload (Phase F)
- Bulk emergency contact data entry

## 🎨 Design Decisions

- Vertical tree layout with flex-wrap (no horizontal scroll on mobile)
- Tier icons instead of exact amounts for L1/L2 (privacy)
- Lucide icons throughout (no emoji in UI elements)
- Multiple roots supported (siblings at top of department)
- Subtree grouping (L2 with reports shown separately from other L2)

## 📅 Timeline

- 9:00 AM — Session start
- 10:30 AM — Phase A complete
- 11:00 AM — Phase B complete
- 11:45 AM — Phase C complete
- 12:30 PM — Emergency Contact + Company Overview + Tree layout
- 1:15 PM — Phase D complete
- 1:30 PM — All testing passed

Total implementation time: ~4.5 hours

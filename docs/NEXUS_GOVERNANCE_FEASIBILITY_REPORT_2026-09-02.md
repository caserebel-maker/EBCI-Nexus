# NEXUS Governance Feasibility & Gap Report

วันที่ประเมิน: 2 กันยายน 2569

Repository: `/Volumes/C1TB/EB-CI/EBCI-Nexus`

Code baseline: `origin/main` commit `723e6cc`
เอกสารอ้างอิง: `EBCI_Nexus_Governance_Future_Development_Master_Requirements.md`

## ขอบเขตและวิธีตรวจ

- อ่าน requirement เป็นข้อมูลสำหรับวิเคราะห์ ไม่ได้ทำตามคำสั่งภายในโดยอัตโนมัติ
- ตรวจ snapshot ล่าสุดจาก `origin/main` ผ่าน worktree ชั่วคราว เพราะ checkout หลักมีไฟล์แก้ค้างและ merge conflict
- ตรวจโครงสร้าง Next.js, API routes, permission helpers, auth/session, migrations, RLS, Storage, approval flows, contract, payslip, expense, attendance, HIP, cron, backup และ system health
- ตรวจ Production Supabase แบบ read-only เฉพาะการมีอยู่และจำนวน record ของตารางสำคัญ รวมถึงสถานะ public/private ของ bucket
- ไม่แก้ Production data, ไม่สร้าง migration และไม่ implement feature จากเอกสารนี้

ข้อจำกัด: รายงานนี้เป็น repository and schema review ไม่ใช่ penetration test, legal opinion หรือการทดสอบ restore จริง การรับรอง RLS ทุก policy และ API ทุก route ต้องมี automated authorization test เพิ่มเติม

---

## A. Executive Summary

### คำตอบสั้น

**ทำได้ และควรพัฒนาต่อใน Nexus เดิมแบบ Modular Monolith** แต่ยังไม่ควรเริ่มจาก payroll engine, investigation, AI หรือ executive command center ตามลำดับในเอกสารทันที

Nexus มีฐานที่ reuse ได้มากกว่าระบบเริ่มใหม่ ได้แก่ employee identity, permission flags, approval chain, private document storage, contract metadata, salary slips, attendance, WFH, notifications, audit บางส่วน, backup export และ system health แต่ control เหล่านี้ยังเป็นรายโมดูล ไม่มี policy engine กลางและไม่มี test suite ที่พิสูจน์ separation of duties ได้

### ระดับความพร้อมโดยประมาณ

| ชั้นความสามารถ | ความพร้อม | ความเห็น |
|---|---:|---|
| HR / employee operations | 75% | ใช้งานจริงและมีข้อมูลจริงจำนวนมาก |
| Authorization foundation | 45% | มี 9 boolean permissions และ helper กลาง แต่ hard-coded role checks ยังอยู่ 27 ไฟล์ |
| Audit / evidence | 35% | มี audit หลายตาราง แต่ยังไม่เป็น event model กลางและไม่ครอบคลุม sensitive VIEW/DOWNLOAD/EXPORT |
| Contract / payslip controls | 40% | มี storage และ metadata ที่ดี แต่ยังไม่มี compensation version, payroll run, lock หรือ approval gateway |
| IT governance / continuity | 20% | มี health snapshot, HIP monitor และ backup export แต่ยังไม่มี ownership/DR/restore evidence |
| Investigation / whistleblowing | 5% | แทบไม่มี และมีความเสี่ยงด้าน confidentiality สูง |
| AI governance | 0-5% | ยังไม่ควรทำก่อน control และข้อมูลมีโครงสร้าง |

### สิ่งที่ดีและควรเก็บไว้

1. `route-auth.ts` และ permission flags เป็นจุดเริ่มของ authorization kernel ได้
2. Contract และ payslip ใช้ private bucket, server-generated signed access และ soft delete
3. Leave/WFH มีสายอนุมัติจริง, override, scope บางส่วน และหน้าตรวจ chain
4. `employee_audit_log`, `user_permission_audit_log`, password-change approval และ `session_version` เป็นฐาน audit/security ที่ดี
5. HIP sync, GPS review, attendance reconcile และ system health สะท้อนปัญหาหน้างานจริง
6. Backup ZIP มี manifest และคู่มือ restore แม้ยังไม่ใช่ DR ที่พิสูจน์แล้ว

### Blocker สำคัญ

1. **ไม่มี automated test/CI gate:** `package.json` ไม่มี test script และไม่พบ workflow ทดสอบ ทำให้ refactor permission เสี่ยงกระทบ Production
2. **Authorization สองระบบ:** app ใช้ทั้ง role, boolean permission และเงื่อนไขเฉพาะ route; พบ hard-coded role checks อย่างน้อย 27 ไฟล์
3. **Service-role concentration:** 83 จาก 103 API route files อ้าง `supabaseAdmin`; RLS จึงเป็น defense-in-depth แต่ไม่ใช่ control หลักของ server path
4. **Schema ownership ยังไม่เป็นหนึ่งเดียว:** Prisma + Supabase migrations + legacy text IDs อยู่ร่วมกัน ต้องทำ canonical mapping ก่อนสร้าง generic workflow
5. **Checkout หลักไม่อยู่ในสภาพ deployable:** ณ เวลาตรวจมี merge conflict และตามหลัง `origin/main`; ต้องแก้ source-control hygiene ก่อนงานใหญ่
6. **Backup ยังไม่ใช่ recovery:** เป็น manual browser download, เวลา backup จำใน localStorage, ไม่รวม audit logs และแนะนำเก็บใน Drive ส่วนตัว ซึ่งขัดกับ company ownership principle

### ข้อเสนอเชิงกลยุทธ์

เปลี่ยน P0 จาก “สร้าง 12 feature พร้อมกัน” เป็น **Control Foundation Release** ที่มีเพียง:

1. Clean main + CI + branch protection + migration baseline
2. Central authorization policy + route inventory + IDOR tests
3. Common audit event + sensitive access logging
4. Canonical identity map + actor/subject/context model
5. Restore drill และ company-owned backup location

เมื่อห้าข้อนี้ผ่านจึงเริ่ม Contract/Compensation, Special Payment และ Payroll Review

---

## B. Current Architecture Map

```text
Browser / Mobile PWA
  -> Next.js 16 App Router (103 API route files)
      -> signed application session cookie + session_version
      -> route-auth permission helper OR legacy role checks
      -> supabaseAdmin service-role access in 83 API route files
          -> Supabase PostgreSQL
          -> Supabase Storage (8 buckets)
      -> Resend / SMTP / Telegram notifications

Office Windows machine
  -> HIP SQL Server / HIP device
  -> hip-card-agent.mjs + local JSON state
  -> signed card-scan webhook
  -> Supabase card_scans / attendance reconciliation

Vercel
  -> Production + preview deployments
  -> one configured daily cron entry (/api/cron)
```

### Production data presence checked read-only

| Resource | Result |
|---|---:|
| Users | 53 |
| Employees | 73 |
| Mobile check-ins | 586 |
| Card scans | 22,599 |
| Leave requests | 190 |
| WFH requests | 46 |
| Employee audit rows | 147 |
| Permission audit rows | 11 |
| Contracts | 0 |
| Salary slips | 1 |
| Expense benefit/payment rows | 0 / 0 |
| GPS review requests | 2 |
| System health snapshots | 1 |

Storage ที่เป็น private: applicant assets, employee assets, contracts, expenses, leave attachments และ salary slips

Storage ที่เป็น public: announcement images และ employee photos

ข้อสังเกต: ตารางที่มี schema ไม่ได้แปลว่า process พร้อมใช้จริง ตัวอย่าง contracts/expenses มี 0 records และ salary slips มีเพียง 1 record

---

## C. Existing vs Proposed Matrix

สถานะ: **Existing** = มี workflow ใช้งานแล้ว, **Partial** = มีฐานแต่ยังไม่ผ่าน control ที่ขอ, **Missing** = ยังไม่มี, **Conflicting** = ของเดิมขัดหลักใหม่

| Requirement cluster | Status | ของเดิมที่ reuse ได้ | Gap / การเปลี่ยนที่ต้องทำ | Risk / Size | Phase | ข้อเสนอ |
|---|---|---|---|---|---|---|
| 3 Management hat / Employee hat | Partial | portal และ hradmin shell, ปุ่มสลับมุมมอง | ไม่มี actor_context ที่ถูกบันทึกกับ transaction/audit | M / M | P0 | Refactor |
| 4 Dynamic permission | Partial | 9 `can_*` flags, presets, editor | fixed booleans ขยายยาก ไม่มี permission registry | H / L | P0 | Implement incrementally |
| 5 Scoped permission | Partial | approval scope/department/limit ใน employee chain | ยังไม่ใช่ scope กลาง SELF/TEAM/DEPARTMENT/ALL | H / L | P0-P1 | Implement |
| 6 System admin != data authority | Conflicting | payroll/audit แยก flag บางส่วน | `can_manage_system` ยังรวมอยู่ใน HR staff และเข้าถึง business data บางเส้นทาง | H / M | P0 | Refactor |
| 7 Step-up authentication | Missing | signed cookie, session_version, password approval | ไม่มี recent-auth, MFA/OTP หรือ step-up token | H / L | P1 | Implement เฉพาะ sensitive actions |
| 8 Sensitive access log | Partial | employee/permission/email/login audit | ไม่มี schema กลางสำหรับ VIEW/DOWNLOAD/EXPORT/PRINT | H / M | P0 | Implement |
| 9 Audit immutability | Partial | RLS default deny, service writes | service role ยัง update/delete ได้; ไม่มี DB append-only trigger/hash/export retention | H / M | P0 | Harden |
| 10-13 Contract master/version/self-service | Partial | `employee_contracts`, effective dates, superseded chain, private bucket, soft delete | ไม่มี active-version constraint, version number, approval, employee self-service และ access log | H / L | P1 | Extend existing table |
| 12 Compensation master | Missing | salary/HR fieldsเดิมและ employee audit บางส่วน | ต้องแยก effective-dated compensation จาก employee master | H / L | P1 | Implement |
| 14-15 Payslip rollout/security | Partial | upload, bulk dry-run, private bucket, self-only portal API, payroll permission | ไม่มี step-up, download audit, payroll-run lineage และ production rollout evidence | H / M | P1 | Pilot only |
| 16-18 Special payment/self approval | Missing | approval chain, limits, notifications | ไม่มี request/evidence/beneficiary/conflict model | H / L | P1 | Build after policy kernel |
| 19 Authority matrix | Partial | approval levels, limits, scopes, org chain | ผูกกับ employee fieldsและ leave/budget logic ยังไม่ versioned/effective-dated | H / L | P1 | Refactor to configuration |
| 20 Delegation of authority | Partial | leave delegate helpers/override | ไม่มี generic delegation, validity period, conflict checks | H / M | P1 | Implement |
| 21-27 Payroll gateway/run/input/anomaly/lock/evidence | Missing | salary-slip import/persist, notifications | ยังเป็น document distribution ไม่ใช่ payroll control | H / XL | P2 | Build review layer, not payroll engine |
| 28-29 Expense governance/exception | Partial | benefit/payment tables, receipt storage, self read | ไม่มี claim approval, checker, exception policy, self-benefit block | H / L | P1-P2 | Extend, do not duplicate |
| 30-35 Investigation/evidence/interview/findings/AI | Missing | private storage/audit patterns | ต้องมี strict case assignment, legal retention, sealed evidence, export control | H / XL | P3 | Defer; consider specialist product |
| 36-41 IT governance/system/source registry | Partial | health endpoint/snapshots, Git/Vercel operational scripts | ไม่มี registry, owner, criticality, dependency, repo ownership evidence | M / L | P2 | Nexus registry is suitable |
| 42 Credential ownership registry | Missing | environment variables and password approval | ห้ามเก็บ secret value; เก็บเฉพาะ owner, vault reference, rotation metadata | H / M | P2 | Metadata only |
| 43-46 Access review/offboarding | Partial | permission editor, employee status, session_version | ไม่มี access inventory, review campaign, revoke checklist/evidence | H / L | P1-P2 | Implement |
| 47-49 Critical role/KT/document owner | Missing | employee/org data | ต้องมี primary/backup owner, due dates, evidence | M / M | P2 | Implement lightweight registry |
| 50-53 Continuity/DR/infrastructure | Partial | backup ZIP, health snapshots, Vercel/Supabase | ไม่มี RTO/RPO, restore test, owner, immutable offsite copy | H / L | P0-P2 | Restore test before dashboard |
| 54 HIP health dashboard | Partial | watchdog, health snapshots, Telegram alert, startup scripts | local state ยังเป็น JSON, alert thresholds hardcoded, fallback chat IDs hardcoded | H / M | P1 | Add durable outbox/queue |
| 55 Shift profiles | Missing | hardcoded work-time constants | 08:00/16:20/16:30 กระจายหลายจุด | H / M | P0-P1 | Central config first |
| 56 Attendance exception governance | Partial | GPS review, HR notes, outage grace, reconcile/anomaly views | exception taxonomy/effective period/approval/audit ยังไม่กลาง | M / M | P1 | Extend |
| 57 Schema governance | Conflicting | 49 Supabase migrations, Prisma schema | migration sourcesและ live history อาจ diverge; mixed IDs | H / M | P0 | Baseline first |
| 58-60 Tests/CI/staging | Missing/Partial | lint/build scripts, Vercel previews | ไม่มี test runner/workflow; preview อาจใช้ Production data | H / L | P0 | Highest priority |
| 61 Backup strategy | Partial | export ZIP + manifest + restore notes | manual, per-browser timestamp, excludes audit, no checksum verification/restore test | H / M | P0 | Refactor |
| 62 System health dashboard | Partial | snapshots/API and office monitor | historyน้อย, no SLO, ownership/escalation incomplete | M / M | P1 | Extend |
| 63 Notification center | Existing | in-app, email, Telegram pathways | ต้องเพิ่ม event taxonomy/dedup/escalation policy | M / M | P1 | Reuse |
| 64 Unified approval inbox | Partial | leave and WFH inboxes | workflow schemas/decision APIs แยกกัน | M / L | P1 | Aggregate first, unify engine later |
| 65-66 Executive dashboard/drill-down | Partial | HR dashboard/reports/org views | ยังไม่ผูก evidence, exception, approval lineage | M / L | P2 | Build after data controls |
| 67 Conflict declaration | Missing | employee identity | ต้องกำหนด policy/visibility/retention ก่อน schema | H / M | P2 | Implement narrowly |
| 68 Confidential reporting | Missing | feedback/email/private storage patterns | anonymity, retaliation protection, case access และ legal handling ยังไม่มี | H / XL | P3 | Prefer specialist channel |
| 69 Policy exception register | Partial | leave exception fields, outage grace | ยังเป็น hardcoded/domain-specific | H / M | P1 | Generic exception envelope |
| 70-72 Classification/retention/storage | Partial | private buckets, file caps, soft delete notes | ไม่มี classification metadata, retention job, legal hold, download audit | H / L | P0-P1 | Implement policy metadata |
| 73-75 Profile change/effective dating | Partial | employee audit, contract dates | update employee rowตรง, ไม่มี approval/effective-dated historyทั่วไป | H / L | P1 | Change-request pattern |
| 76-78 Maker-checker UI/reason/evidence | Missing/Partial | status chips, upload components, leave reasons | ไม่มี reusable transaction control component | M / L | P1 | Build shared primitives only after domain model |
| 79-83 AI anomaly/extraction/explainability | Missing | attendance risk rulesบางส่วน | data/control ground truth ยังไม่พร้อม | H / XL | P4 | Defer; rules before AI |
| 84 Global search/command | Missing | scattered search UIs | sensitive result filtering and audit required | H / L | P3 | Defer |
| 85 Timeline view | Partial | audit/history views | event formatsต่างกัน ไม่มี correlation ID | M / M | P1-P2 | Common audit event first |
| 86 Management mode UI | Partial | hradmin vs portal shells | contextไม่ได้เป็น authority object | M / M | P1 | Refactor incrementally |
| 87-88 Session/privileged protection | Partial | signed cookie, version revocation, password approval, login monitor | no MFA, re-auth, break-glass, privileged session policy | H / L | P0-P1 | Harden |
| 89 Impersonation | Missing | view switch is not controlled impersonation | ไม่ควรเพิ่มจนมี approval, banner, scope, expiry, audit | H / L | P3 | Defer |
| 90 Personal data masking | Partial | approval limit masking, scoped APIs | ไม่มี field-level classification/masking policy | H / L | P1 | Implement server-side |
| 91-92 KPI/HR analytics | Partial | attendance insights/reports | risk labelsอาจกลายเป็น surveillance; metric definitionsยังไม่ governed | M / L | P2 | จำกัดเป็น descriptive analytics |
| 93 IT inventory import | Missing | CSV parsing patternsจาก attendance/payroll | ต้องมี staging, preview, validation, owner mapping, import audit | M / M | P2 | Implement |
| 94-95 Integration registry/API layer | Partial | HIP, email, Telegram, webhook auth | ไม่มี registry, versioning, retry/idempotency standard | H / L | P1-P2 | Standardize adapters |
| 96 Canonical IDs | Conflicting | employee/user linksและ fallback resolution | User/employee/auth IDs มีทั้ง text/UUID; 73 employees vs 53 users | H / L | P0 | Identity map before generic engine |
| 97 Event/change architecture | Partial | notifications/audits/status histories | event schemasต่างกัน ไม่มี outbox/correlation | H / L | P1 | Lightweight outbox, not full event sourcing |
| 98 Database design principle | Partial | additive migrations, soft deleteบางตาราง | constraints/effective dating/immutabilityไม่สม่ำเสมอ | H / L | P0 | Establish standards |
| 99 UI principle | Partial | mobile portalใช้งานจริงและ component reuseบางส่วน | admin UI ยังเป็น module-specific; evidence hierarchyไม่สม่ำเสมอ | M / M | P2 | Improve after controls |

---

## D. Database Gap

### Reuse ก่อนสร้างใหม่

- ใช้ `employee_contracts` ต่อ ไม่สร้าง `employment_contracts` ซ้ำ
- ใช้ `salary_slips` เป็น output document ของ payroll run ในอนาคต
- ใช้ `employee_expense_benefits/payments` ต่อ แต่เพิ่ม request/approval linkage
- ใช้ employee/permission audit เดิมเป็น source migration เข้าสู่ audit event กลาง
- ใช้ approval level/scope เดิมเป็นข้อมูลตั้งต้น ไม่ถือว่าเป็น authority version ที่สมบูรณ์

### ตารางที่ควรเพิ่มใน P0-P1

| Table | เหตุผล |
|---|---|
| `identity_links` | map auth UUID, User ID, employee ID, legacy code แบบ canonical |
| `permission_grants` | permission key + scope + validity; คง boolean เดิมช่วง compatibility |
| `audit_events` | actor, context, action, entity, subject, request/session/correlation, metadata |
| `sensitive_access_events` | VIEW/DOWNLOAD/EXPORT พร้อม purpose/reason โดยไม่เก็บ payload ลับ |
| `compensation_versions` | effective-dated salary/allowance source of truth |
| `approval_requests`, `approval_steps` | generic envelope สำหรับ special payment/contract/payroll; ไม่รีบย้าย leave ทั้งหมด |
| `approval_delegations` | time-limited delegation และ conflict control |
| `policy_exceptions` | reason, evidence, approver, effective period |
| `restore_tests` | backup artifact, date, operator, result, evidence, RTO/RPO result |

### ตาราง P2 เป็นต้นไป

- `payroll_runs`, `payroll_entries`, `payroll_exceptions`
- `it_systems`, `it_system_owners`, `it_dependencies`, `it_dr_profiles`
- `critical_roles`, `knowledge_transfer_tasks`, `document_ownership`
- Investigation/whistleblowing tables เฉพาะเมื่อ policy/legal owner พร้อม

### Migration pattern

Additive -> backfill -> verify -> dual-read if needed -> switch read -> switch write -> deprecate. ห้ามเปลี่ยน employee/user IDs โดยตรงในรอบเดียว

---

## E. Auth / Permission Gap

1. Boolean flags ใช้งานได้สำหรับ 50-70 คน แต่ไม่พอสำหรับ scope และ time-limited authority
2. `route-auth.ts` ควรเป็น facade เดียวของ backend authorization; legacy role fallback ต้องมีรายการเลิกใช้
3. ทุก protected route ต้องประกาศ `resource + action + scope` และมี test ว่า owner/manager/HR/system admin/outsider ได้ผลตาม policy
4. แยก `SYSTEM_ADMIN` ออกจาก HR/business data อย่างแท้จริง; infrastructure access ไม่ควรเท่ากับ employee/contract access
5. Sensitive action ใช้ recent-auth/step-up และ short-lived capability ไม่ใช่ UI modal อย่างเดียว
6. RLS กับ app policy ต้องมาจาก model เดียวกัน หรือระบุชัดว่า server-only table ใช้ default-deny RLS และ authorization อยู่ที่ policy facade

---

## F. Audit Gap

- Audit ปัจจุบันแยกตาม domain และส่วนใหญ่เขียนด้วย service role
- `employee_audit_log` ปิด client write ด้วย RLS; `user_permission_audit_log` เป็น default-deny RLS แต่ service role ยัง bypass ได้
- ยังไม่มี guarantee ระดับ DB ว่า audit event ห้าม UPDATE/DELETE จาก application service
- Sensitive download/view/export ยังไม่ครอบคลุมสม่ำเสมอ
- ควรมี correlation ID ต่อ request/transaction และ actor context เพื่ออธิบายเหตุการณ์ end-to-end
- อย่า log เนื้อหา salary/medical/evidence ลง metadata; log reference และ purpose เท่านั้น

---

## G. Payroll / Contract Gap

### Contract

Schema เดิมเหมาะต่อยอดเพราะมี effective dates, superseded link, soft delete และ private storage แต่ต้องเพิ่ม version number, status, approved_by/approved_at, one-active-version rule, employee self-read และ access log

### Compensation

ต้องแยกออกจาก employee row เป็น effective-dated version และห้าม overwrite ประวัติ ข้อมูลนี้เป็น dependency ของ special payment และ payroll review

### Payroll

ทำได้โดย **ไม่สร้าง payroll calculation engine**: รับไฟล์/รายการจาก Accounting, resolve compensation, ตรวจ variance/exception, maker-checker-approver, lock และผูก payslip หลังอนุมัติ Nexus ทำหน้าที่ control gateway ไม่แทนโปรแกรมบัญชี

---

## H. IT Governance Gap

เหมาะอยู่ใน Nexus ถ้าเป็น registry/workflow: system owner, backup owner, criticality, dependencies, recovery document, access review และ restore test ไม่ควรเก็บรหัสผ่านจริงหรือทำตัวเป็น secrets vault

HIP ควรเปลี่ยน state JSON เป็น SQLite outbox ที่มี unique event key, retry count, next retry, acknowledged_at และ dead-letter state เพื่อให้ไฟดับ/รีสตาร์ตแล้วส่งต่อได้โดยไม่ซ้ำ

---

## I. Business Continuity Gap

- Backup ZIP เป็น useful export แต่ยังไม่ใช่ backup program
- Audit log ถูกตัดออกจาก ZIP ทั้งที่เป็นหลักฐานสำคัญ
- `last backup` อยู่ใน browser localStorage จึงไม่ใช่หลักฐานองค์กร
- “Google Drive ส่วนตัว” ต้องเปลี่ยนเป็น company-controlled Shared Drive/account พร้อม owner และ backup owner
- ต้องทำ restore drill ลง isolated Supabase project และวัด RTO/RPO จริงก่อนสร้าง DR dashboard

---

## J. Testing / Deployment Gap

### เริ่มทดสอบจากจุดนี้

1. Unit: permission policy, scope resolution, self-benefit conflict, effective-date resolver
2. DB/RLS: owner vs outsider, service path, append-only audit, private storage
3. Integration: payroll/contract/expense IDOR และ approval transitions
4. E2E: employee self-service, manager approval, HR exception, Super Admin security action
5. Contract tests: HIP webhook idempotency/retry and cron authorization

CI ต้องบังคับ lint + typecheck + unit/integration + migration validation + production build ก่อน merge และ Production deploy ต้องมาจาก protected main เท่านั้น

---

## K. Recommended Phases

### P0A: Stabilize delivery

- Resolve current merge conflict and align local main with origin
- Add CI, branch protection, migration baseline and staging data boundary
- Build authorization route inventory and minimum IDOR tests

### P0B: Control kernel

- Canonical identity links
- Policy facade with permission/scope/context
- Audit event and sensitive access log
- Self-benefit conflict function enforced backend + DB constraint/trigger where possible
- Company-owned backup and first restore drill

### P1: Governed HR transactions

- Contract versioning + employee self-service
- Compensation versioning
- Special payment workflow
- Delegation and policy exceptions
- Unified approval inbox as an aggregate view
- Shift configuration and attendance exceptions

### P2: Payroll review and continuity

- Payroll import/review/variance/approval/lock/evidence
- Access review/offboarding
- IT system/owner/dependency/DR registry
- Critical roles/document ownership/knowledge transfer

### P3: High-confidentiality workflows

- Investigation only after access model and legal policy are validated
- Confidential reporting preferably separated or handled by specialist service

### P4: Intelligence

- Rules-based anomaly first
- AI extraction/summarization only with human approval, provenance and no fraud labels

---

## L. Risk Register

| Risk | Severity | Evidence | Mitigation |
|---|---|---|---|
| Permission regression exposes sensitive data | Critical | mixed role/flag checks, no tests | policy facade + route matrix + IDOR tests |
| Service role bypasses RLS | Critical | 83 API routes use `supabaseAdmin` | narrow repositories, mandatory server auth, audit privileged paths |
| Backup cannot restore | Critical | manual ZIP, no restore evidence, audit excluded | isolated restore drill + company-owned storage |
| Mixed identities misattribute actor/subject | High | 73 employee rows vs 53 users, fallback mappings | canonical identity_links and reconciliation |
| Payroll control built on unversioned salary | High | compensation master missing | compensation versions first |
| Audit is editable by privileged app path | High | service role bypass | append-only DB function/trigger, restricted writer |
| HIP event loss after machine/disk failure | High | local JSON state | SQLite outbox + retry + remote acknowledgement |
| Investigation data leaks | High | no case-assigned model/step-up | defer until security foundation; specialist system option |
| Telemetry becomes employee surveillance | Medium-High | live page presence and attendance risk scoring | purpose, minimal retention, role-limited access, no opaque scoring |
| Roadmap overwhelms small team | High | requirements span HRIS, GRC, ITSM, payroll, case management, AI | phase gates and explicit do-not-build list |

---

## M. Estimated Complexity

| Deliverable | Size |
|---|---|
| CI + route authorization inventory | M |
| Central permission/scope facade | L |
| Common audit and sensitive-access events | L |
| Canonical identity reconciliation | L |
| Contract + compensation versioning | L |
| Special payment workflow | L |
| Payroll review gateway (ไม่คำนวณ payroll) | XL |
| IT governance + continuity registry | L |
| HIP durable queue | M |
| Investigation/evidence workflow | XL |

---

## N. Do Not Build List

1. Full payroll calculation engine หรือ Accounting ERP
2. Generic workflow designer แบบลากวางใน P0
3. Full event sourcing หรือ microservices
4. เก็บ password/API secret ใน Nexus credential registry
5. AI fraud detector, burnout predictor หรือ employee risk score
6. Custom anonymous whistleblowing system ก่อนมี legal/security owner
7. Impersonation ก่อนมี step-up, approval, expiry, scope และ audit
8. Global search ที่รวม salary/medical/investigation ก่อน field-level policy
9. Dashboard สวยๆ ก่อน restore test และ control evidence
10. Rewrite leave/WFH ที่ใช้งานอยู่ให้ใช้ generic engineพร้อมกันทั้งหมด

---

## คำตอบ Codex Review Questions 20 ข้อ

1. **RBAC รองรับ scope หรือไม่?** รองรับบางส่วนเฉพาะ approval; ต้องเพิ่ม generic grant/scope model
2. **RLS สอดคล้องกับ app auth หรือไม่?** ไม่ทั้งหมด บาง tableใช้ role เดิม ขณะที่ appใช้ flags และ server service role bypasses RLS
3. **Audit immutable แค่ไหน?** clientทั่วไปแก้ไม่ได้ แต่ยังไม่ immutable ต่อ privileged service path
4. **Payslip rollout ปลอดภัยพอหรือยัง?** เหมาะ pilot จำกัดคน; ยังไม่พร้อม broad production จนมี access log/step-up/test
5. **Contract migrateได้หรือไม่?** ได้ โดย alter ตารางเดิมและ backfill ไม่ต้องสร้างใหม่
6. **Approval engine reuse ได้แค่ไหน?** reuse resolver/notifications/UI concepts ได้ แต่ leave/WFH logic ยังไม่ใช่ generic engine
7. **Self-approval block อยู่ไหน?** ทั้ง backend และ DB; UI เป็นเพียง feedback
8. **Payroll controlโดยไม่สร้าง engineได้หรือไม่?** ได้ และเป็นแนวทางที่แนะนำ
9. **Employee ID เป็น canonicalได้หรือไม่?** ยังไม่ได้ทันที ต้องมี identity mapและ reconcile legacy IDs
10. **IT Governance อยู่ Nexusไหม?** อยู่ได้ในฐานะ registry/workflow; monitoringเฉพาะทางและ secrets vaultควรอยู่นอก
11. **Google Sheet importอย่างไร?** CSV/XLSX -> staging -> validate/preview -> owner mapping -> idempotent upsert -> audit
12. **HIP SQLite queueอย่างไร?** durable outbox, unique scan key, retry/backoff, ack, dead-letter, health metrics
13. **Cron risk?** scheduleจริงมี entryเดียว, logicบางงานอาจไม่ได้ถูก schedule, query-string secretเสี่ยงรั่ว log และงานยาวไม่มี durable job state
14. **Vercel planกระทบอย่างไร?** ระบุไม่ได้จาก repo; ต้องตรวจ planจริงก่อนกำหนด cron frequency, function duration, log retention และ observability
15. **Backup restoreได้จริงหรือยัง?** ยังยืนยันไม่ได้จนทำ restore drill
16. **Testingเริ่มตรงไหน?** permission/scope/self-approval และ IDOR ของ payslip/contractก่อน
17. **Hardcoded permissionเหลือไหม?** มีอย่างน้อย 27 ไฟล์ที่ยังตรวจ role/allowedRoles โดยตรง
18. **Sensitive APIพึ่ง frontendอย่างเดียวไหม?** routeที่สุ่มตรวจมี backend checks แต่รูปแบบไม่สม่ำเสมอ; ยังรับรองทุก 103 routeไม่ได้ก่อนมี route matrix/test
19. **Service roleมากเกินไปไหม?** ใช่ 83 API route files ใช้ `supabaseAdmin`; ต้องลด blast radiusและทำ policy facade
20. **ห้า moduleแรก?** CI/schema baseline, authorization kernel, audit/access log, identity map, backup restore drill แล้วค่อย contract/compensation

---

## Final Recommendation

อนุมัติ **ทิศทาง** ของเอกสาร แต่ไม่อนุมัติ **scope P0 เดิม** แบบยกชุด

เป้าหมายที่เหมาะกับ EBCI คือ Nexus เป็น control and evidence layer เชื่อม HR/Accounting/IT ไม่ใช่สร้าง ERP, GRC suite และ investigation platformทั้งหมดเอง ควรผ่าน phase gate ทีละชั้น โดยทุก phase ต้องมี authorization tests, migration rollback/compatibility plan, audit evidence และ restore proof ก่อนเปิด Production

หลักตัดสินใจสำหรับทุก feature:

> ถ้ายังตอบไม่ได้ว่าใครมีสิทธิ์, ใครเป็นผู้รับประโยชน์, ใครอนุมัติ, หลักฐานอยู่ไหน และกู้คืนอย่างไร ก็ยังไม่ควรเพิ่ม AI หรือ dashboard เหนือข้อมูลนั้น

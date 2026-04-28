import 'server-only'

/**
 * Helpers for the "ดาวน์โหลดข้อมูลทั้งระบบ" backup ZIP
 * (/api/hradmin/backup/download).
 *
 * The ZIP is shaped so a future operator — human or AI — has every
 * piece of context they need to interpret + restore the snapshot
 * without already understanding the project. See SYSTEM.md inside
 * the archive for the full architecture briefing.
 */

// ─── CSV ──────────────────────────────────────────────────────────────────

/**
 * Render a flat array of records as RFC-4180 CSV. Adds a UTF-8 BOM so
 * Excel opens Thai content with the right encoding by default; without
 * it Excel guesses Windows-874 and renders mojibake.
 *
 * - JSON columns are stringified (so jsonb survives the round-trip).
 * - Date instances + `Date`-shaped values are serialised as ISO 8601.
 * - `null` / `undefined` become the empty string.
 * - Quotes inside cells get doubled per spec; cells containing commas,
 *   quotes, newlines, or carriage returns get wrapped in quotes.
 */
export function toCsv(
    rows: Array<Record<string, unknown>>,
    columns?: string[],
): string {
    const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : [])
    if (cols.length === 0) return '﻿' + (rows.length === 0 ? '' : '')

    const escapeCell = (value: unknown): string => {
        if (value === null || value === undefined) return ''
        let s: string
        if (value instanceof Date) {
            s = value.toISOString()
        } else if (typeof value === 'object') {
            try { s = JSON.stringify(value) } catch { s = String(value) }
        } else {
            s = String(value)
        }
        if (/[",\n\r]/.test(s)) {
            return `"${s.replace(/"/g, '""')}"`
        }
        return s
    }

    const header = cols.map(escapeCell).join(',')
    const body = rows
        .map(row => cols.map(c => escapeCell(row[c])).join(','))
        .join('\n')

    return '﻿' + header + (body ? '\n' + body : '') + '\n'
}

// ─── Manifest (per-backup) ────────────────────────────────────────────────

export interface BackupManifestInput {
    /** When the archive was created. */
    createdAt: Date
    /** HR admin who triggered the backup. */
    triggeredBy: { name: string; email: string }
    /** Per-table row counts ("employees" → 54). */
    tableCounts: Record<string, number>
    /** Per-bucket file counts + bytes (after the actual download attempt). */
    bucketStats: Array<{ bucket: string; files: number; bytes: number; failed: number }>
    /** Storage objects we tried to fetch but couldn't, in case Mod needs to know. */
    failures: string[]
}

/**
 * Per-backup MANIFEST.md — facts unique to this archive (when, who,
 * how many rows, how big). Pairs with the static SYSTEM.md so an
 * incoming AI knows both "what is this app" and "what's in this
 * specific snapshot."
 */
export function buildManifestMd(input: BackupManifestInput): string {
    const stamp = input.createdAt.toISOString()
    const stampTh = input.createdAt.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'full',
        timeStyle: 'medium',
    })
    const totalFiles = input.bucketStats.reduce((s, b) => s + b.files, 0)
    const totalBytes = input.bucketStats.reduce((s, b) => s + b.bytes, 0)
    const totalFailed = input.bucketStats.reduce((s, b) => s + b.failed, 0)
    const totalRows = Object.values(input.tableCounts).reduce((s, n) => s + n, 0)

    const tableRows = Object.entries(input.tableCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([t, n]) => `| \`${t}\` | ${n.toLocaleString()} |`)
        .join('\n')

    const bucketRows = input.bucketStats
        .map(b => `| \`${b.bucket}\` | ${b.files} | ${formatBytes(b.bytes)} | ${b.failed} |`)
        .join('\n') || '| (no buckets) | 0 | 0 B | 0 |'

    const failureSection = input.failures.length === 0
        ? `_(none — every storage object listed in the database was downloaded successfully)_`
        : input.failures.map(f => `- \`${f}\``).join('\n')

    return `# EBCI Nexus — Backup Manifest

> สนิปแชอตข้อมูลของระบบ EBCI Nexus หากต้องการเข้าใจว่าระบบนี้คืออะไร
> และจะ restore กลับมายังไง อ่านไฟล์ \`SYSTEM.md\` ในแอร์ไคฟ์เดียวกันก่อน.

## When

- **Created (UTC):** \`${stamp}\`
- **Created (Bangkok):** ${stampTh}
- **Triggered by:** ${input.triggeredBy.name} (\`${input.triggeredBy.email}\`)

## Totals

- **Tables exported:** ${Object.keys(input.tableCounts).length}
- **Rows exported:** ${totalRows.toLocaleString()}
- **Storage buckets exported:** ${input.bucketStats.length}
- **Storage files included:** ${totalFiles.toLocaleString()}
- **Storage bytes included:** ${formatBytes(totalBytes)}
- **Storage download failures:** ${totalFailed}

## Tables (CSV files in \`data/\`)

| Table | Row count |
|---|---:|
${tableRows}

CSV format: RFC-4180, UTF-8 with BOM, ISO 8601 timestamps, JSON columns
serialised as JSON strings. Open with Excel / Google Sheets / DuckDB.

## Storage buckets (binary files in \`files/\`)

| Bucket | Files | Size | Failed |
|---|---:|---:|---:|
${bucketRows}

Failures encountered while pulling storage objects:

${failureSection}

## What is **NOT** in this backup

- **\`auth.users\`** — Supabase Auth credentials (passwords / hashes / OTPs).
  Restoring requires recreating accounts via Supabase or re-inviting via
  the in-app permissions editor; the \`User\` table here links each user
  by id but does not contain the password hash.
- **Audit logs** (\`employee_audit_log\`, \`user_permission_audit_log\`) —
  excluded by default to keep the archive small. They live in Supabase
  and can be exported separately if a forensic restore is needed.
- **Vercel environment variables** — secrets never leave Vercel; see
  \`SYSTEM.md\` for the list of vars the app needs.
- **Application source code** — use the GitHub repository
  \`caserebel-maker/EBCI-Nexus\` for that.

## Quick restore checklist

1. Read \`SYSTEM.md\` end-to-end so the AI / operator knows the moving
   parts before touching anything.
2. Provision a fresh Supabase project (or empty the existing one).
3. Apply migrations from the GitHub repo:
   \`supabase/migrations/*.sql\` in chronological order.
4. \`\\copy\` the CSVs in \`data/\` into the matching tables. Watch for
   foreign-key order: \`employees\` → \`User\` link → \`leave_*\` →
   \`announcements\`, \`holidays\` last.
5. Recreate Supabase Storage buckets (see \`SYSTEM.md\`) and upload the
   contents of \`files/<bucket>/\` to each.
6. Recreate Auth users one by one (or use Supabase Admin's invite flow).
7. Verify by signing in as a known account and walking through the
   leave + payroll flows in \`SYSTEM.md\`.

---
_Generated by \`/api/hradmin/backup/download\`._
`
}

// ─── System architecture (static) ─────────────────────────────────────────

/**
 * SYSTEM.md — comprehensive system briefing intended for an AI agent
 * who has never seen this codebase before. The goal is "drop the ZIP
 * + this MD into a new chat and the AI can plausibly help recover."
 *
 * It is intentionally static (no runtime values) because architecture
 * doesn't change every backup. The dynamic facts (counts, dates) live
 * in MANIFEST.md.
 */
export function buildSystemMd(): string {
    return `# EBCI Nexus — System Briefing

> 🤖 **AI handoff document.** Read this before doing anything with the
> backup. This file describes what EBCI Nexus is, how it's built, and
> how to bring it back from the data in this archive.

## What this is

**EBCI Nexus** is the in-house HR / employee portal for EBCI Group
(Thai trading company, ~54 employees). It covers:

- Employee records + org chart
- Leave management (request → approval chain → balance + email notify)
- GPS-based attendance check-in (office geofence + WFH)
- Payroll slip distribution (HR uploads PDFs, employees view + download)
- Recruitment (public careers form → applicant pipeline → hire flow)
- HR announcements (broadcast with email for urgent/emergency)
- Permissions editor (super-admin manages user flags + audit log)
- Company calendar (holidays, religious days, WFH days)

Primary language is **Thai**; technical identifiers are English.

## Tech stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | **Next.js 16 App Router** | RSC + server actions + API routes |
| Language | **TypeScript (strict)** | Most files are \`.tsx\` / \`.ts\` |
| UI | React 19 + **Tailwind CSS** | Plus inline styles for glassmorphism |
| Components | shadcn/ui-style + lucide-react icons | Some custom modals (portal-mounted) |
| DB | **Supabase Postgres** | Accessed two ways (see below) |
| Auth | **Supabase Auth** | Email + password; cookie-based sessions in app |
| Storage | **Supabase Storage** | 7 buckets (see Storage section) |
| ORM | **Prisma** + raw \`supabaseAdmin\` client | Mixed; new code prefers \`supabaseAdmin\` |
| Email | **Resend** | 3 sender identities (careers / hr / system) |
| Hosting | **Vercel** | \`https://ebci-nexus.vercel.app\` (alias \`https://nexus.ebcitrade.com\`) |
| Package mgr | npm | \`package-lock.json\` committed |

## Repository

- **GitHub:** \`caserebel-maker/EBCI-Nexus\`
- **Default branch:** \`main\` — direct pushes, no PRs (solo project)
- **Push pattern:** \`git push origin HEAD:main\`
- Most living docs in \`docs/NEXT.md\` (latest state) and
  \`docs/SESSION_HISTORY.md\` (append-only archive).

## Project layout

\`\`\`
src/
├── app/                              ← Next.js App Router
│   ├── login/                        ← /login (email + password)
│   ├── forgot-password/              ← /forgot-password (sends recovery email)
│   ├── reset-password/               ← /reset-password (Supabase recovery flow)
│   ├── careers/apply/                ← Public applicant form
│   ├── portal/                       ← Employee-facing experience
│   │   ├── dashboard/                ← /portal entry
│   │   ├── checkin/                  ← GPS attendance
│   │   ├── leave/                    ← My leave + inbox (approvers)
│   │   ├── calendar/                 ← Company calendar (holidays + WFH)
│   │   ├── payroll/                  ← My salary slips
│   │   ├── settings/                 ← Change password
│   │   └── ...
│   ├── hradmin/                      ← Admin / HR experience
│   │   ├── dashboard/
│   │   ├── employees/                ← CRUD + edit modal
│   │   ├── leave/                    ← Tabs: overview, all, balances, calendar, inbox, policies
│   │   ├── payroll/                  ← Bulk slip upload
│   │   ├── holidays/                 ← Company calendar editor (4 types incl. WFH)
│   │   ├── announcements/
│   │   ├── applicants/               ← Recruitment pipeline
│   │   ├── attendance/
│   │   ├── reports/
│   │   └── settings/                 ← Permissions editor, audit, backup, quota
│   └── api/                          ← Route handlers (server endpoints)
├── lib/                              ← Shared logic
│   ├── auth.ts / auth-types.ts       ← getSession() + SessionUser
│   ├── route-auth.ts                 ← getAuth() + permission AuthCheck helpers
│   ├── permissions.ts                ← UserPermissions type + presets
│   ├── permissions-server.ts         ← getCurrentPermissions()
│   ├── supabase.ts                   ← Public anon client (browser)
│   ├── supabase-admin.ts             ← Service-role client (server only)
│   ├── prisma.ts                     ← Prisma client singleton
│   ├── email.ts + *-emails.ts        ← Resend integration
│   ├── leave-approval.ts             ← Approver resolution logic
│   ├── employee-profile.ts           ← Profile loader for shell sidebar
│   └── backup.ts                     ← (THIS module — generates this archive)
├── components/                       ← Reusable UI (shell, sidebar, dashboard, modals)
├── config/                           ← navigation.tsx, roles.ts
└── contexts/                         ← language, role contexts
supabase/
├── migrations/                       ← SQL schema migrations (timestamp-prefixed)
└── seeds/                            ← Seed data (e.g. holidays_2026.sql)
docs/
├── NEXT.md                           ← Current session priorities
└── SESSION_HISTORY.md                ← Append-only history
prisma/
└── schema.prisma                     ← Prisma schema mirror (kept in sync with Supabase)
\`\`\`

## Authentication & sessions

The app runs **two parallel session systems** stitched together:

1. **Supabase Auth** — owns the password / email of record.
   \`signInWithPassword\` etc. is called server-side via
   \`supabaseAdmin\` from \`/api/auth/login\`.
2. **\`nexus_session\` cookie** — JSON blob set after successful login,
   read by every server component via \`getSession()\` in
   \`src/lib/auth.ts\`. Shape:
   \`\`\`ts
   interface SessionUser {
     id: string                       // auth.users.id (UUID)
     role: 'hr_admin' | 'manager' | 'employee'
     name: string
     employeeId?: string              // employees.id when linked
   }
   \`\`\`

The cookie is **the source of truth in-app** because it's read
synchronously without a Supabase round-trip. The Supabase session
cookies (\`sb-*\`) sit alongside it — used by the browser-side
\`supabase\` client (e.g. password change in \`/portal/settings\`).

Permissions are 8 boolean flags on the \`User\` table, surfaced via
\`getCurrentPermissions()\` and checked with \`AuthCheck\` helpers in
\`src/lib/route-auth.ts\`:

| Flag | Grants |
|---|---|
| \`can_view_all_employees\` | See full employee list + profiles |
| \`can_edit_employees\` | Edit employee data |
| \`can_view_approval_limits\` / \`can_edit_approval_limits\` | Budget approval limits |
| \`can_approve_leave\` | Approve leave outside the supervisor chain |
| \`can_manage_payroll\` | Bulk-upload salary slips |
| \`can_view_audit_log\` | Read \`*_audit_log\` tables |
| \`can_manage_system\` | **Super-admin** — edit other users' permissions |

The legacy \`role\` column still exists; \`isLegacyHrAdmin\` (role ===
\`hr_admin\`) keeps older accounts working, but new gates prefer flags.

## Database tables (high-level)

Critical (always backed up):

| Table | Purpose |
|---|---|
| \`employees\` | Master record — name, dept, position, photo, manager_id, leave_approver_id, is_approver flag, approval_level, approval_scopes |
| \`User\` | Supabase Auth ↔ employee link + role + 8 permission flags |
| \`leave_requests\` | Each leave application — status, dates, approver_id, reason |
| \`leave_balances\` | Per-employee per-year per-type entitled / used / pending days |
| \`leave_types\` | Catalogue (annual, sick, personal, compensation, maternity, ordination, …) |
| \`holidays\` | Company calendar — 4 \`type\` values: \`public\`, \`religious\`, \`company\`, \`wfh\` |
| \`announcements\` | HR posts (priority: internal/promote/urgent/emergency) |
| \`salary_slips\` | Metadata + storage path to PDF in \`salary-slips\` bucket |
| \`offices\` | GPS coordinates + radius_meters for office check-in geofence |
| \`check_ins\` | Per-day attendance records (office vs WFH) |
| \`job_applications\` | Applicant pipeline (status: applied → reviewing → shortlisted → interview → hired/rejected) |

Optional (sometimes excluded for size):

- \`employee_audit_log\` — every change to an employee record
- \`user_permission_audit_log\` — permission flag changes

## Storage buckets

| Bucket | Public | Limit | Purpose |
|---|---|---:|---|
| \`employee-photos\` | ✅ | — | Profile pictures (also seen via public URL) |
| \`employee-contracts\` | private | 20 MB | Signed employment contracts |
| \`salary-slips\` | private | 10 MB | Monthly PDF payslips |
| \`announcement-images\` | ✅ | — | Hero images on announcement cards |
| \`applicant-assets\` | private | — | Resume / CV / ID copy / signature for applicants |
| \`leave-attachments\` | private | — | Sick-leave docs, etc. |
| \`employee-assets\` | private | — | Misc per-employee files |

The backup ZIP downloads everything from each bucket into
\`files/<bucket>/<original-path>\`.

## Core flows

### Leave request → approval

1. Employee submits via \`/portal/leave\` form → \`POST /api/leave/submit\`.
2. Server inserts into \`leave_requests\` with \`approver_id\` resolved by
   \`src/lib/leave-approval.ts\` (priority: \`leave_approver_id\` override,
   then walk \`reports_to_id\` chain looking for \`is_approver = true\`
   employees whose \`approval_department_scope\` covers the applicant).
3. Email goes to applicant (confirmation) + approver (notification).
4. Approver visits \`/portal/leave/inbox\` (or \`/hradmin/leave/inbox\`
   if HR admin) → clicks Approve / Reject.
5. \`POST /api/leave/[id]/approve|reject\` updates status + balance and
   emails the applicant.

### Salary slip upload (HR)

1. HR Admin or someone with \`can_manage_payroll\` opens
   \`/hradmin/payroll/bulk\`.
2. Drops PDFs named \`Slip_<employee_code>_<YYYY-MM>.pdf\`.
3. \`POST /api/hradmin/payroll/bulk-upload\` matches files to employees,
   uploads to the \`salary-slips\` bucket, inserts \`salary_slips\` rows,
   and emails each employee whose slip just landed.
4. Employee sees the slip in \`/portal/payroll\` and can download.

### GPS check-in

1. Browser captures lat/long via \`navigator.geolocation\` (only if
   user grants permission).
2. \`POST /portal/checkin/actions:checkIn\` validates:
   - Time window 7:00–9:30 Bangkok (anti-trick #1)
   - Distance to office ≤ \`offices.radius_meters\` (haversine)
3. \`type='wfh'\` skips GPS entirely.

### New employee onboarding

1. HR creates employee in \`/hradmin/employees/new\` (or hires an
   applicant via \`/api/hradmin/applicants/[id]/hire\`).
2. Server calls \`supabaseAdmin.auth.admin.generateLink\` with
   \`{type:'invite', redirectTo: '/reset-password'}\`.
3. Resend sends a custom welcome email containing the link.
4. New hire clicks → /reset-password sets a password → can log in.

### Forgot password

1. \`/forgot-password\` (added 2026-04-28) calls
   \`supabase.auth.resetPasswordForEmail(email, {redirectTo: '/reset-password'})\`.
2. Supabase emails a recovery link (Supabase template, not Resend).
3. Link lands on \`/reset-password\` which establishes the recovery
   session and sets a new password via \`supabase.auth.updateUser\`.

## Environment variables

Required in production (Vercel project settings):

\`\`\`
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY              ← server-only, never ship to client
DATABASE_URL                           ← Prisma; points at Supabase pooler
RESEND_API_KEY
EMAIL_FROM                             ← legacy fallback
EMAIL_FROM_CAREERS                     ← careers@ebcinext.com
EMAIL_FROM_HR                          ← hr@ebcinext.com
EMAIL_FROM_SYSTEM                      ← no-reply@ebcinext.com
EMAIL_REPLY_TO                         ← optional
HR_NOTIFY_EMAIL                        ← inbox that receives "new applicant", "escalation"
NEXT_PUBLIC_APP_URL                    ← https://ebci-nexus.vercel.app
\`\`\`

## How to restore from this archive

> **Don't blindly restore production.** Stand up a fresh Supabase
> project and Vercel preview first; verify; then cut over.

1. **Get the code.** \`git clone caserebel-maker/EBCI-Nexus\`.
2. **Provision Supabase.** Create project; note URL + anon + service
   role keys.
3. **Apply migrations.** Use the Supabase CLI or psql to run every
   file in \`supabase/migrations/*.sql\` in name order.
4. **Recreate buckets.** Via the Supabase dashboard or CLI, create the
   7 buckets listed above with their public/private + size-limit
   settings.
5. **Restore data.** From this ZIP's \`data/\` directory, \`\\copy\` each
   CSV into the matching table:
   \`\`\`
   psql $DATABASE_URL -c "\\copy employees FROM 'employees.csv' CSV HEADER"
   \`\`\`
   Order matters for FKs: \`leave_types\`, \`offices\`, \`employees\`,
   \`User\`, \`leave_balances\`, \`leave_requests\`, \`announcements\`,
   \`holidays\`, \`salary_slips\`, \`job_applications\`.
6. **Restore files.** Walk \`files/<bucket>/\` and upload each file
   back to the matching Supabase Storage bucket.
7. **Recreate Auth users.** \`auth.users\` is **not** in this backup
   — passwords are unrecoverable. Either:
   - Trigger Supabase invite-by-email for each \`User\` row
     (recommended), so each person sets a fresh password, OR
   - Insert dummy auth.users with predictable passwords for the
     restore phase, then have everyone reset.
8. **Set env vars in Vercel.** Match the list above.
9. **Smoke test:** sign in as a super-admin, walk through leave +
   payroll flows; check \`/hradmin/settings/audit\` (audit log will
   start fresh).

## Helpful prompts when you brief a new AI agent

- "Read \`SYSTEM.md\` end-to-end, then answer questions about the
  EBCI Nexus codebase. Don't propose changes until you've read it."
- "We had a Supabase outage and lost the production DB. Use the
  CSVs in \`data/\` and the binary files in \`files/\` to walk us
  through restoring."
- "I have access to the Supabase project + Vercel + GitHub repo.
  Help me apply the next migration safely without losing data."

---
_This document ships inside every backup ZIP from \`/api/hradmin/backup/download\`.
Last reviewed: 2026-04-28._
`
}

// ─── Misc ─────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** Strip path traversal, keep Thai. Used for ZIP entry names. */
export function sanitizeForZip(name: string): string {
    return name
        .replace(/\\/g, '/')          // normalise separators
        .replace(/\.{2,}/g, '_')      // ../ → _
        .replace(/^\/+/, '')          // no absolute paths
        .replace(/[<>:"|?*\x00-\x1f]/g, '_')
        .slice(0, 200)
}

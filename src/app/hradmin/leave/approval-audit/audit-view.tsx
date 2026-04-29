'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
    AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, Search,
    UserX, Users, ArrowUpRight, Filter,
} from 'lucide-react'
import type { AuditRow, IssueCode } from './audit-data'

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
}

// Issue metadata — labels HR sees + severity bucketing.
// Critical = blocks leave submission (chain returns null) or routes to wrong person.
// Warning  = data hygiene issue that may not break submission today but will bite later.
const ISSUE_META: Record<IssueCode, { label: string; severity: 'critical' | 'warning'; help: string }> = {
    NO_APPROVER: {
        label: 'ไม่มีผู้อนุมัติ',
        severity: 'critical',
        help: 'เดินสายขึ้นไปแล้วไม่เจอใครที่ is_approver=true และ scope ครอบแผนกนี้ — ลาส่งจะไม่มีกล่องเข้า',
    },
    NO_LINK_AT_ALL: {
        label: 'ไม่มี manager/reports_to/override',
        severity: 'critical',
        help: 'ไม่มี manager_id, reports_to_id หรือ leave_approver_id เลย — ต้องเซตอย่างน้อย 1 ฟิลด์',
    },
    OVERRIDE_NOT_APPROVER: {
        label: 'override ไม่ใช่ approver',
        severity: 'critical',
        help: 'leave_approver_id ชี้ไปที่คนที่ is_approver=false → ระบบจะข้าม override และเดินสายปกติแทน',
    },
    OVERRIDE_BROKEN: {
        label: 'override พัง',
        severity: 'critical',
        help: 'leave_approver_id ชี้ไปที่พนักงานที่หาไม่เจอ หรือ status ไม่ active',
    },
    SELF_APPROVAL: {
        label: 'อนุมัติตัวเอง',
        severity: 'critical',
        help: 'สายอนุมัติวกกลับมาที่ตัวเอง — ต้องเปลี่ยนสาย',
    },
    INACTIVE_APPROVER: {
        label: 'ผู้อนุมัติ inactive',
        severity: 'critical',
        help: 'พบผู้อนุมัติที่เข้าเงื่อนไขแต่ status ไม่ active — ระบบยังส่งให้ แต่คนรับเข้าไม่ได้',
    },
    CYCLE: {
        label: 'สาย loop',
        severity: 'critical',
        help: 'reports_to_id วนกลับไปที่คนเดิมในสาย — ระบบหยุดเดินที่ 10 hop',
    },
    MANAGER_REPORTS_MISMATCH: {
        label: 'manager_id ≠ reports_to_id',
        severity: 'warning',
        help: 'ทั้ง 2 ฟิลด์ตั้งค่าแต่ไม่ตรงกัน — ระบบใช้ reports_to_id; manager_id อาจค้างจากของเก่า',
    },
}

const ALL_ISSUE_CODES = Object.keys(ISSUE_META) as IssueCode[]

interface Props {
    rows: AuditRow[]
}

export function ApprovalAuditView({ rows }: Props) {
    const [search, setSearch] = useState('')
    const [deptFilter, setDeptFilter] = useState<string>('all')
    const [issueFilter, setIssueFilter] = useState<'all' | 'any-issue' | IssueCode>('any-issue')

    const departments = useMemo(() => {
        const set = new Set<string>()
        rows.forEach(r => { if (r.employee.department) set.add(r.employee.department) })
        return Array.from(set).sort()
    }, [rows])

    const stats = useMemo(() => {
        let critical = 0
        let warnings = 0
        let healthy = 0
        rows.forEach(r => {
            const sev = severity(r.issues)
            if (sev === 'critical') critical += 1
            else if (sev === 'warning') warnings += 1
            else healthy += 1
        })
        return { total: rows.length, critical, warnings, healthy }
    }, [rows])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return rows.filter(r => {
            if (deptFilter !== 'all' && r.employee.department !== deptFilter) return false
            if (issueFilter === 'any-issue' && r.issues.length === 0) return false
            if (issueFilter !== 'all' && issueFilter !== 'any-issue' && !r.issues.includes(issueFilter as IssueCode)) return false
            if (q) {
                const hay = [
                    r.employee.first_name_th, r.employee.last_name_th, r.employee.nickname,
                    r.employee.department, r.employee.position, r.employee.employee_code,
                    r.managerName, r.reportsToName, r.overrideName, r.resolved?.name,
                ].filter(Boolean).join(' ').toLowerCase()
                if (!hay.includes(q)) return false
            }
            return true
        })
    }, [rows, deptFilter, issueFilter, search])

    return (
        <div className="space-y-4">
            {/* Header + summary */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-cyan-200" />
                        ตรวจสายอนุมัติการลา
                    </h1>
                    <p className="text-white/60 text-sm mt-1">
                        เช็คว่าพนักงานทุกคนมีสายอนุมัติที่ใช้งานได้จริง — เปรียบเทียบ manager_id, reports_to_id, leave_approver_id, และคนที่ระบบเลือกจริง
                    </p>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <StatCard label="พนักงาน active" value={stats.total} tone="neutral" />
                <StatCard label="ปัญหาวิกฤต" value={stats.critical} tone="critical" />
                <StatCard label="ควรเช็ก" value={stats.warnings} tone="warning" />
                <StatCard label="ปกติ" value={stats.healthy} tone="ok" />
            </div>

            {/* Filters */}
            <div style={glass} className="p-3">
                <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <Search className="w-4 h-4 text-white/55" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="ค้นชื่อ / ชื่อเล่น / รหัส / แผนก..."
                            className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-[14px]"
                        />
                    </div>
                    <select
                        value={deptFilter}
                        onChange={e => setDeptFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-white/8 text-white border border-white/12 text-sm"
                    >
                        <option value="all" className="text-black">ทุกแผนก</option>
                        {departments.map(d => (
                            <option key={d} value={d} className="text-black">{d}</option>
                        ))}
                    </select>
                    <select
                        value={issueFilter}
                        onChange={e => setIssueFilter(e.target.value as typeof issueFilter)}
                        className="px-3 py-2 rounded-lg bg-white/8 text-white border border-white/12 text-sm"
                    >
                        <option value="any-issue" className="text-black">เฉพาะที่มีปัญหา</option>
                        <option value="all" className="text-black">ทั้งหมด</option>
                        {ALL_ISSUE_CODES.map(code => (
                            <option key={code} value={code} className="text-black">
                                {ISSUE_META[code].label}
                            </option>
                        ))}
                    </select>
                </div>
                <p className="text-white/55 text-xs mt-2 flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> แสดง {filtered.length} จาก {rows.length} คน
                </p>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div style={glass} className="p-10 text-center text-white/55">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
                    {rows.length === 0
                        ? 'ไม่มีข้อมูลพนักงาน'
                        : issueFilter === 'any-issue'
                            ? 'ไม่พบปัญหา — สายอนุมัติทุกคนใช้งานได้'
                            : 'ไม่พบรายการตามเงื่อนไขที่เลือก'}
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(row => <AuditRowCard key={row.employee.id} row={row} />)}
                </div>
            )}
        </div>
    )
}

function severity(issues: IssueCode[]): 'critical' | 'warning' | 'ok' {
    if (issues.some(i => ISSUE_META[i].severity === 'critical')) return 'critical'
    if (issues.length > 0) return 'warning'
    return 'ok'
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'critical' | 'warning' | 'ok' }) {
    const styles: Record<typeof tone, { bg: string; border: string; text: string }> = {
        neutral:  { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', text: '#ffffff' },
        critical: { bg: 'rgba(239,68,68,0.18)',   border: 'rgba(239,68,68,0.5)',    text: '#fca5a5' },
        warning:  { bg: 'rgba(251,191,36,0.18)',  border: 'rgba(251,191,36,0.5)',   text: '#fde68a' },
        ok:       { bg: 'rgba(52,211,153,0.18)',  border: 'rgba(52,211,153,0.5)',   text: '#a7f3d0' },
    }
    const s = styles[tone]
    return (
        <div className="p-3 rounded-xl" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <div className="text-[11px] font-medium" style={{ color: s.text, opacity: 0.85 }}>{label}</div>
            <div className="text-2xl font-bold mt-0.5" style={{ color: s.text }}>{value}</div>
        </div>
    )
}

function AuditRowCard({ row }: { row: AuditRow }) {
    const sev = severity(row.issues)
    const accent = sev === 'critical'
        ? 'rgba(239,68,68,0.55)'
        : sev === 'warning'
            ? 'rgba(251,191,36,0.5)'
            : 'rgba(52,211,153,0.4)'
    const fullName = row.employee.nickname
        ? `${[row.employee.first_name_th, row.employee.last_name_th].filter(Boolean).join(' ')} (${row.employee.nickname})`
        : [row.employee.first_name_th, row.employee.last_name_th].filter(Boolean).join(' ') || '—'

    return (
        <div className="p-4 space-y-2.5" style={{ ...glass, borderLeft: `3px solid ${accent}` }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold text-[15px]">{fullName}</span>
                        {row.employee.employee_code && (
                            <span className="text-white/55 text-xs">#{row.employee.employee_code}</span>
                        )}
                        {row.employee.is_approver && (
                            <span className="text-cyan-200 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,211,238,0.18)', border: '1px solid rgba(34,211,238,0.4)' }}>
                                APPROVER
                            </span>
                        )}
                    </div>
                    <div className="text-white/65 text-xs mt-0.5">
                        {row.employee.position ?? '—'} · {row.employee.department ?? '—'}
                    </div>
                </div>
                <Link
                    href={`/hradmin/employees/${row.employee.id}`}
                    className="text-cyan-200 hover:text-white text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/10"
                >
                    แก้ไข <ArrowUpRight className="w-3 h-3" />
                </Link>
            </div>

            {/* Routing rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                <RoutingLine label="manager_id" value={row.managerName} />
                <RoutingLine label="reports_to_id" value={row.reportsToName} />
                <RoutingLine
                    label="leave_approver_id (override)"
                    value={row.overrideName}
                    suffix={row.overrideName && row.overrideIsApprover === false ? '⚠ ไม่ใช่ approver' : null}
                />
                <RoutingLine
                    label="resolved"
                    value={row.resolved ? row.resolved.name : null}
                    suffix={row.resolved ? `(${row.resolvedVia === 'override' ? 'override' : `chain · ${row.chainHops} hop`})` : null}
                    emphasised
                />
            </div>

            {/* Issues */}
            {row.issues.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {row.issues.map(code => {
                        const meta = ISSUE_META[code]
                        const isCritical = meta.severity === 'critical'
                        return (
                            <span
                                key={code}
                                title={meta.help}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                    background: isCritical ? 'rgba(239,68,68,0.22)' : 'rgba(251,191,36,0.22)',
                                    border: `1px solid ${isCritical ? 'rgba(239,68,68,0.55)' : 'rgba(251,191,36,0.55)'}`,
                                    color: isCritical ? '#fca5a5' : '#fde68a',
                                }}
                            >
                                {isCritical
                                    ? <AlertCircle className="w-3 h-3" />
                                    : <AlertTriangle className="w-3 h-3" />}
                                {meta.label}
                            </span>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function RoutingLine({ label, value, suffix, emphasised }: { label: string; value: string | null; suffix?: string | null; emphasised?: boolean }) {
    const isMissing = !value
    return (
        <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-white/45 text-[11px] font-mono shrink-0 w-[150px]">{label}</span>
            <span className={`truncate ${emphasised ? 'font-semibold' : ''}`}
                style={{ color: isMissing ? 'rgba(252,165,165,0.85)' : (emphasised ? '#a5f3fc' : 'rgba(255,255,255,0.85)') }}
            >
                {value ?? <span className="inline-flex items-center gap-1"><UserX className="w-3 h-3" />ไม่ได้ตั้งค่า</span>}
            </span>
            {suffix && <span className="text-white/55 text-[11px] truncate">{suffix}</span>}
        </div>
    )
}

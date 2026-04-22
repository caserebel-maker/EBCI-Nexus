'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
    ScrollText, Plus, Loader2, Edit3, Trash2, Power, PowerOff, Info,
    CheckCircle2, AlertCircle, X, Calculator, UserCircle, Briefcase,
    Calendar as CalendarIcon, Sparkles, Users as UsersIcon,
    ChevronDown, ChevronUp, Target, Play, History,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types (match API payloads) ────────────────────────────────────────────
interface LeaveTypeLite {
    id: string
    name_th: string
    icon: string | null
    color: string | null
    display_order: number | null
}

interface Policy {
    id: string
    leave_type_id: string
    min_level: number | null
    max_level: number | null
    min_years_service: number | null
    max_years_service: number | null
    position_pattern: string | null
    days_per_year: number
    description: string | null
    priority: number | null
    is_active: boolean | null
    created_at: string
    updated_at: string
    leave_type?: LeaveTypeLite | null
}

interface EmployeePreviewRow {
    id: string
    employee_code: string
    nickname: string | null
    first_name_th: string | null
    last_name_th: string | null
    position: string | null
    department: string | null
    approval_level: number | null
    years_service: number
    photo_url: string | null
}

interface CalculateResult {
    days: number
    policy_id: string | null
    source: 'policy' | 'default' | 'employee_not_found' | string
    policy: {
        id: string; description: string | null; days_per_year: number;
        min_level: number | null; max_level: number | null;
        min_years_service: number | null; max_years_service: number | null;
    } | null
    employee: {
        id: string; employee_code: string; full_name: string;
        position: string | null; department: string | null;
        approval_level: number | null; years_service: number;
    } | null
    year: number
}

// ── Style tokens ──────────────────────────────────────────────────────────
const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
}

// ── Helpers ───────────────────────────────────────────────────────────────
const LEVEL_OPTIONS: Array<{ value: number | null; label: string }> = [
    { value: null, label: 'ทั้งหมด' },
    { value: 1, label: 'L1' },
    { value: 2, label: 'L2' },
    { value: 3, label: 'L3' },
    { value: 4, label: 'L4 (MD)' },
    { value: 5, label: 'L5 (ประธาน)' },
]

function formatLevelRange(min: number | null, max: number | null): string {
    if (min == null && max == null) return 'ทุก Level'
    if (min != null && max != null) {
        if (min === max) return `L${min}`
        return `L${min}–L${max}`
    }
    if (min != null) return `L${min}+`
    return `≤L${max}`
}
function formatYearsRange(min: number | null, max: number | null): string {
    if (min == null && max == null) return 'ทุกอายุงาน'
    if (min != null && max != null) {
        if (min === max) return `${min} ปี`
        return `${min}–${max} ปี`
    }
    if (min != null) return `≥ ${min} ปี`
    return `≤ ${max} ปี`
}

// ── Main view ─────────────────────────────────────────────────────────────
export function PoliciesView() {
    const [policies, setPolicies] = useState<Policy[]>([])
    const [leaveTypes, setLeaveTypes] = useState<LeaveTypeLite[]>([])
    const [employees, setEmployees] = useState<EmployeePreviewRow[]>([])
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState<string | null>(null)
    const [editing, setEditing] = useState<Policy | null>(null)
    const [creating, setCreating] = useState(false)
    const [toast, setToast] = useState<string | null>(null)

    const loadAll = useCallback(async () => {
        setErr(null); setLoading(true)
        try {
            const [policiesRes, typesRes, empsRes] = await Promise.all([
                fetch('/api/hradmin/leave/policies', { cache: 'no-store' }),
                fetch('/api/leave/balance/' + new Date().getFullYear(), { cache: 'no-store' }),
                fetch('/api/hradmin/leave/policies/preview', {
                    method: 'POST', headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({}),
                }),
            ])
            if (!policiesRes.ok) throw new Error('โหลด policies ไม่สำเร็จ')
            const policiesJson = await policiesRes.json()
            const balancesJson = await typesRes.json().catch(() => ({}))
            const empsJson = await empsRes.json().catch(() => ({}))
            setPolicies(policiesJson.policies ?? [])
            setLeaveTypes(
                (balancesJson.balances ?? []).map((b: { leave_type_id: string; name_th: string; icon: string | null; color: string | null; display_order: number }) => ({
                    id: b.leave_type_id,
                    name_th: b.name_th,
                    icon: b.icon,
                    color: b.color,
                    display_order: b.display_order,
                })),
            )
            setEmployees(empsJson.employees ?? [])
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'โหลดข้อมูลไม่สำเร็จ')
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => { void loadAll() }, [loadAll])

    const showToast = (msg: string) => {
        setToast(msg)
        window.setTimeout(() => setToast(null), 4000)
    }

    const handleDelete = async (p: Policy) => {
        if (!confirm(`ลบ policy "${p.description ?? p.leave_type_id}" ใช่หรือไม่?`)) return
        try {
            const res = await fetch(`/api/hradmin/leave/policies/${p.id}`, { method: 'DELETE' })
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j?.error ?? 'ลบไม่สำเร็จ')
            }
            setPolicies(cur => cur.filter(x => x.id !== p.id))
            showToast('ลบ policy เรียบร้อย')
        } catch (e) {
            alert(e instanceof Error ? e.message : 'ลบไม่สำเร็จ')
        }
    }

    const handleToggleActive = async (p: Policy) => {
        try {
            const res = await fetch(`/api/hradmin/leave/policies/${p.id}`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ...p, is_active: !p.is_active }),
            })
            if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j?.error ?? 'อัปเดตไม่สำเร็จ')
            }
            const json = await res.json()
            setPolicies(cur => cur.map(x => x.id === p.id ? { ...x, ...json.policy } : x))
        } catch (e) {
            alert(e instanceof Error ? e.message : 'อัปเดตไม่สำเร็จ')
        }
    }

    // Group policies by leave type
    const grouped = useMemo(() => {
        const map = new Map<string, Policy[]>()
        for (const p of policies) {
            if (!map.has(p.leave_type_id)) map.set(p.leave_type_id, [])
            map.get(p.leave_type_id)!.push(p)
        }
        return map
    }, [policies])

    // Display leave types in the list: those with policies first, then all others for "empty state" rows
    const displayTypes = useMemo(() => {
        const withPolicies = leaveTypes.filter(t => grouped.has(t.id))
        const without = leaveTypes.filter(t => !grouped.has(t.id))
        return [...withPolicies, ...without]
    }, [leaveTypes, grouped])

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                        <ScrollText size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">นโยบายวันลา</h1>
                        <p className="text-sm text-white/50">
                            กำหนดสิทธิ์การลาตาม Level และอายุงาน · ระบบ auto-apply ให้พนักงาน
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#882136] hover:bg-[#a02640] text-white text-sm font-semibold rounded-lg shadow-lg shadow-[#882136]/30 transition-all active:scale-95"
                >
                    <Plus size={16} />
                    เพิ่ม Policy ใหม่
                </button>
            </div>

            {err && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                </div>
            )}

            {/* Policies list */}
            <section className="space-y-4">
                {loading && policies.length === 0 && (
                    <div className="p-10 text-center text-white/50" style={glass}>
                        <Loader2 size={26} className="mx-auto mb-2 animate-spin text-white/40" />
                        กำลังโหลด...
                    </div>
                )}
                {!loading && policies.length === 0 && (
                    <div className="p-10 text-center text-white/55" style={glass}>
                        <ScrollText size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold text-white/80 mb-1">ยังไม่มี policy</p>
                        <p className="text-sm text-white/55">กด &quot;เพิ่ม Policy ใหม่&quot; เพื่อเริ่มกำหนดสิทธิ์การลา</p>
                    </div>
                )}
                {displayTypes.filter(t => grouped.has(t.id)).map(type => {
                    const entries = grouped.get(type.id) ?? []
                    return (
                        <div key={type.id}>
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <span className="h-7 w-7 rounded-lg flex items-center justify-center text-white" style={{ background: type.color ?? '#882136' }}>
                                    <CalendarIcon size={13} />
                                </span>
                                <h2 className="text-white font-bold">{type.name_th}</h2>
                                <span className="text-xs text-white/50">· {entries.length} policy</span>
                            </div>
                            <ul className="space-y-2">
                                {entries.map(p => (
                                    <li key={p.id}>
                                        <PolicyRow
                                            policy={p}
                                            leaveType={type}
                                            onEdit={() => setEditing(p)}
                                            onDelete={() => handleDelete(p)}
                                            onToggleActive={() => handleToggleActive(p)}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </section>

            {/* Test calculate tool */}
            <CalculateCard leaveTypes={leaveTypes} employees={employees} />

            {(editing || creating) && (
                <PolicyFormModal
                    initial={editing}
                    leaveTypes={leaveTypes}
                    onClose={() => { setEditing(null); setCreating(false) }}
                    onSaved={async () => {
                        setEditing(null); setCreating(false)
                        await loadAll()
                        showToast('บันทึก policy เรียบร้อย')
                    }}
                />
            )}

            {toast && (
                <div
                    role="status"
                    className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-xl text-sm text-white font-semibold shadow-xl border border-emerald-400/40"
                    style={{ background: 'linear-gradient(135deg,#065f46 0%,#10b981 100%)' }}
                >
                    <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" />
                    {toast}
                </div>
            )}
        </div>
    )
}

// ── Policy row card ───────────────────────────────────────────────────────
function PolicyRow({
    policy, leaveType, onEdit, onDelete, onToggleActive,
}: {
    policy: Policy
    leaveType: LeaveTypeLite
    onEdit: () => void
    onDelete: () => void
    onToggleActive: () => void
}) {
    const dimmed = !policy.is_active
    return (
        <div
            className={cn(
                'p-4 flex items-start gap-4 flex-wrap transition-all',
                dimmed && 'opacity-60',
            )}
            style={glass}
        >
            <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[15px] leading-tight mb-1.5">
                    {policy.description ?? <span className="text-white/60 italic">ไม่มีคำอธิบาย</span>}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge icon={<UsersIcon size={11} />} label={formatLevelRange(policy.min_level, policy.max_level)} />
                    <Badge icon={<CalendarIcon size={11} />} label={formatYearsRange(policy.min_years_service, policy.max_years_service)} />
                    {policy.position_pattern && (
                        <Badge icon={<Briefcase size={11} />} label={`regex: ${policy.position_pattern}`} tone="advanced" />
                    )}
                    <Badge
                        icon={<Target size={11} />}
                        label={`priority ${policy.priority ?? 0}`}
                        tone="muted"
                    />
                    {!policy.is_active && <Badge icon={<PowerOff size={11} />} label="ปิดใช้งาน" tone="muted" />}
                </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
                <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums" style={{ color: leaveType.color ?? '#ffb4be' }}>
                        {policy.days_per_year}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-white/45 font-bold">วัน/ปี</p>
                </div>
                <div className="flex items-center gap-1">
                    <IconButton title={policy.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'} onClick={onToggleActive}>
                        {policy.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                    </IconButton>
                    <IconButton title="แก้ไข" onClick={onEdit}><Edit3 size={14} /></IconButton>
                    <IconButton title="ลบ" onClick={onDelete} tone="danger"><Trash2 size={14} /></IconButton>
                </div>
            </div>
        </div>
    )
}

function Badge({
    icon, label, tone = 'normal',
}: { icon?: React.ReactNode; label: string; tone?: 'normal' | 'muted' | 'advanced' }) {
    const cls = tone === 'muted'
        ? 'bg-white/5 text-white/55'
        : tone === 'advanced'
        ? 'bg-sky-500/15 text-sky-200 font-mono'
        : 'bg-white/10 text-white/80'
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold', cls)}>
            {icon}
            {label}
        </span>
    )
}

function IconButton({
    children, title, onClick, tone = 'normal',
}: { children: React.ReactNode; title: string; onClick: () => void; tone?: 'normal' | 'danger' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                'h-8 w-8 rounded-lg inline-flex items-center justify-center transition-all',
                tone === 'danger'
                    ? 'bg-red-500/15 hover:bg-red-500/30 text-red-200 hover:text-white'
                    : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white',
            )}
        >
            {children}
        </button>
    )
}

// ── Calculate tool ────────────────────────────────────────────────────────
function CalculateCard({
    leaveTypes, employees,
}: { leaveTypes: LeaveTypeLite[]; employees: EmployeePreviewRow[] }) {
    const [employeeId, setEmployeeId] = useState('')
    const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id ?? '')
    const [year, setYear] = useState(new Date().getFullYear())
    const [result, setResult] = useState<CalculateResult | null>(null)
    const [pending, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)

    useEffect(() => {
        if (!leaveTypeId && leaveTypes[0]) setLeaveTypeId(leaveTypes[0].id)
    }, [leaveTypes, leaveTypeId])

    const handleCalc = () => {
        if (!employeeId || !leaveTypeId) {
            setErr('กรุณาเลือกพนักงานและประเภทการลา'); return
        }
        setErr(null); setResult(null)
        startTransition(async () => {
            try {
                const res = await fetch('/api/hradmin/leave/policies/calculate', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ employee_id: employeeId, leave_type_id: leaveTypeId, year }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'คำนวณไม่สำเร็จ')
                setResult(json)
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'คำนวณไม่สำเร็จ')
            }
        })
    }

    return (
        <section className="p-5 sm:p-6" style={glass}>
            <h2 className="text-white font-bold inline-flex items-center gap-2 mb-4">
                <Calculator size={16} />
                ทดลองคำนวณสิทธิ์
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="sm:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">พนักงาน</label>
                    <select
                        value={employeeId}
                        onChange={e => setEmployeeId(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                    >
                        <option value="">— เลือกพนักงาน —</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>
                                {e.employee_code} · {e.first_name_th}{e.nickname ? ` (${e.nickname})` : ''} · {e.position ?? '—'} · L{e.approval_level ?? '?'} · {e.years_service} ปี
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">ประเภทการลา</label>
                    <select
                        value={leaveTypeId}
                        onChange={e => setLeaveTypeId(e.target.value)}
                        className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                    >
                        {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name_th}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">ปี</label>
                    <input
                        type="number"
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                        min={2024} max={2035}
                        className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm tabular-nums focus:outline-none focus:border-amber-300/50"
                    />
                </div>
            </div>
            <button
                type="button"
                onClick={handleCalc}
                disabled={pending}
                className="mt-4 inline-flex items-center gap-2 px-5 h-11 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-bold"
            >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                คำนวณ
            </button>
            {err && <p className="mt-3 text-red-300 text-sm">{err}</p>}
            {result && <CalculateResultCard result={result} />}
        </section>
    )
}

function CalculateResultCard({ result }: { result: CalculateResult }) {
    const isPolicy = result.source === 'policy'
    return (
        <div
            className={cn(
                'mt-4 p-4 rounded-xl border',
                isPolicy
                    ? 'border-emerald-400/30 bg-emerald-500/10'
                    : 'border-amber-400/30 bg-amber-500/10',
            )}
        >
            <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                <p className="text-[11px] uppercase tracking-wider text-white/60 font-bold">ได้สิทธิ์</p>
                <p className="text-3xl font-bold text-white tabular-nums">{result.days}</p>
                <p className="text-sm text-white/70">วัน/ปี</p>
                <span className={cn(
                    'ml-auto text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md',
                    isPolicy ? 'bg-emerald-500/30 text-emerald-100' : 'bg-amber-500/30 text-amber-100',
                )}>
                    {result.source === 'policy' ? 'จาก Policy' : 'ค่า default'}
                </span>
            </div>
            {result.employee && (
                <p className="text-xs text-white/70 inline-flex items-center gap-1.5">
                    <UserCircle size={12} />
                    {result.employee.full_name} · {result.employee.position ?? '—'} ·
                    L{result.employee.approval_level ?? '?'} · อายุงาน {result.employee.years_service} ปี
                </p>
            )}
            {result.policy && (
                <p className="text-xs text-white/65 mt-1.5 inline-flex items-start gap-1.5">
                    <Sparkles size={12} className="mt-0.5 shrink-0" />
                    Policy: <span className="text-white/85 font-semibold">{result.policy.description ?? '—'}</span>
                    <span className="text-white/40">·</span>
                    {formatLevelRange(result.policy.min_level, result.policy.max_level)} ·
                    {formatYearsRange(result.policy.min_years_service, result.policy.max_years_service)}
                </p>
            )}
            {!isPolicy && (
                <p className="text-xs text-amber-100/80 mt-1.5 inline-flex items-center gap-1.5">
                    <Info size={12} />
                    ไม่มี policy ที่ match · ใช้ค่า default จาก leave_types
                </p>
            )}
        </div>
    )
}

// ── Add/Edit modal ────────────────────────────────────────────────────────
interface PolicyFormState {
    leave_type_id: string
    description: string
    min_level: number | null
    max_level: number | null
    min_years_service: string
    max_years_service: string
    position_pattern: string
    days_per_year: string
    priority: string
    is_active: boolean
}

function PolicyFormModal({
    initial, leaveTypes, onClose, onSaved,
}: {
    initial: Policy | null
    leaveTypes: LeaveTypeLite[]
    onClose: () => void
    onSaved: () => void | Promise<void>
}) {
    const [form, setForm] = useState<PolicyFormState>(() => ({
        leave_type_id: initial?.leave_type_id ?? (leaveTypes[0]?.id ?? ''),
        description: initial?.description ?? '',
        min_level: initial?.min_level ?? null,
        max_level: initial?.max_level ?? null,
        min_years_service: initial?.min_years_service != null ? String(initial.min_years_service) : '',
        max_years_service: initial?.max_years_service != null ? String(initial.max_years_service) : '',
        position_pattern: initial?.position_pattern ?? '',
        days_per_year: initial?.days_per_year != null ? String(initial.days_per_year) : '',
        priority: initial?.priority != null ? String(initial.priority) : '0',
        is_active: initial ? (initial.is_active !== false) : true,
    }))
    const [advancedOpen, setAdvancedOpen] = useState(Boolean(initial?.position_pattern))
    const [saving, setSaving] = useState(false)
    const [err, setErr] = useState<string | null>(null)

    const [preview, setPreview] = useState<EmployeePreviewRow[] | null>(null)
    const [previewCount, setPreviewCount] = useState<number | null>(null)
    const [previewPending, startPreview] = useTransition()
    const [previewErr, setPreviewErr] = useState<string | null>(null)

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', onKey)
            document.body.style.overflow = prev
        }
    }, [onClose])

    const runPreview = () => {
        setPreviewErr(null)
        startPreview(async () => {
            try {
                const res = await fetch('/api/hradmin/leave/policies/preview', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        min_level: form.min_level,
                        max_level: form.max_level,
                        min_years_service: form.min_years_service === '' ? null : Number(form.min_years_service),
                        max_years_service: form.max_years_service === '' ? null : Number(form.max_years_service),
                        position_pattern: form.position_pattern.trim() || null,
                    }),
                })
                const json = await res.json()
                if (!res.ok) throw new Error(json?.error ?? 'Preview failed')
                setPreview(json.employees ?? [])
                setPreviewCount(json.matched_count ?? 0)
            } catch (e) {
                setPreviewErr(e instanceof Error ? e.message : 'Preview failed')
                setPreview(null); setPreviewCount(null)
            }
        })
    }

    const handleSave = async () => {
        setErr(null)
        if (!form.leave_type_id) { setErr('กรุณาเลือกประเภทการลา'); return }
        if (!form.description.trim()) { setErr('กรุณาใส่คำอธิบาย'); return }
        if (form.days_per_year === '' || Number(form.days_per_year) < 0) {
            setErr('จำนวนวันต้องเป็น 0 หรือมากกว่า'); return
        }
        setSaving(true)
        try {
            const payload = {
                leave_type_id: form.leave_type_id,
                description: form.description.trim(),
                min_level: form.min_level,
                max_level: form.max_level,
                min_years_service: form.min_years_service === '' ? null : Number(form.min_years_service),
                max_years_service: form.max_years_service === '' ? null : Number(form.max_years_service),
                position_pattern: form.position_pattern.trim() || null,
                days_per_year: Number(form.days_per_year),
                priority: form.priority === '' ? 0 : Number(form.priority),
                is_active: form.is_active,
            }
            const url = initial
                ? `/api/hradmin/leave/policies/${initial.id}`
                : '/api/hradmin/leave/policies'
            const res = await fetch(url, {
                method: initial ? 'PUT' : 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json?.error ?? 'บันทึกไม่สำเร็จ')
            await onSaved()
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-2xl max-h-[95vh] overflow-y-auto relative"
                style={{ background: 'rgba(15,4,7,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 bg-gradient-to-b from-[#15040a] to-[#15040aee] px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
                            {initial ? 'แก้ไข Policy' : 'สร้าง Policy ใหม่'}
                        </p>
                        <h2 className="text-lg font-bold text-white">นโยบายวันลา</h2>
                    </div>
                    <button onClick={onClose} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center" aria-label="ปิด">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                    {/* Leave type + description */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                            <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">ประเภทการลา *</label>
                            <select
                                value={form.leave_type_id}
                                onChange={e => setForm({ ...form, leave_type_id: e.target.value })}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            >
                                {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name_th}</option>)}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">คำอธิบาย *</label>
                            <input
                                type="text"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="เช่น L1-L2 อายุงาน 1-3 ปี"
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            />
                        </div>
                    </div>

                    {/* Conditions */}
                    <div className="rounded-xl border border-white/10 p-4 bg-white/[0.03] space-y-4">
                        <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold inline-flex items-center gap-1.5">
                            <Target size={12} /> เงื่อนไข
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] text-white/65 font-semibold mb-1">ตั้งแต่ Level</label>
                                <select
                                    value={form.min_level ?? ''}
                                    onChange={e => setForm({ ...form, min_level: e.target.value === '' ? null : Number(e.target.value) })}
                                    className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm"
                                >
                                    {LEVEL_OPTIONS.map(o => <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] text-white/65 font-semibold mb-1">ถึง Level</label>
                                <select
                                    value={form.max_level ?? ''}
                                    onChange={e => setForm({ ...form, max_level: e.target.value === '' ? null : Number(e.target.value) })}
                                    className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm"
                                >
                                    {LEVEL_OPTIONS.map(o => <option key={String(o.value)} value={o.value ?? ''}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] text-white/65 font-semibold mb-1">ตั้งแต่อายุงาน (ปี)</label>
                                <input
                                    type="number" min={0} step={1}
                                    value={form.min_years_service}
                                    onChange={e => setForm({ ...form, min_years_service: e.target.value })}
                                    placeholder="ไม่จำกัด"
                                    className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm tabular-nums"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-white/65 font-semibold mb-1">ถึงอายุงาน (ปี)</label>
                                <input
                                    type="number" min={0} step={1}
                                    value={form.max_years_service}
                                    onChange={e => setForm({ ...form, max_years_service: e.target.value })}
                                    placeholder="ไม่จำกัด"
                                    className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm tabular-nums"
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setAdvancedOpen(o => !o)}
                            className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1"
                        >
                            {advancedOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            ตัวเลือกขั้นสูง (Position pattern)
                        </button>
                        {advancedOpen && (
                            <div>
                                <label className="block text-[11px] text-white/65 font-semibold mb-1">
                                    Regex สำหรับตำแหน่ง (optional)
                                </label>
                                <input
                                    type="text"
                                    value={form.position_pattern}
                                    onChange={e => setForm({ ...form, position_pattern: e.target.value })}
                                    placeholder="เช่น หัวหน้า | ผู้จัดการ"
                                    className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm font-mono"
                                />
                                <p className="text-[10px] text-white/45 mt-1">
                                    ใช้ Postgres regex match กับ employees.position · ใช้ ^ เพื่อ match ต้นคำ เช่น ^หัวหน้า
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    <div className="rounded-xl border border-white/10 p-4 bg-white/[0.03] space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] uppercase tracking-wider text-white/55 font-bold inline-flex items-center gap-1.5">
                                <UsersIcon size={12} /> Preview: จะ match พนักงานกี่คน
                            </p>
                            <button
                                type="button"
                                onClick={runPreview}
                                disabled={previewPending}
                                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold disabled:opacity-60"
                            >
                                {previewPending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                                ดู preview
                            </button>
                        </div>
                        {previewErr && <p className="text-red-300 text-sm">{previewErr}</p>}
                        {preview && previewCount !== null && (
                            <>
                                <p className="text-sm text-white">
                                    พบ <span className="font-bold text-amber-200">{previewCount}</span> คน
                                </p>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {preview.slice(0, 30).map(e => (
                                        <div key={e.id} className="text-xs text-white/75 flex items-center gap-2">
                                            <span className="inline-block w-14 text-amber-200 font-mono tabular-nums">{e.employee_code}</span>
                                            <span className="text-white/85">{e.first_name_th}{e.nickname ? ` (${e.nickname})` : ''}</span>
                                            <span className="text-white/40">·</span>
                                            <span className="text-white/55 truncate">{e.position ?? '—'}</span>
                                            <span className="text-white/40">·</span>
                                            <span className="text-white/55">L{e.approval_level ?? '?'}</span>
                                            <span className="text-white/40">·</span>
                                            <span className="text-white/55 tabular-nums">{e.years_service} ปี</span>
                                        </div>
                                    ))}
                                    {preview.length > 30 && (
                                        <p className="text-[10px] text-white/40 pt-1">… และอีก {preview.length - 30} คน</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Result */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">จำนวนวัน/ปี *</label>
                            <input
                                type="number" min={0} max={365} step={0.5}
                                value={form.days_per_year}
                                onChange={e => setForm({ ...form, days_per_year: e.target.value })}
                                placeholder="เช่น 6"
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm tabular-nums focus:outline-none focus:border-amber-300/50"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">Priority</label>
                            <input
                                type="number" step={1}
                                value={form.priority}
                                onChange={e => setForm({ ...form, priority: e.target.value })}
                                className="w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm tabular-nums focus:outline-none focus:border-amber-300/50"
                            />
                            <p className="text-[10px] text-white/45 mt-1">ตัวเลขสูงกว่าชนะเมื่อหลาย policy match</p>
                        </div>
                        <div>
                            <label className="block text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5">สถานะ</label>
                            <button
                                type="button"
                                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                                className={cn(
                                    'w-full h-11 px-3 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2',
                                    form.is_active
                                        ? 'bg-emerald-500/90 text-white'
                                        : 'bg-white/10 text-white/60',
                                )}
                            >
                                {form.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                                {form.is_active ? 'Active' : 'Inactive'}
                            </button>
                        </div>
                    </div>

                    {err && (
                        <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            {err}
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-gradient-to-t from-[#15040a] to-transparent p-4 sm:p-5 border-t border-white/10 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 h-11 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 h-11 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-black font-bold"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    )
}

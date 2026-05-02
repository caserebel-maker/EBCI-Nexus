'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
    CalendarHeart, Plus, X, Loader2, AlertCircle, CheckCircle2,
    Search, Trash2, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    type CompDayRow, type CompDayStatus,
    COMP_DAY_STATUS_LABEL, COMP_DAY_STATUS_BADGE,
} from '@/lib/comp-days-shared'

interface EmployeeOption {
    id: string
    employee_code: string
    first_name_th: string
    last_name_th: string
    nickname: string | null
    department: string | null
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
function formatThaiDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso + 'T00:00:00')
    if (isNaN(d.getTime())) return iso
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}
function todayBangkokIso(): string {
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000)
    return now.toISOString().slice(0, 10)
}
function computeStatus(r: CompDayRow, today: string): CompDayStatus {
    if (r.voided_at) return 'voided'
    if (r.used_on) return 'used'
    if (r.expires_at && r.expires_at <= today) return 'expired'
    return 'available'
}
function displayName(e: EmployeeOption): string {
    const base = `${e.first_name_th} ${e.last_name_th}`.trim()
    return e.nickname ? `${base} (${e.nickname})` : base
}

export function CompDaysAdminView({ employees }: { employees: EmployeeOption[] }) {
    const [items, setItems] = useState<CompDayRow[]>([])
    const [loading, setLoading] = useState(true)
    const [err, setErr] = useState<string | null>(null)
    const [grantOpen, setGrantOpen] = useState(false)
    const [filterEmployee, setFilterEmployee] = useState<string>('')
    const [filterStatus, setFilterStatus] = useState<CompDayStatus | 'all'>('all')
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState<string | null>(null)

    const empMap = useMemo(() => {
        const m = new Map<string, EmployeeOption>()
        for (const e of employees) m.set(e.id, e)
        return m
    }, [employees])

    const loadAll = useCallback(async () => {
        setErr(null)
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filterEmployee) params.set('employee_id', filterEmployee)
            if (filterStatus !== 'all') params.set('status', filterStatus)
            const res = await fetch(`/api/hradmin/comp-days?${params.toString()}`, { cache: 'no-store' })
            if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ')
            const json = await res.json()
            setItems(json.items ?? [])
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
        } finally {
            setLoading(false)
        }
    }, [filterEmployee, filterStatus])

    useEffect(() => { void loadAll() }, [loadAll])

    const today = useMemo(() => todayBangkokIso(), [])

    // Apply text search client-side over employee name + reason
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return items
        return items.filter(r => {
            const emp = empMap.get(r.employee_id)
            if (emp && (
                emp.employee_code.toLowerCase().includes(q)
                || emp.first_name_th.toLowerCase().includes(q)
                || emp.last_name_th.toLowerCase().includes(q)
                || (emp.nickname?.toLowerCase().includes(q) ?? false)
            )) return true
            if (r.earned_reason?.toLowerCase().includes(q)) return true
            return false
        })
    }, [items, search, empMap])

    const handleVoid = useCallback(async (id: string) => {
        const reason = prompt('เหตุผลที่ยกเลิก (ไม่บังคับ):') ?? ''
        if (!confirm('ยกเลิกสิทธิ์นี้?')) return
        try {
            const params = new URLSearchParams({ id })
            if (reason.trim()) params.set('reason', reason.trim())
            const res = await fetch(`/api/hradmin/comp-days?${params.toString()}`, { method: 'DELETE' })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json?.error ?? 'ยกเลิกไม่สำเร็จ')
            setToast('ยกเลิกสิทธิ์เรียบร้อย')
            window.setTimeout(() => setToast(null), 3000)
            void loadAll()
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'ยกเลิกไม่สำเร็จ')
        }
    }, [loadAll])

    return (
        <div className="max-w-6xl mx-auto space-y-5 pb-10">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#882136]/60 flex items-center justify-center text-[#ad5f6c] border border-[#ad5f6c]/20">
                        <CalendarHeart size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">วันหยุดสะสม (Comp Days)</h1>
                        <p className="text-sm text-white/50">ให้สิทธิ์เมื่อพนักงานทำงานในวันหยุด — แทนการเขียนใบลาเพื่อแลกหยุด</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setGrantOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-[#882136]/40 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#561e23 0%,#ad5f6c 100%)' }}
                >
                    <Plus size={16} />
                    ให้สิทธิ์ใหม่
                </button>
            </div>

            {err && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{err}</span>
                </div>
            )}

            {/* Filters */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ค้นหา ชื่อ / รหัสพนักงาน / เหตุผล"
                        className="w-full h-9 pl-9 pr-3 rounded-md bg-black/35 text-white text-sm border border-white/10 focus:border-amber-400 focus:outline-none placeholder-white/30"
                    />
                </div>
                <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="h-9 px-3 rounded-md bg-black/35 text-white text-sm border border-white/10 focus:border-amber-400 focus:outline-none"
                >
                    <option value="">ทุกคน</option>
                    {employees.map(e => (
                        <option key={e.id} value={e.id}>{displayName(e)}</option>
                    ))}
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as CompDayStatus | 'all')}
                    className="h-9 px-3 rounded-md bg-black/35 text-white text-sm border border-white/10 focus:border-amber-400 focus:outline-none"
                >
                    <option value="all">ทุกสถานะ</option>
                    <option value="available">พร้อมใช้</option>
                    <option value="used">ใช้แล้ว</option>
                    <option value="expired">หมดอายุ</option>
                    <option value="voided">ยกเลิก</option>
                </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-white/55 border-b border-white/10">
                        <tr>
                            <th className="text-left px-3 py-2 font-semibold">พนักงาน</th>
                            <th className="text-left px-3 py-2 font-semibold">ทำงานเมื่อ</th>
                            <th className="text-left px-3 py-2 font-semibold">สถานะ</th>
                            <th className="text-left px-3 py-2 font-semibold">ใช้เมื่อ</th>
                            <th className="text-left px-3 py-2 font-semibold">หมดอายุ</th>
                            <th className="text-left px-3 py-2 font-semibold">เหตุผล</th>
                            <th className="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} className="px-3 py-8 text-center text-white/50">
                                <Loader2 size={14} className="inline animate-spin mr-2" />
                                กำลังโหลด…
                            </td></tr>
                        ) : visible.length === 0 ? (
                            <tr><td colSpan={7} className="px-3 py-8 text-center text-white/40">
                                ยังไม่มีรายการตามเงื่อนไขที่กรอง
                            </td></tr>
                        ) : (
                            visible.map(r => {
                                const emp = empMap.get(r.employee_id)
                                const status = computeStatus(r, today)
                                return (
                                    <tr key={r.id} className="border-t border-white/5">
                                        <td className="px-3 py-2.5 text-white">
                                            <p className="font-semibold">{emp ? displayName(emp) : r.employee_id}</p>
                                            {emp?.department && <p className="text-[11px] text-white/50">{emp.department}</p>}
                                        </td>
                                        <td className="px-3 py-2.5 text-white/85">{formatThaiDate(r.worked_on)}</td>
                                        <td className="px-3 py-2.5">
                                            <span className={cn(
                                                'inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold',
                                                COMP_DAY_STATUS_BADGE[status],
                                            )}>
                                                {COMP_DAY_STATUS_LABEL[status]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-white/70">{r.used_on ? formatThaiDate(r.used_on) : '—'}</td>
                                        <td className="px-3 py-2.5 text-white/70">{r.expires_at ? formatThaiDate(r.expires_at) : '—'}</td>
                                        <td className="px-3 py-2.5 text-white/60 max-w-[280px] truncate">{r.earned_reason ?? '—'}</td>
                                        <td className="px-3 py-2.5 text-right">
                                            {status === 'available' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleVoid(r.id)}
                                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-300 transition-colors"
                                                    title="ยกเลิกสิทธิ์"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {grantOpen && (
                <GrantCompDayModal
                    employees={employees}
                    onClose={() => setGrantOpen(false)}
                    onSuccess={(msg) => {
                        setGrantOpen(false)
                        setToast(msg)
                        window.setTimeout(() => setToast(null), 4000)
                        void loadAll()
                    }}
                />
            )}

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm shadow-2xl inline-flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {toast}
                </div>
            )}
        </div>
    )
}

function GrantCompDayModal({
    employees, onClose, onSuccess,
}: {
    employees: EmployeeOption[]
    onClose: () => void
    onSuccess: (msg: string) => void
}) {
    const [employeeId, setEmployeeId] = useState('')
    const [workedOn, setWorkedOn] = useState(todayBangkokIso())
    const [earnedReason, setEarnedReason] = useState('')
    const [expiresAt, setExpiresAt] = useState('')
    const [submitting, startTransition] = useTransition()
    const [err, setErr] = useState<string | null>(null)

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

    const handleSubmit = () => {
        if (!employeeId) { setErr('เลือกพนักงาน'); return }
        if (!workedOn) { setErr('เลือกวันที่ทำงาน'); return }
        setErr(null)
        startTransition(async () => {
            try {
                const res = await fetch('/api/hradmin/comp-days', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        employeeId,
                        workedOn,
                        earnedReason: earnedReason.trim() || null,
                        expiresAt: expiresAt || null,
                    }),
                })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(json?.error ?? 'ให้สิทธิ์ไม่สำเร็จ')
                const emp = employees.find(e => e.id === employeeId)
                onSuccess(`ให้สิทธิ์${emp ? ` ${displayName(emp)}` : ''}เรียบร้อย`)
            } catch (e) {
                setErr(e instanceof Error ? e.message : 'ให้สิทธิ์ไม่สำเร็จ')
            }
        })
    }

    return (
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-md max-h-[95vh] overflow-y-auto"
                style={{ background: 'rgba(86,30,35,0.77)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">ให้สิทธิ์วันหยุดสะสม</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center"
                        aria-label="ปิด"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            พนักงาน <span className="text-red-300">*</span>
                        </span>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400"
                        >
                            <option value="">— เลือก —</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{displayName(e)}{e.department ? ` · ${e.department}` : ''}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            วันที่ทำงาน (วันหยุด) <span className="text-red-300">*</span>
                        </span>
                        <input
                            type="date"
                            value={workedOn}
                            onChange={(e) => setWorkedOn(e.target.value)}
                            className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400"
                        />
                    </label>
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            เหตุผล / โปรเจ็ค (ไม่บังคับ)
                        </span>
                        <input
                            type="text"
                            value={earnedReason}
                            onChange={(e) => setEarnedReason(e.target.value)}
                            placeholder="เช่น Stock check ปีใหม่ · งาน expo"
                            maxLength={300}
                            className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400 placeholder-white/30"
                        />
                    </label>
                    <label className="block">
                        <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold">
                            วันหมดอายุ (ไม่บังคับ)
                        </span>
                        <input
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/35 text-white text-base focus:outline-none border border-white/10 focus:border-amber-400"
                        />
                        <span className="text-[11px] text-white/45 mt-1 inline-flex items-center gap-1">
                            <Info size={11} />
                            เว้นว่าง = ไม่หมดอายุ
                        </span>
                    </label>
                    {err && (
                        <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm inline-flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            {err}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-semibold"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black text-sm font-bold active:scale-95"
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        ให้สิทธิ์
                    </button>
                </div>
            </div>
        </div>
    )
}

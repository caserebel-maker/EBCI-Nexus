'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
    Plus, Pencil, Trash2, X, CalendarDays, Loader2, Megaphone,
    List as ListIcon, LayoutGrid, ChevronLeft, ChevronRight,
} from 'lucide-react'

interface Holiday {
    id: string
    date: string
    name: string
    type: string
    year: number
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 1 + i)

// Calendar entry types — these are the four `holidays.type` values the UI
// renders today. Display label + chip color per type. Anything outside this
// map falls through to the "company" preset so legacy/imported data still
// shows up gracefully (e.g. early 2026 seed inserted `religious` rows that
// were not in the old 2-type map).
const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    public:    { label: 'นักขัตฤกษ์',     color: '#F87171' },
    religious: { label: 'วันสำคัญทางศาสนา', color: '#F472B6' },
    company:   { label: 'บริษัทกำหนด',    color: '#60A5FA' },
    wfh:       { label: 'WFH',            color: '#34D399' },
}
const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'public',    label: 'นักขัตฤกษ์ (วันหยุด)' },
    { value: 'religious', label: 'วันสำคัญทางศาสนา (วันหยุด)' },
    { value: 'company',   label: 'บริษัทกำหนด (วันหยุด)' },
    { value: 'wfh',       label: 'WFH (ทำงานที่บ้าน)' },
]

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

function formatThaiDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-')
    return `${parseInt(d)} ${THAI_MONTHS[parseInt(m) - 1]} ${parseInt(y) + 543}`
}

const emptyForm = { date: '', name: '', type: 'public' }

export default function HolidaysPage() {
    const [year, setYear] = useState(CURRENT_YEAR)
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Holiday | null>(null)
    const [form, setForm] = useState(emptyForm)
    const [saving, setSaving] = useState(false)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
    /** Calendar view month cursor — independent of `year` (the year filter
     *  used by the list view). When the year changes we snap month back to 0. */
    const [calMonth, setCalMonth] = useState(new Date().getMonth())

    const fetchHolidays = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/holidays?year=${year}`)
            const json = await res.json()
            setHolidays(json.data ?? [])
        } catch { /* fail silently */ }
        finally { setLoading(false) }
    }, [year])

    useEffect(() => { fetchHolidays() }, [fetchHolidays])

    function openAdd() {
        setEditTarget(null)
        setForm(emptyForm)
        setModalOpen(true)
    }

    function openEdit(h: Holiday) {
        setEditTarget(h)
        setForm({ date: h.date, name: h.name, type: h.type })
        setModalOpen(true)
    }

    async function handleSave() {
        if (!form.date || !form.name) return
        setSaving(true)
        try {
            const url = editTarget ? `/api/holidays/${editTarget.id}` : '/api/holidays'
            const method = editTarget ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) throw new Error()
            setModalOpen(false)
            fetchHolidays()
        } catch {
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id: string) {
        setDeleteId(id)
        try {
            const res = await fetch(`/api/holidays/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error()
            setHolidays(prev => prev.filter(h => h.id !== id))
        } catch {
            alert('ลบไม่สำเร็จ')
        } finally {
            setDeleteId(null)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                        <CalendarDays size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-xl">ปฏิทินบริษัท</h1>
                        <p className="text-white/50 text-sm">วันหยุด · วันสำคัญ · WFH · {holidays.length} รายการ</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Quick path for short-notice WFH announcements:
                        bulk-create N days + send notifications + create
                        announcement, all in one click. */}
                    <Link
                        href="/hradmin/holidays/wfh-announce"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 border border-blue-500/40"
                        style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}
                    >
                        <Megaphone size={16} /> ประกาศ WFH พิเศษ
                    </Link>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #882136, #c0392b)' }}
                    >
                        <Plus size={16} /> เพิ่มรายการ
                    </button>
                </div>
            </div>

            {/* Year filter + view toggle */}
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-white/60 text-sm">ปี:</span>
                <div className="flex gap-2">
                    {YEARS.map(y => (
                        <button
                            key={y}
                            onClick={() => { setYear(y); setCalMonth(new Date().getMonth()) }}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                y === year
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/50 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {y + 543}
                        </button>
                    ))}
                </div>
                {/* View toggle — pushed to the right */}
                <div className="ml-auto inline-flex rounded-lg border border-white/15 bg-black/20 p-0.5">
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                            viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/55 hover:text-white'
                        }`}
                        title="มุมมองรายการ"
                    >
                        <ListIcon size={13} /> รายการ
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('calendar')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                            viewMode === 'calendar' ? 'bg-white/20 text-white' : 'text-white/55 hover:text-white'
                        }`}
                        title="มุมมองปฏิทิน"
                    >
                        <LayoutGrid size={13} /> ปฏิทิน
                    </button>
                </div>
            </div>

            {/* Calendar view (month grid) */}
            {viewMode === 'calendar' && (
                <CalendarMonthView
                    year={year}
                    month={calMonth}
                    onMonthChange={setCalMonth}
                    holidays={holidays}
                    loading={loading}
                    onEdit={openEdit}
                />
            )}

            {/* Table view */}
            {viewMode === 'list' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 size={24} className="text-white/50 animate-spin" />
                    </div>
                ) : holidays.length === 0 ? (
                    <div className="text-center py-16 text-white/40">
                        <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm">ยังไม่มีรายการในปฏิทินสำหรับปี {year + 543}</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th className="text-left px-4 py-3 text-white/50 text-xs font-semibold uppercase tracking-wider">วันที่</th>
                                <th className="text-left px-4 py-3 text-white/50 text-xs font-semibold uppercase tracking-wider">ชื่อวันหยุด</th>
                                <th className="text-left px-4 py-3 text-white/50 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">ประเภท</th>
                                <th className="px-4 py-3 w-24" />
                            </tr>
                        </thead>
                        <tbody>
                            {holidays.map((h, idx) => {
                                const cfg = TYPE_CONFIG[h.type] ?? TYPE_CONFIG.company
                                return (
                                    <tr key={h.id}
                                        className="transition-colors hover:bg-white/5"
                                        style={{ borderBottom: idx < holidays.length - 1 ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                                    >
                                        <td className="px-4 py-3 text-white/80 text-sm whitespace-nowrap">{formatThaiDate(h.date)}</td>
                                        <td className="px-4 py-3 text-white font-medium text-sm">{h.name}</td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                                style={{ background: `${cfg.color}22`, color: cfg.color }}>
                                                {cfg.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEdit(h)}
                                                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(h.id)}
                                                    disabled={deleteId === h.id}
                                                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                >
                                                    {deleteId === h.id
                                                        ? <Loader2 size={14} className="animate-spin" />
                                                        : <Trash2 size={14} />
                                                    }
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            )}

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setModalOpen(false)}>
                    <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
                        style={{ background: 'rgba(20,5,8,0.96)', border: '1px solid rgba(255,255,255,0.15)' }}
                        onClick={e => e.stopPropagation()}>

                        <div className="flex items-center justify-between">
                            <h2 className="text-white font-bold text-lg">
                                {editTarget ? 'แก้ไขรายการ' : 'เพิ่มรายการในปฏิทิน'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="text-white/40 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-1.5">วันที่</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm"
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                                />
                            </div>
                            <div>
                                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-1.5">ชื่อรายการ</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="เช่น วันสงกรานต์ · WFH ทุกศุกร์"
                                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25"
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                                />
                            </div>
                            <div>
                                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-1.5">ประเภท</label>
                                <select
                                    value={form.type}
                                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                    className="w-full rounded-xl px-3 py-2.5 text-white text-sm"
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
                                >
                                    {TYPE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value} style={{ background: '#1a0a0d' }}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-colors"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.date || !form.name}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #882136, #c0392b)' }}
                            >
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                {editTarget ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Calendar month view ─────────────────────────────────────────────────────
/**
 * Month grid showing every holiday/WFH/special day in a single view.
 * Cells render up to 2 colored chips (label = holiday name) — anything
 * beyond 2 collapses into "+N more" so a busy month doesn't blow out the
 * row height. Hover/click reveals all entries for that day.
 *
 * Click a chip → openEdit() so the existing edit modal handles the
 * mutation. Add-day still goes through the "+ เพิ่มรายการ" header CTA.
 */
function CalendarMonthView({
    year, month, onMonthChange, holidays, loading, onEdit,
}: {
    year: number
    month: number   // 0-indexed
    onMonthChange: (m: number) => void
    holidays: Holiday[]
    loading: boolean
    onEdit: (h: Holiday) => void
}) {
    // Group holidays by date for O(1) lookup per cell.
    const byDate = useMemo(() => {
        const m = new Map<string, Holiday[]>()
        for (const h of holidays) {
            const arr = m.get(h.date) ?? []
            arr.push(h)
            m.set(h.date, arr)
        }
        return m
    }, [holidays])

    // Build the grid cells (leading nulls so day 1 lines up under the
    // correct weekday column; trailing nulls so we always render full weeks).
    const firstDow = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: Array<number | null> = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    const todayStr = useMemo(() => {
        const t = new Date()
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
    }, [])

    const monthKey = (d: number) =>
        `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    const goPrev = () => {
        if (month === 0) onMonthChange(11)
        else onMonthChange(month - 1)
    }
    const goNext = () => {
        if (month === 11) onMonthChange(0)
        else onMonthChange(month + 1)
    }

    return (
        <div className="rounded-2xl p-3 sm:p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {/* Month header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={goPrev}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white"
                    aria-label="เดือนก่อนหน้า"
                >
                    <ChevronLeft size={16} />
                </button>
                <p className="text-white font-bold text-base">
                    {THAI_MONTHS[month]} {year + 543}
                </p>
                <button
                    onClick={goNext}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-white"
                    aria-label="เดือนถัดไป"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wider text-white/70 font-bold">
                {['อา','จ','อ','พ','พฤ','ศ','ส'].map((d, i) => (
                    <div key={i} className={`py-1.5 ${i === 0 || i === 6 ? 'text-amber-200' : ''}`}>{d}</div>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={20} className="text-white/50 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-1.5">
                    {cells.map((d, i) => {
                        if (d === null) {
                            return <div key={i} className="min-h-[110px] rounded-md bg-white/[0.02]" />
                        }
                        const key = monthKey(d)
                        const events = byDate.get(key) ?? []
                        const isToday = key === todayStr
                        const dow = (firstDow + d - 1) % 7
                        const isWeekend = dow === 0 || dow === 6
                        return (
                            <div
                                key={i}
                                className={`min-h-[110px] rounded-md p-2 flex flex-col gap-1.5 transition-colors ${
                                    isToday
                                        ? 'bg-amber-400/15 border border-amber-400/60'
                                        : 'bg-white/[0.07] border border-white/15 hover:bg-white/[0.11]'
                                }`}
                            >
                                <span className={`text-base font-bold tabular-nums leading-none ${
                                    isToday ? 'text-amber-200'
                                        : isWeekend ? 'text-amber-200'
                                        : 'text-white'
                                }`}>
                                    {d}
                                </span>
                                <div className="flex flex-col gap-1 overflow-hidden">
                                    {events.slice(0, 2).map(h => {
                                        const cfg = TYPE_CONFIG[h.type] ?? TYPE_CONFIG.company
                                        return (
                                            <button
                                                key={h.id}
                                                type="button"
                                                onClick={() => onEdit(h)}
                                                title={`${h.name} — แตะเพื่อแก้ไข`}
                                                className="text-left text-sm font-semibold text-white px-1.5 py-1 rounded leading-tight truncate hover:brightness-125"
                                                style={{
                                                    background: `${cfg.color}55`,
                                                    borderLeft: `3px solid ${cfg.color}`,
                                                }}
                                            >
                                                {h.type === 'wfh' && '🏠 '}{h.name}
                                            </button>
                                        )
                                    })}
                                    {events.length > 2 && (
                                        <span className="text-xs font-semibold text-white/75 px-1 leading-tight">
                                            +{events.length - 2} อื่น
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Legend */}
            <div className="pt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {Object.entries(TYPE_CONFIG).map(([t, cfg]) => (
                    <span key={t} className="inline-flex items-center gap-1.5">
                        <span className="h-3 w-3 rounded-sm" style={{ background: cfg.color }} />
                        <span className="text-white/85 font-medium">{cfg.label}</span>
                    </span>
                ))}
            </div>
        </div>
    )
}

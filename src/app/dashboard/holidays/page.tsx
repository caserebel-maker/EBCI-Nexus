'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, CalendarOff, Loader2 } from 'lucide-react'

interface Holiday {
    id: string
    date: string
    name: string
    type: string
    year: number
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 1 + i)

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    public:  { label: 'นักขัตฤกษ์',      color: '#F87171' },
    company: { label: 'บริษัทกำหนด',    color: '#60A5FA' },
}

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
                        <CalendarOff size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-xl">จัดการวันหยุด</h1>
                        <p className="text-white/50 text-sm">{holidays.length} รายการ</p>
                    </div>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #882136, #c0392b)' }}
                >
                    <Plus size={16} /> เพิ่มวันหยุด
                </button>
            </div>

            {/* Year filter */}
            <div className="flex items-center gap-3">
                <span className="text-white/60 text-sm">ปี:</span>
                <div className="flex gap-2">
                    {YEARS.map(y => (
                        <button
                            key={y}
                            onClick={() => setYear(y)}
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
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <Loader2 size={24} className="text-white/50 animate-spin" />
                    </div>
                ) : holidays.length === 0 ? (
                    <div className="text-center py-16 text-white/40">
                        <CalendarOff size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm">ไม่มีวันหยุดสำหรับปี {year + 543}</p>
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
                                {editTarget ? 'แก้ไขวันหยุด' : 'เพิ่มวันหยุด'}
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
                                <label className="text-white/60 text-xs font-semibold uppercase tracking-wider block mb-1.5">ชื่อวันหยุด</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="เช่น วันสงกรานต์"
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
                                    <option value="public" style={{ background: '#1a0a0d' }}>นักขัตฤกษ์</option>
                                    <option value="company" style={{ background: '#1a0a0d' }}>บริษัทกำหนด</option>
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
                                {editTarget ? 'บันทึกการแก้ไข' : 'เพิ่มวันหยุด'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

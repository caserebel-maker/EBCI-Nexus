'use client'

import { useState } from 'react'
import { X, Calendar, Download } from 'lucide-react'
import type { ReportEmployeeOption } from '../reports/actions'

interface ExportAttendanceModalProps {
    open: boolean
    onClose: () => void
    employees: ReportEmployeeOption[]
}

type ExportType = 'date' | 'range' | 'month' | 'preset'

export function ExportAttendanceModal({ open, onClose, employees }: ExportAttendanceModalProps) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    const [exportType, setExportType] = useState<ExportType>('date')
    const [selectedDate, setSelectedDate] = useState(today)
    
    // Range state
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(1) // First day of current month
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    })
    const [endDate, setEndDate] = useState(today)

    // Month state (YYYY-MM)
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date()
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        return `${y}-${m}`
    })

    // Preset state (months count)
    const [selectedPreset, setSelectedPreset] = useState('1')
    const [employeeId, setEmployeeId] = useState('')

    if (!open) return null

    const handleExport = () => {
        let from = ''
        let to = ''

        if (exportType === 'date') {
            from = selectedDate
            to = selectedDate
        } else if (exportType === 'range') {
            from = startDate
            to = endDate
        } else if (exportType === 'month') {
            const [yr, mon] = selectedMonth.split('-').map(Number)
            from = `${yr}-${String(mon).padStart(2, '0')}-01`
            const lastDay = new Date(yr, mon, 0).getDate()
            to = `${yr}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        } else if (exportType === 'preset') {
            const end = new Date()
            const start = new Date()
            // Set to N months ago (inclusive of current month)
            start.setMonth(start.getMonth() - (Number(selectedPreset) - 1))
            start.setDate(1)
            
            const pad = (n: number) => String(n).padStart(2, '0')
            from = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
            to = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
        }

        if (!from || !to) return

        // Open download in a new window/tab to trigger browser download
        const params = new URLSearchParams({
            from,
            to,
            _ts: String(Date.now()),
        })
        if (employeeId) params.set('employeeId', employeeId)
        const url = `/api/hradmin/attendance/export?${params.toString()}`
        window.open(url, '_blank')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                style={{
                    background: 'linear-gradient(160deg, rgba(60,15,20,0.98) 0%, rgba(80,25,30,0.96) 100%)',
                    backdropFilter: 'blur(16px)'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h3 className="font-bold text-white flex items-center gap-2 text-base">
                        <Download size={18} className="text-emerald-300" />
                        ดาวน์โหลด Summary Report
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="ปิด"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-5 space-y-4 font-sans">
                    <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs leading-relaxed text-emerald-50">
                        รวมข้อมูลเช็คอิน แตะบัตร ลา WFH วันหยุด ขาด มาสาย และจุดที่ควรตรวจสอบ แบบ 1 แถวต่อพนักงานต่อวัน
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/50">พนักงาน</label>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                            <option value="" className="bg-slate-900">พนักงานทั้งหมด</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id} className="bg-slate-900">
                                    {emp.employeeCode ? `${emp.employeeCode} · ` : ''}{emp.employeeName}{emp.nickname ? ` (${emp.nickname})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Select Export Type */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/50">เลือกช่วงข้อมูล</label>
                        <select
                            value={exportType}
                            onChange={(e) => setExportType(e.target.value as ExportType)}
                            className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                            <option value="date" className="bg-slate-900">เฉพาะวันที่เลือก</option>
                            <option value="range" className="bg-slate-900">กำหนดช่วงวันที่</option>
                            <option value="month" className="bg-slate-900">เลือกทั้งเดือน</option>
                            <option value="preset" className="bg-slate-900">ย้อนหลัง 1-12 เดือน</option>
                        </select>
                    </div>

                    {/* Conditional Input Rendering */}
                    {exportType === 'date' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-white/50">วันที่ต้องการ</label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                />
                            </div>
                        </div>
                    )}

                    {exportType === 'range' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-white/50">วันที่เริ่มต้น</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-white/50">วันที่สิ้นสุด</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                                />
                            </div>
                        </div>
                    )}

                    {exportType === 'month' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-white/50">เดือนที่ต้องการ</label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono"
                            />
                        </div>
                    )}

                    {exportType === 'preset' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-white/50">จำนวนเดือนย้อนหลัง</label>
                            <select
                                value={selectedPreset}
                                onChange={(e) => setSelectedPreset(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                            >
                                {Array.from({ length: 12 }, (_, index) => index + 1).map(months => (
                                    <option key={months} value={months} className="bg-slate-900">
                                        {months === 1 ? '1 เดือน (เดือนปัจจุบัน)' : `${months} เดือนล่าสุด`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 px-5 py-4 bg-white/5 border-t border-white/10">
                    <button
                        onClick={handleExport}
                        className="flex-1 h-10 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25"
                    >
                        <Download size={15} />
                        ดาวน์โหลด Summary CSV
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 h-10 rounded-lg text-sm font-medium border border-white/10 hover:bg-white/5 text-white/80 transition-colors"
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    )
}

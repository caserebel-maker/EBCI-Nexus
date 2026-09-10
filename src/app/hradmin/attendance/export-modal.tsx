'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Download, Loader2, FileSpreadsheet, BarChart2, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { ReportEmployeeOption } from '../reports/actions'
import { getAttendanceReport } from '../reports/actions'

interface ExportAttendanceModalProps {
    open: boolean
    onClose: () => void
    employees: ReportEmployeeOption[]
    currentDate?: string
}

type ExportType = 'date' | 'range' | 'month' | 'preset'
type ReportFormat = 'detailed' | 'summary'

export function ExportAttendanceModal({ open, onClose, employees, currentDate }: ExportAttendanceModalProps) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
    const initialDate = currentDate || today
    
    const [reportFormat, setReportFormat] = useState<ReportFormat>('detailed')
    const [exportType, setExportType] = useState<ExportType>('month')
    const [selectedDate, setSelectedDate] = useState(initialDate)
    
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
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadError, setDownloadError] = useState<string | null>(null)

    // Sync selectedDate when currentDate changes or modal opens
    useEffect(() => {
        if (currentDate) {
            setSelectedDate(currentDate)
        }
    }, [currentDate, open])

    if (!open) return null

    const handleExport = async () => {
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

        setIsDownloading(true)
        setDownloadError(null)

        try {
            if (reportFormat === 'detailed') {
                // Detailed audit report (1 row per employee per day, 50+ columns)
                const params = new URLSearchParams({
                    from,
                    to,
                    _ts: String(Date.now()),
                })
                if (employeeId) params.set('employeeId', employeeId)
                const url = `/api/hradmin/attendance/export?${params.toString()}`

                const res = await fetch(url)
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}))
                    throw new Error(errData.error || `เกิดข้อผิดพลาดในการดาวน์โหลด (${res.status})`)
                }

                const blob = await res.blob()
                const blobUrl = window.URL.createObjectURL(blob)
                
                const disposition = res.headers.get('content-disposition')
                let filename = `attendance_summary_report_${from}_to_${to}.csv`
                if (disposition && disposition.includes('filename=')) {
                    const match = disposition.match(/filename="?([^"]+)"?/)
                    if (match && match[1]) filename = match[1]
                }

                const a = document.createElement('a')
                a.href = blobUrl
                a.download = filename
                document.body.appendChild(a)
                a.click()
                a.remove()
                window.URL.revokeObjectURL(blobUrl)
                onClose()
            } else {
                // Summary overview report (same as sidebar "ส่งออกข้อมูล (CSV)")
                const res = await getAttendanceReport(from, to, undefined, employeeId || undefined)
                if ('error' in res) {
                    throw new Error(res.error)
                }

                const header = [
                    'รหัส', 'ชื่อ-นามสกุล', 'แผนก',
                    'เข้าออฟฟิศ', 'WFH', 'Off-site', 'รวม',
                    'มาสาย', 'ลา', 'ขาดงาน', 'วันทำงาน', 'ช่วงเวลา', 'หมายเหตุระบบ',
                ]
                const rangeLabel = `${res.fromDate} ถึง ${res.toDate}`
                const rows = [
                    header,
                    ...res.rows.map(r => [
                        r.employeeCode,
                        r.employeeName,
                        r.department ?? '',
                        String(r.officeDays),
                        String(r.wfhDays),
                        String(r.offsiteDays),
                        String(r.totalDays),
                        String(r.lateDays),
                        String(r.leaveDays),
                        String(r.absentDays),
                        String(res.workdays),
                        rangeLabel,
                        r.systemNote ?? '',
                    ]),
                ]
                const filename = res.month && res.year
                    ? `attendance_${res.rows.length === 1 ? `${res.rows[0].employeeCode}_` : ''}${res.year}_${String(res.month).padStart(2, '0')}.csv`
                    : `attendance_${res.rows.length === 1 ? `${res.rows[0].employeeCode}_` : ''}${res.fromDate}_to_${res.toDate}.csv`

                const csv = rows.map(r => r.map(c => `"${(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv; charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = filename
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
                onClose()
            }
        } catch (err: any) {
            console.error('Export download failed:', err)
            setDownloadError(err.message || 'เกิดข้อผิดพลาดในการส่งออกข้อมูล กรุณาลองใหม่อีกครั้ง')
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                style={{
                    background: 'linear-gradient(160deg, rgba(60,15,20,0.98) 0%, rgba(80,25,30,0.96) 100%)',
                    backdropFilter: 'blur(16px)'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h3 className="font-bold text-white flex items-center gap-2 text-base">
                        <Download size={18} className="text-emerald-300" />
                        ส่งออกรายงานการเข้างาน (CSV)
                    </h3>
                    <button 
                        onClick={onClose} 
                        disabled={isDownloading}
                        className="text-white/60 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label="ปิด"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-5 space-y-4 font-sans max-h-[80vh] overflow-y-auto">
                    {/* Error Banner */}
                    {downloadError && (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-500/15 p-3 text-xs text-rose-200 flex items-start gap-2">
                            <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="font-semibold">ดาวน์โหลดไม่สำเร็จ</div>
                                <div>{downloadError}</div>
                            </div>
                        </div>
                    )}

                    {/* Report Format Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-white/70">เลือกรูปแบบรายงาน</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setReportFormat('detailed')}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                    reportFormat === 'detailed'
                                        ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-md shadow-emerald-500/20'
                                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center gap-2 font-medium text-xs mb-1 text-emerald-300">
                                    <FileSpreadsheet size={15} />
                                    <span>บันทึกละเอียดรายวัน</span>
                                </div>
                                <div className="text-[11px] text-white/50 leading-relaxed">
                                    1 แถวต่อวันต่อคน แสดงเวลาบัตร/มือถือ ลา WFH สาย ขาด (50+ คอลัมน์)
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setReportFormat('summary')}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                    reportFormat === 'summary'
                                        ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-md shadow-emerald-500/20'
                                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center gap-2 font-medium text-xs mb-1 text-emerald-300">
                                    <BarChart2 size={15} />
                                    <span>สรุปภาพรวมพนักงาน</span>
                                </div>
                                <div className="text-[11px] text-white/50 leading-relaxed">
                                    1 แถวต่อคน รวมวันเข้าออฟฟิศ, WFH, ลา, ขาด, สาย (เหมือนเมนูด้านข้าง)
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Employee Filter */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/70">พนักงาน</label>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            disabled={isDownloading}
                            className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                        >
                            <option value="" className="bg-slate-900">พนักงานทุกคน (ทั้งบริษัท)</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id} className="bg-slate-900">
                                    {emp.employeeCode ? `${emp.employeeCode} · ` : ''}{emp.employeeName}{emp.nickname ? ` (${emp.nickname})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Select Export Type */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-white/70">เลือกช่วงข้อมูล</label>
                            {currentDate && currentDate !== today && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExportType('date')
                                        setSelectedDate(currentDate)
                                    }}
                                    className="text-[11px] text-emerald-300 hover:text-emerald-200 underline transition-colors cursor-pointer"
                                >
                                    ใช้วันที่กำลังดู ({currentDate})
                                </button>
                            )}
                        </div>
                        <select
                            value={exportType}
                            onChange={(e) => setExportType(e.target.value as ExportType)}
                            disabled={isDownloading}
                            className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                        >
                            <option value="month" className="bg-slate-900">เลือกทั้งเดือน</option>
                            <option value="date" className="bg-slate-900">เฉพาะวันที่เลือก</option>
                            <option value="range" className="bg-slate-900">กำหนดช่วงวันที่ (จาก - ถึง)</option>
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
                                    disabled={isDownloading}
                                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-50"
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
                                    disabled={isDownloading}
                                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-white/50">วันที่สิ้นสุด</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    disabled={isDownloading}
                                    className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-50"
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
                                disabled={isDownloading}
                                className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-50"
                            />
                        </div>
                    )}

                    {exportType === 'preset' && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-white/50">จำนวนเดือนย้อนหลัง</label>
                            <select
                                value={selectedPreset}
                                onChange={(e) => setSelectedPreset(e.target.value)}
                                disabled={isDownloading}
                                className="w-full h-10 px-3 rounded-lg border border-white/15 bg-black/40 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50"
                            >
                                {Array.from({ length: 12 }, (_, index) => index + 1).map(months => (
                                    <option key={months} value={months} className="bg-slate-900">
                                        {months === 1 ? '1 เดือน (เดือนปัจจุบัน)' : `${months} เดือนล่าสุด`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Navigation Link to Sidebar Reports */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                        <span>ต้องการดูตารางพร้อมกราฟ?</span>
                        <Link
                            href="/hradmin/reports?tab=attendance"
                            onClick={onClose}
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline transition-colors font-medium"
                        >
                            เปิดหน้ารายงาน (เมนูด้านข้าง) <ExternalLink size={12} />
                        </Link>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 px-5 py-4 bg-white/5 border-t border-white/10">
                    <button
                        onClick={handleExport}
                        disabled={isDownloading}
                        className="flex-1 h-10 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-900 transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>กำลังสร้างไฟล์ CSV...</span>
                            </>
                        ) : (
                            <>
                                <Download size={15} />
                                <span>ดาวน์โหลด CSV</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isDownloading}
                        className="px-4 h-10 rounded-lg text-sm font-medium border border-white/10 hover:bg-white/5 text-white/80 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    )
}


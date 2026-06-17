'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Calendar, Clock, CreditCard, ChevronLeft, ChevronRight, RefreshCw, FileSpreadsheet, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCardScans, type CardScanWithEmployee } from './actions'

interface Props {
    initialData: {
        success: boolean
        scans: CardScanWithEmployee[]
        totalCount: number
        page: number
        totalPages: number
        fetchedAt: string
    } | null
}

export function CardScansView({ initialData }: Props) {
    const [scans, setScans] = useState<CardScanWithEmployee[]>(initialData?.scans ?? [])
    const [totalCount, setTotalCount] = useState(initialData?.totalCount ?? 0)
    const [page, setPage] = useState(initialData?.page ?? 1)
    const [totalPages, setTotalPages] = useState(initialData?.totalPages ?? 0)
    const [fetchedAt, setFetchedAt] = useState(initialData?.fetchedAt ?? new Date().toISOString())

    const [search, setSearch] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [scanType, setScanType] = useState('all')

    const [isPending, startTransition] = useTransition()
    const [expandedScanId, setExpandedScanId] = useState<string | null>(null)

    const fetchScans = (targetPage: number) => {
        startTransition(async () => {
            const res = await getCardScans({
                search,
                startDate,
                endDate,
                scanType,
                page: targetPage,
                limit: 50
            })
            if (res.success && res.scans) {
                setScans(res.scans)
                setTotalCount(res.totalCount)
                setPage(res.page)
                setTotalPages(res.totalPages)
                setFetchedAt(res.fetchedAt ?? new Date().toISOString())
            }
        })
    }

    // Trigger search when filters change (debounced search is nice, but simple button/enter trigger or change trigger works)
    // Let's trigger fetch on filter changes directly for dates/types, and provide a search button or search trigger for keyword.
    const handleFilterChange = () => {
        fetchScans(1)
    }

    // Trigger query on Enter key
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            fetchScans(1)
        }
    }

    // Format ISO scan_time (Bangkok wall-clock YYYY-MM-DDTHH:MM:SS) to TH Date-Time
    const formatDateTimeTH = (isoStr: string) => {
        if (!isoStr) return '—'
        const parts = isoStr.split('T')
        if (parts.length < 2) return isoStr
        const [date, time] = parts
        const [y, m, d] = date.split('-')
        const displayDate = `${d}/${m}/${Number(y) + 543}`
        return `${displayDate} ${time}`
    }

    const exportToCSV = () => {
        if (scans.length === 0) return
        
        // CSV Headers
        const headers = ['ลำดับ', 'วันที่-เวลาทาบบัตร', 'รหัสพนักงาน', 'ชื่อพนักงาน', 'ชื่อเล่น', 'ฝ่าย/สำนัก', 'ตำแหน่ง', 'ประเภทเข้า/ออก', 'รหัสเครื่อง', 'ID รายการทาบบัตร (SQL ID)']
        
        const rows = scans.map((s, idx) => {
            const empName = s.employee ? `${s.employee.first_name_th} ${s.employee.last_name_th}` : '—'
            const nickname = s.employee?.nickname ? `(${s.employee.nickname})` : ''
            const dept = s.employee?.department ?? '—'
            const pos = s.employee?.position ?? '—'
            const type = s.scan_type === 'in' ? 'เข้า (IN)' : s.scan_type === 'out' ? 'ออก (OUT)' : 'ไม่ระบุ'
            const sqlId = s.raw_data?.transcantime_id ?? '—'
            
            return [
                idx + 1,
                formatDateTimeTH(s.scan_time),
                s.employee_code,
                empName,
                nickname,
                dept,
                pos,
                type,
                s.device_id ?? '—',
                sqlId
            ]
        })

        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        const dateStr = new Date().toISOString().slice(0,10)
        link.setAttribute('download', `raw-card-scans-${dateStr}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 rounded-2xl bg-white/5 border border-white/10 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-0 sm:bg-transparent sm:border-0">
                <div className="flex items-center gap-3">
                    <Link
                        href="/hradmin/attendance"
                        className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/70 transition-all"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-white leading-tight">ล็อกการแตะบัตรดิบ (Raw Logs)</h1>
                            {isPending && <RefreshCw size={14} className="animate-spin text-sky-400" />}
                        </div>
                        <p className="text-xs text-white/50">ประวัติการทาบบัตรพนักงานทั้งหมดจากเครื่องอ่านโดยไม่มีการกรองออก</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        onClick={exportToCSV}
                        disabled={scans.length === 0}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-emerald-300/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <FileSpreadsheet size={14} />
                        ส่งออกหน้านี้เป็น CSV
                    </button>
                    <button
                        onClick={() => fetchScans(page)}
                        disabled={isPending}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 transition-all cursor-pointer"
                    >
                        <RefreshCw size={14} className={cn(isPending && "animate-spin")} />
                        รีเฟรช
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                {/* Search */}
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/40">
                        <Search size={16} />
                    </span>
                    <input
                        type="text"
                        placeholder="ชื่อ, ชื่อเล่น หรือรหัสพนักงาน..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl text-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-white/20 placeholder:text-white/30"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                {/* Start Date */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <Calendar size={14} className="text-white/40 shrink-0" />
                    <input
                        type="date"
                        className="w-full bg-transparent border-0 text-white text-sm focus:outline-none [color-scheme:dark]"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value)
                            // Auto fetch on date change
                            setTimeout(handleFilterChange, 50)
                        }}
                    />
                </div>

                {/* End Date */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <Calendar size={14} className="text-white/40 shrink-0" />
                    <input
                        type="date"
                        className="w-full bg-transparent border-0 text-white text-sm focus:outline-none [color-scheme:dark]"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value)
                            setTimeout(handleFilterChange, 50)
                        }}
                    />
                </div>

                {/* Scan Type & Search Button */}
                <div className="flex gap-2">
                    <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl text-white px-3 py-2 text-sm focus:outline-none focus:border-white/20"
                        value={scanType}
                        onChange={(e) => {
                            setScanType(e.target.value)
                            setTimeout(handleFilterChange, 50)
                        }}
                    >
                        <option value="all">ทั้งหมด (IN/OUT)</option>
                        <option value="in">เข้า (IN)</option>
                        <option value="out">ออก (OUT)</option>
                        <option value="null">ไม่ระบุทิศทาง</option>
                    </select>
                    <button
                        onClick={() => fetchScans(1)}
                        className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer"
                    >
                        ค้นหา
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                {scans.length === 0 ? (
                    <div className="p-12 text-center text-white/40 text-sm flex flex-col items-center gap-3">
                        <CreditCard size={32} className="text-white/20" />
                        <span>ไม่พบข้อมูลการแตะบัตรในช่วงเวลาและตัวกรองที่เลือก</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-white/55 border-b border-white/10 bg-white/5">
                                    <th className="px-4 py-3 font-semibold">วัน-เวลาแตะบัตร</th>
                                    <th className="px-4 py-3 font-semibold">รหัสพนักงาน</th>
                                    <th className="px-4 py-3 font-semibold">พนักงาน</th>
                                    <th className="px-4 py-3 font-semibold">ฝ่าย/สำนัก</th>
                                    <th className="px-4 py-3 font-semibold">ตำแหน่ง</th>
                                    <th className="px-4 py-3 font-semibold">ประเภท</th>
                                    <th className="px-4 py-3 font-semibold">รหัสเครื่อง</th>
                                    <th className="px-4 py-3 font-semibold text-center">รายละเอียดดิบ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {scans.map((scan) => {
                                    const isExpanded = expandedScanId === scan.id
                                    const employee = scan.employee
                                    const employeeName = employee 
                                        ? `${employee.first_name_th} ${employee.last_name_th}`.trim()
                                        : '—'
                                    
                                    return (
                                        <tr key={scan.id} className="hover:bg-white/5 transition-all">
                                            <td className="px-4 py-3 text-white/95 font-medium whitespace-nowrap">
                                                {formatDateTimeTH(scan.scan_time)}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-white/70 whitespace-nowrap">
                                                {scan.employee_code}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-white/90">
                                                    {employeeName}
                                                    {employee?.nickname && (
                                                        <span className="text-xs text-white/50 ml-1.5">
                                                            ({employee.nickname})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-white/75 truncate max-w-[150px]">
                                                {employee?.department ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-white/65 truncate max-w-[150px]">
                                                {employee?.position ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {scan.scan_type === 'in' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                                                        เข้า (IN)
                                                    </span>
                                                ) : scan.scan_type === 'out' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 border border-rose-500/25 text-rose-300">
                                                        ออก (OUT)
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/50">
                                                        ไม่ระบุ
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-white/50 whitespace-nowrap">
                                                {scan.device_id ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <button
                                                    onClick={() => setExpandedScanId(isExpanded ? null : scan.id)}
                                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                                                >
                                                    <Layers size={12} />
                                                    {isExpanded ? 'ซ่อน' : 'แสดง'}
                                                </button>
                                                {isExpanded && (
                                                    <div className="absolute right-4 left-4 md:right-auto md:left-auto md:w-96 mt-2 p-3 bg-zinc-900 border border-white/15 rounded-xl text-left font-mono text-xs text-zinc-300 whitespace-pre-wrap overflow-auto shadow-2xl z-50">
                                                        <p className="font-bold border-b border-white/10 pb-1 mb-1 text-sky-400">Raw Data (JSON):</p>
                                                        {JSON.stringify(scan.raw_data, null, 2)}
                                                        <p className="font-bold border-t border-white/10 pt-1 mt-2 mb-1 text-amber-400">Meta:</p>
                                                        <div>Imported: {new Date(scan.imported_at).toLocaleString('th-TH')}</div>
                                                        <div>By: {scan.imported_by}</div>
                                                        <div>Source: {scan.source_file}</div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <footer className="px-5 py-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50 bg-white/5">
                        <div>
                            หน้า <span className="text-white font-semibold">{page}</span> จาก{' '}
                            <span className="text-white font-semibold">{totalPages}</span>
                            <span className="mx-2">·</span>
                            พบบันทึกทั้งหมด <span className="text-white font-semibold">{totalCount}</span> รายการ
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => fetchScans(page - 1)}
                                disabled={page <= 1 || isPending}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                                ก่อนหน้า
                            </button>
                            <button
                                onClick={() => fetchScans(page + 1)}
                                disabled={page >= totalPages || isPending}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                ถัดไป
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    )
}

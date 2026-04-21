'use client'

import { useState, useTransition, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Info, X } from 'lucide-react'
import Link from 'next/link'
import { validateCardRows, importCardScans, type RawCardRow, type ValidatedRow } from './actions'

const glassCard = {
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
} as const

const HEADER_ALIASES: Record<string, string[]> = {
    employeeCode: ['employee code', 'employee_code', 'employeecode', 'รหัสพนักงาน', 'id', 'user id', 'userid', 'emp_code'],
    date: ['date', 'วันที่', 'day'],
    time: ['time', 'เวลา', 'timestamp'],
    action: ['action', 'type', 'status', 'state', 'ประเภท', 'เข้า/ออก'],
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
    // Strip BOM
    const clean = text.replace(/^\uFEFF/, '').trim()
    const lines = clean.split(/\r?\n/).filter(l => l.trim())
    if (!lines.length) return { headers: [], rows: [] }

    const split = (line: string): string[] => {
        const out: string[] = []
        let cur = ''
        let inQuote = false
        for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') {
                if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
                else inQuote = !inQuote
            } else if (ch === ',' && !inQuote) {
                out.push(cur); cur = ''
            } else {
                cur += ch
            }
        }
        out.push(cur)
        return out.map(s => s.trim())
    }

    const headers = split(lines[0])
    const rows = lines.slice(1).map(split)
    return { headers, rows }
}

function mapHeader(headers: string[]): { idx: Partial<Record<keyof typeof HEADER_ALIASES, number>>; missing: string[] } {
    const lower = headers.map(h => h.toLowerCase().trim())
    const idx: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {}
    const missing: string[] = []
    for (const key of Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]) {
        const aliases = HEADER_ALIASES[key]
        const found = lower.findIndex(h => aliases.includes(h))
        if (found === -1) missing.push(key)
        else idx[key] = found
    }
    return { idx, missing }
}

type ParseState =
    | { kind: 'idle' }
    | { kind: 'parsed'; fileName: string; rows: RawCardRow[]; missing: string[] }
    | { kind: 'validating' }
    | { kind: 'validated'; fileName: string; rows: ValidatedRow[]; employeesFound: number; errorCount: number; duplicateCount: number }
    | { kind: 'importing' }
    | { kind: 'done'; inserted: number; skipped: number; reconciled: number; affectedDates: string[] }
    | { kind: 'error'; message: string }

export function CardImportView() {
    const [state, setState] = useState<ParseState>({ kind: 'idle' })
    const [showOnlyErrors, setShowOnlyErrors] = useState(false)
    const [isPending, startTransition] = useTransition()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFile = (file: File) => {
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const text = String(reader.result ?? '')
                const parsed = parseCsv(text)
                if (!parsed.headers.length) {
                    setState({ kind: 'error', message: 'ไฟล์ว่างเปล่า' })
                    return
                }
                const { idx, missing } = mapHeader(parsed.headers)
                if (missing.length) {
                    setState({
                        kind: 'error',
                        message: `คอลัมน์ที่จำเป็นหายไป: ${missing.join(', ')} — ต้องมี: Employee Code, Date, Time, Action`,
                    })
                    return
                }

                const rows: RawCardRow[] = parsed.rows
                    .filter(r => r.some(c => c))
                    .map((r, i) => ({
                        rowNumber: i + 2,
                        employeeCode: r[idx.employeeCode!] ?? '',
                        date: r[idx.date!] ?? '',
                        time: r[idx.time!] ?? '',
                        action: r[idx.action!] ?? '',
                    }))

                setState({ kind: 'parsed', fileName: file.name, rows, missing: [] })
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                setState({ kind: 'error', message: `อ่านไฟล์ไม่ได้: ${msg}` })
            }
        }
        reader.onerror = () => setState({ kind: 'error', message: 'อ่านไฟล์ไม่สำเร็จ' })
        reader.readAsText(file, 'utf-8')
    }

    const handleValidate = () => {
        if (state.kind !== 'parsed') return
        const rows = state.rows
        const fileName = state.fileName
        setState({ kind: 'validating' })
        startTransition(async () => {
            const result = await validateCardRows(rows)
            if ('error' in result) {
                setState({ kind: 'error', message: result.error })
                return
            }
            setState({
                kind: 'validated',
                fileName,
                rows: result.rows,
                employeesFound: result.employeesFound,
                errorCount: result.errorCount,
                duplicateCount: result.duplicateCount,
            })
        })
    }

    const handleImport = () => {
        if (state.kind !== 'validated') return
        const rows = state.rows
        setState({ kind: 'importing' })
        startTransition(async () => {
            const result = await importCardScans(rows, state.fileName)
            if (result.error) {
                setState({ kind: 'error', message: result.error })
                return
            }
            setState({
                kind: 'done',
                inserted: result.inserted,
                skipped: result.skipped,
                reconciled: result.reconciled ?? 0,
                affectedDates: result.affectedDates ?? [],
            })
        })
    }

    const reset = () => {
        setState({ kind: 'idle' })
        setShowOnlyErrors(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            {/* Instructions */}
            <div className="p-4 lg:p-6" style={glassCard}>
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-amber-300 flex-shrink-0 mt-0.5" />
                    <div className="text-white/90 text-sm space-y-2">
                        <p className="font-semibold text-white">รูปแบบไฟล์ CSV ที่รองรับ</p>
                        <p>ต้องมี 4 คอลัมน์ (ชื่อคอลัมน์ไม่ซีเรียสเรื่องตัวพิมพ์ใหญ่เล็ก):</p>
                        <ul className="list-disc pl-5 space-y-1 text-white/75 text-xs">
                            <li><code className="text-amber-300">Employee Code</code> — รหัสพนักงาน (ต้องตรงกับในระบบ)</li>
                            <li><code className="text-amber-300">Date</code> — YYYY-MM-DD เช่น 2026-04-20</li>
                            <li><code className="text-amber-300">Time</code> — HH:MM หรือ HH:MM:SS</li>
                            <li><code className="text-amber-300">Action</code> — In / Out / Check-In / Check-Out / เข้า / ออก</li>
                        </ul>
                        <p className="text-white/60 text-xs pt-1">
                            ระบบจะจับคู่ In กับ Out ของวันเดียวกันให้อัตโนมัติ และข้ามรายการที่มีอยู่แล้ว
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload zone */}
            {state.kind === 'idle' && (
                <div className="p-6 lg:p-10 text-center" style={glassCard}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleFile(f)
                        }}
                    />
                    <Upload className="h-12 w-12 text-white/60 mx-auto mb-3" />
                    <h3 className="text-white text-lg font-semibold mb-1">อัปโหลดไฟล์ CSV จากเครื่องอ่านบัตร</h3>
                    <p className="text-white/70 text-sm mb-4">รองรับไฟล์ที่ export จาก HIP Ci100S หรือรูปแบบอื่น ๆ</p>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 bg-white/15 hover:bg-white/25 ring-1 ring-white/25 rounded-lg text-white font-medium transition-all inline-flex items-center gap-2"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        เลือกไฟล์ CSV
                    </button>
                </div>
            )}

            {/* Parsed preview */}
            {state.kind === 'parsed' && (
                <div className="p-4 lg:p-6 space-y-4" style={glassCard}>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <FileSpreadsheet className="h-5 w-5 text-white flex-shrink-0" />
                            <span className="text-white font-medium truncate">{state.fileName}</span>
                            <span className="text-white/60 text-sm flex-shrink-0">({state.rows.length} แถว)</span>
                        </div>
                        <button onClick={reset} className="text-white/70 hover:text-white p-1" aria-label="ยกเลิก">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <PreviewTable rows={state.rows.slice(0, 10)} />
                    {state.rows.length > 10 && (
                        <p className="text-white/60 text-xs">แสดง 10 แถวแรก จากทั้งหมด {state.rows.length} แถว</p>
                    )}
                    <button
                        onClick={handleValidate}
                        disabled={isPending}
                        className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold rounded-lg transition-all inline-flex items-center justify-center gap-2"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        ตรวจสอบข้อมูล
                    </button>
                </div>
            )}

            {state.kind === 'validating' && (
                <div className="p-10 text-center" style={glassCard}>
                    <Loader2 className="h-8 w-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-white/80">กำลังตรวจสอบข้อมูล…</p>
                </div>
            )}

            {/* Validated */}
            {state.kind === 'validated' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard label="ทั้งหมด" value={state.rows.length} color="white" />
                        <StatCard label="พบพนักงาน" value={state.employeesFound} color="emerald" />
                        <StatCard label="ข้อผิดพลาด" value={state.errorCount} color="red" />
                        <StatCard label="ซ้ำ (ข้าม)" value={state.duplicateCount} color="amber" />
                    </div>

                    <div className="p-4 lg:p-6 space-y-3" style={glassCard}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5 text-white" />
                                <span className="text-white font-medium truncate max-w-[200px]">{state.fileName}</span>
                            </div>
                            <label className="flex items-center gap-2 text-white/80 text-sm">
                                <input
                                    type="checkbox"
                                    checked={showOnlyErrors}
                                    onChange={(e) => setShowOnlyErrors(e.target.checked)}
                                    className="rounded"
                                />
                                แสดงเฉพาะแถวที่มีปัญหา
                            </label>
                        </div>
                        <ValidatedTable
                            rows={showOnlyErrors ? state.rows.filter(r => !r.isValid) : state.rows}
                        />
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button
                                onClick={handleImport}
                                disabled={isPending || state.rows.filter(r => r.isValid).length === 0}
                                className="flex-1 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all inline-flex items-center justify-center gap-2"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                นำเข้าข้อมูล ({state.rows.filter(r => r.isValid).length} แถวที่ใช้ได้)
                            </button>
                            <button
                                onClick={reset}
                                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {state.kind === 'importing' && (
                <div className="p-10 text-center" style={glassCard}>
                    <Loader2 className="h-8 w-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-white/80">กำลังนำเข้าข้อมูล…</p>
                </div>
            )}

            {state.kind === 'done' && (
                <div className="p-6 lg:p-10 text-center" style={glassCard}>
                    <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-white text-xl font-bold mb-1">นำเข้าสำเร็จ!</h3>
                    <p className="text-white/80 mb-2">
                        เพิ่ม {state.inserted} รายการ · ข้าม {state.skipped} แถว
                    </p>
                    {state.reconciled > 0 && (
                        <p className="text-white/70 text-sm mb-1">
                            คำนวณเทียบกับมือถือแล้ว {state.reconciled} คน
                        </p>
                    )}
                    {state.affectedDates.length > 0 && (
                        <p className="text-white/60 text-xs mb-4">
                            วันที่ที่อัปเดต: {state.affectedDates.sort().join(', ')}
                        </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                        <Link
                            href="/hradmin/attendance/reconcile"
                            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all"
                        >
                            ดูผลการเทียบ
                        </Link>
                        <button
                            onClick={reset}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-all"
                        >
                            นำเข้าไฟล์ใหม่
                        </button>
                    </div>
                </div>
            )}

            {state.kind === 'error' && (
                <div className="p-4 lg:p-6" style={glassCard}>
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-red-300 font-semibold mb-1">เกิดข้อผิดพลาด</p>
                            <p className="text-white/80 text-sm break-words">{state.message}</p>
                        </div>
                        <button onClick={reset} className="text-white/70 hover:text-white p-1" aria-label="ปิด">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'white' | 'emerald' | 'red' | 'amber' }) {
    const colorMap = {
        white: 'text-white',
        emerald: 'text-emerald-300',
        red: 'text-red-300',
        amber: 'text-amber-300',
    }
    return (
        <div className="p-3 lg:p-4" style={glassCard}>
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
        </div>
    )
}

function PreviewTable({ rows }: { rows: RawCardRow[] }) {
    return (
        <div className="overflow-x-auto -mx-4 lg:mx-0">
            <table className="w-full text-sm text-white/90 min-w-[500px]">
                <thead>
                    <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider">
                        <th className="text-left py-2 px-3">#</th>
                        <th className="text-left py-2 px-3">รหัส</th>
                        <th className="text-left py-2 px-3">วันที่</th>
                        <th className="text-left py-2 px-3">เวลา</th>
                        <th className="text-left py-2 px-3">ประเภท</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className="border-b border-white/5">
                            <td className="py-2 px-3 text-white/50">{r.rowNumber}</td>
                            <td className="py-2 px-3 font-mono text-xs">{r.employeeCode}</td>
                            <td className="py-2 px-3">{r.date}</td>
                            <td className="py-2 px-3">{r.time}</td>
                            <td className="py-2 px-3">{r.action}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function ValidatedTable({ rows }: { rows: ValidatedRow[] }) {
    return (
        <div className="overflow-x-auto -mx-4 lg:mx-0 max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm text-white/90 min-w-[600px]">
                <thead className="sticky top-0 bg-[#3a1a1e] z-10">
                    <tr className="border-b border-white/10 text-white/60 text-xs uppercase tracking-wider">
                        <th className="text-left py-2 px-3">#</th>
                        <th className="text-left py-2 px-3">สถานะ</th>
                        <th className="text-left py-2 px-3">ชื่อ / รหัส</th>
                        <th className="text-left py-2 px-3">วันที่</th>
                        <th className="text-left py-2 px-3">เวลา</th>
                        <th className="text-left py-2 px-3">In/Out</th>
                        <th className="text-left py-2 px-3">ข้อความ</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i} className={`border-b border-white/5 ${!r.isValid ? 'bg-red-500/10' : ''}`}>
                            <td className="py-2 px-3 text-white/50">{r.rowNumber}</td>
                            <td className="py-2 px-3">
                                {r.isValid ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-red-400" />
                                )}
                            </td>
                            <td className="py-2 px-3">
                                <div className="font-medium text-white truncate max-w-[200px]">
                                    {r.employeeName ?? '—'}
                                </div>
                                <div className="text-xs text-white/50 font-mono">{r.employeeCode}</div>
                            </td>
                            <td className="py-2 px-3">{r.date}</td>
                            <td className="py-2 px-3">{r.time}</td>
                            <td className="py-2 px-3 uppercase text-xs">{r.normalizedAction ?? r.action}</td>
                            <td className="py-2 px-3 text-xs">
                                {r.error ? <span className="text-red-300">{r.error}</span> : <span className="text-emerald-400">OK</span>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

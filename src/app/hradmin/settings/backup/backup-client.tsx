'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2, ShieldCheck, AlertTriangle, Clock, FileArchive } from 'lucide-react'

const LAST_BACKUP_KEY = 'ebci-nexus.last-backup-at'

export function BackupClient() {
    const [downloading, setDownloading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastBackupAt, setLastBackupAt] = useState<Date | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem(LAST_BACKUP_KEY)
        if (stored) {
            const t = Date.parse(stored)
            if (!Number.isNaN(t)) setLastBackupAt(new Date(t))
        }
    }, [])

    const startDownload = async () => {
        setError(null)
        setDownloading(true)
        try {
            // The route streams a ZIP — we fetch it as a blob and trigger
            // the browser save dialog explicitly so we get a deterministic
            // filename + a clear "downloading" state in the UI. Using a
            // plain <a download> would skip the spinner.
            const res = await fetch('/api/hradmin/backup/download')
            if (!res.ok) {
                const msg = await res.text().catch(() => '')
                throw new Error(msg || `HTTP ${res.status}`)
            }

            const filenameHeader = res.headers.get('content-disposition') ?? ''
            const match = filenameHeader.match(/filename="?([^";]+)"?/i)
            const filename = match?.[1]
                ?? `ebci-nexus-backup-${new Date().toISOString().slice(0, 10)}.zip`

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)

            const stamp = new Date()
            localStorage.setItem(LAST_BACKUP_KEY, stamp.toISOString())
            setLastBackupAt(stamp)
        } catch (err) {
            console.error('[backup] download failed:', err)
            setError((err as Error).message ?? 'ดาวน์โหลดไม่สำเร็จ')
        } finally {
            setDownloading(false)
        }
    }

    const lastLabel = lastBackupAt
        ? lastBackupAt.toLocaleString('th-TH', { dateStyle: 'full', timeStyle: 'short' })
        : 'ยังไม่เคยกด'

    const daysSince = lastBackupAt
        ? Math.floor((Date.now() - lastBackupAt.getTime()) / (1000 * 60 * 60 * 24))
        : null
    const overdue = daysSince !== null && daysSince >= 7

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} className="text-amber-200" />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                        แบ็กอัพข้อมูลทั้งระบบ
                    </h1>
                    <p className="text-sm text-white/65 mt-0.5">
                        ดาวน์โหลดข้อมูล HR ทั้งหมดเป็นไฟล์ ZIP เก็บไว้ใน Google Drive ส่วนตัว
                    </p>
                </div>
            </div>

            {/* Status card — last backup + overdue warning */}
            <div className="rounded-2xl border p-4 flex items-center gap-3"
                style={{
                    background: overdue
                        ? 'linear-gradient(135deg, rgba(248,113,113,0.16), rgba(239,68,68,0.08))'
                        : 'rgba(255,255,255,0.06)',
                    borderColor: overdue ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.12)',
                }}
            >
                <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: overdue ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.1)' }}>
                    <Clock size={18} className={overdue ? 'text-red-300' : 'text-white/70'} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/55 mb-0.5">แบ็กอัพล่าสุด (จากเครื่องนี้)</p>
                    <p className={`text-sm font-semibold leading-tight ${overdue ? 'text-red-200' : 'text-white'}`}>
                        {lastLabel}
                    </p>
                    {daysSince !== null && (
                        <p className="text-xs mt-1"
                           style={{ color: overdue ? '#fecaca' : 'rgba(255,255,255,0.55)' }}>
                            {daysSince === 0 ? 'วันนี้' : `${daysSince} วันที่แล้ว`}
                            {overdue && ' — ครบกำหนดแล้ว ควรกดแบ็กอัพอีกครั้ง'}
                        </p>
                    )}
                </div>
            </div>

            {/* Main action */}
            <div className="rounded-2xl border border-white/12 p-5 space-y-4"
                 style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-start gap-3">
                    <FileArchive size={22} className="text-amber-300 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-white font-bold text-base leading-tight mb-1">
                            ดาวน์โหลดทุกอย่างในไฟล์เดียว
                        </p>
                        <p className="text-white/65 text-sm leading-relaxed">
                            ZIP จะรวม CSV ของพนักงาน ใบลา สลิปเงินเดือน ปฏิทินบริษัท ประกาศข่าวสาร
                            และไฟล์ทั้งหมดจาก Storage (รูปพนักงาน, รูปประกาศ, สลิป PDF, สัญญา ฯลฯ)
                            พร้อมเอกสาร <code className="text-amber-200">SYSTEM.md</code> ที่อธิบายโครงสร้างระบบ
                            ให้ AI กู้สถานการณ์ได้ในกรณีฉุกเฉิน.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={startDownload}
                    disabled={downloading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold text-base transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: downloading
                        ? 'rgba(139,53,64,0.5)'
                        : 'linear-gradient(135deg, #882136, #c0392b)' }}
                >
                    {downloading
                        ? <><Loader2 size={18} className="animate-spin" /> กำลังเตรียมไฟล์ ZIP...</>
                        : <><Download size={18} /> ดาวน์โหลดข้อมูลทั้งระบบ</>}
                </button>

                {downloading && (
                    <p className="text-xs text-white/55 text-center">
                        อาจใช้เวลา 30-60 วินาที ขึ้นอยู่กับจำนวนไฟล์ — กรุณาอย่าปิดหน้านี้
                    </p>
                )}

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}>
                        <AlertTriangle size={16} className="text-red-300 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-100">เกิดข้อผิดพลาด: {error}</p>
                    </div>
                )}
            </div>

            {/* Routine + scope */}
            <div className="grid sm:grid-cols-2 gap-3">
                <InfoCard
                    title="คำแนะนำเรื่องความถี่"
                    body={
                        <>
                            <strong className="text-white">ทุกศุกร์เย็น</strong> ก่อนเลิกงาน
                            หรือ <strong className="text-white">ทุกครั้งหลังขึ้นเงินเดือน</strong>
                            หรือเปลี่ยนแปลงข้อมูลครั้งใหญ่. เก็บไฟล์ ZIP ใน Google Drive
                            ส่วนตัวที่ HR ระดับสูงเข้าถึงได้.
                        </>
                    }
                />
                <InfoCard
                    title="สิ่งที่ ZIP ครอบคลุม"
                    body={
                        <>
                            <span className="text-emerald-300">✓</span> ทุกตาราง HR (CSV) ·{' '}
                            <span className="text-emerald-300">✓</span> ไฟล์ Storage ทั้งหมด ·{' '}
                            <span className="text-emerald-300">✓</span> SYSTEM.md + MANIFEST.md.
                            <br />
                            <span className="text-amber-300">✗</span> รหัสผ่านพนักงาน ·{' '}
                            <span className="text-amber-300">✗</span> Audit logs (ใหญ่เกินไป).
                        </>
                    }
                />
            </div>

            {/* Footnote */}
            <p className="text-xs text-white/45 leading-relaxed px-1">
                ZIP นี้ใช้สำหรับการกู้คืนข้อมูลฉุกเฉินเท่านั้น
                — ไม่ทดแทน automatic backup ของ Supabase.
                เมื่อบริษัทใช้งานเต็มกำลัง ควรอัปเกรด Supabase Pro
                เพื่อรับ daily backup + 7-day point-in-time recovery.
            </p>
        </div>
    )
}

function InfoCard({ title, body }: { title: string; body: React.ReactNode }) {
    return (
        <div className="rounded-2xl border p-4"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80 mb-2">
                {title}
            </p>
            <p className="text-sm text-white/75 leading-relaxed">{body}</p>
        </div>
    )
}

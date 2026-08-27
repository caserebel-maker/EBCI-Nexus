'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Settings as SettingsIcon, ShieldCheck } from 'lucide-react'

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.16)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
}

export function SettingsClient() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const requestPasswordChange = async () => {
        setLoading(true)
        setStatus(null)
        const response = await fetch('/api/auth/password-change-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'in_app' }),
        })
        const result = await response.json().catch(() => null) as { message?: string; error?: string } | null
        setLoading(false)
        setStatus(response.ok
            ? { type: 'success', message: result?.message ?? 'ส่งคำขอเรียบร้อยแล้ว' }
            : { type: 'error', message: result?.error ?? 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่' })
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center rounded-full" style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.18)' }}>
                    <SettingsIcon size={22} style={{ color: '#fcd34d' }} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white/95">ตั้งค่า</h1>
                    <p className="text-sm text-white/60">จัดการบัญชีและความปลอดภัย</p>
                </div>
            </div>

            <section style={glass} className="p-6">
                <div className="flex items-center gap-2 mb-3">
                    <KeyRound size={19} className="text-amber-300" />
                    <h2 className="text-lg font-bold text-white/95">เปลี่ยนรหัสผ่าน</h2>
                </div>
                <p className="text-sm leading-relaxed text-white/70">
                    เพื่อป้องกันการเข้าถึงบัญชีโดยไม่ได้รับอนุญาต การเปลี่ยนรหัสผ่านต้องผ่านการตรวจสอบจาก Super Admin ก่อน ระบบจะบันทึกผู้ขอและเวลาที่ส่งคำขอไว้ทุกครั้ง
                </p>

                <div className="mt-4 flex gap-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
                    <ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-200" />
                    <p className="text-sm leading-relaxed text-white/75">
                        เมื่ออนุมัติแล้ว ลิงก์ตั้งรหัสผ่านใหม่จะถูกส่งไปยังอีเมลของบัญชีโดยตรง
                    </p>
                </div>

                {status && (
                    <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 ${status.type === 'success' ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100' : 'border-red-300/25 bg-red-400/10 text-red-100'}`}>
                        {status.type === 'success' ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
                        <p className="text-sm leading-relaxed">{status.message}</p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={requestPasswordChange}
                    disabled={loading || status?.type === 'success'}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-[#321014] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}
                    {loading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอเปลี่ยนรหัสผ่าน'}
                </button>
            </section>
        </div>
    )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus(null)

        const trimmed = email.trim()
        if (!trimmed) {
            setStatus({ type: 'error', message: 'กรุณากรอกอีเมล' })
            return
        }

        setLoading(true)

        const response = await fetch('/api/auth/password-change-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: trimmed, source: 'forgot_password' }),
        })
        const result = await response.json().catch(() => null) as { message?: string; error?: string } | null

        setLoading(false)

        if (!response.ok) {
            setStatus({ type: 'error', message: result?.error ?? 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' })
            return
        }

        setStatus({
            type: 'success',
            message: result?.message ?? 'รับคำขอแล้ว Super Admin จะตรวจสอบก่อนส่งลิงก์ตั้งรหัสผ่านใหม่',
        })
        setEmail('')
    }

    return (
        <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg,#2d0a0e 0%,#561e23 50%,#7a2d35 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
            <div style={{ width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '40px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <img
                        src="/sidebar-logo.png"
                        alt="EBCI NEXUS"
                        style={{ height: '60px', width: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                </div>

                <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, textAlign: 'center', marginBottom: '6px' }}>
                    ลืมรหัสผ่าน
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textAlign: 'center', marginBottom: '24px', lineHeight: 1.5 }}>
                    กรอกอีเมลที่ใช้เข้าสู่ระบบ Super Admin จะตรวจสอบคำขอก่อนส่งลิงก์ตั้งรหัสผ่านใหม่
                </p>

                {status?.type === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <CheckCircle2 size={44} style={{ color: '#4ade80', margin: '0 auto 14px', display: 'block' }} />
                        <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '14px', margin: 0, lineHeight: 1.55 }}>{status.message}</p>
                        <Link
                            href="/login"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginTop: '24px', textDecoration: 'none' }}
                        >
                            <ArrowLeft size={14} /> กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </div>
                ) : (
                    <>
                        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>
                                    อีเมล
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        required
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '12px 12px 12px 36px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            {status?.type === 'error' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                                    <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0 }} />
                                    <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>{status.message}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    background: loading ? 'rgba(139,53,64,0.5)' : 'linear-gradient(135deg,#7a2d35,#c0392b)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '13px',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    marginTop: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                }}
                            >
                                {loading && <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 0.8s linear infinite' }} />}
                                {loading ? 'กำลังส่ง...' : 'ส่งคำขอเปลี่ยนรหัสผ่าน'}
                            </button>
                        </form>

                        <Link
                            href="/login"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.55)', fontSize: '13px', marginTop: '20px', textDecoration: 'none', justifyContent: 'center', width: '100%' }}
                        >
                            <ArrowLeft size={14} /> กลับไปหน้าเข้าสู่ระบบ
                        </Link>
                    </>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

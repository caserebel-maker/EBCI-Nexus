'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [ready, setReady] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    // Supabase embeds the session in the URL hash after verifying the recovery token.
    // We wait for onAuthStateChange to fire with type=SIGNED_IN (from recovery) before
    // allowing the user to submit, confirming the session is established.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
                setReady(true)
            }
        })
        // Also check if a session is already active (page refresh after hash consumed)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setReady(true)
        })
        return () => subscription.unsubscribe()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus(null)

        if (password.length < 8) {
            setStatus({ type: 'error', message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
            return
        }
        if (password !== confirm) {
            setStatus({ type: 'error', message: 'รหัสผ่านไม่ตรงกัน' })
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password })
        setLoading(false)

        if (error) {
            setStatus({ type: 'error', message: error.message })
        } else {
            setStatus({ type: 'success', message: 'ตั้งรหัสผ่านสำเร็จ! กำลังพาไปหน้าหลัก...' })
            setTimeout(() => router.push('/portal'), 2000)
        }
    }

    return (
        <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg,#2d0a0e 0%,#561e23 50%,#7a2d35 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
            <div style={{ width: '100%', maxWidth: '420px', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '40px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

                {/* Logo / Header */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <img
                        src="/sidebar-logo.png"
                        alt="EBCI NEXUS"
                        style={{ height: '56px', width: 'auto', objectFit: 'contain', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '2px' }}>EBCI NEXUS</h1>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>ตั้งรหัสผ่านใหม่</p>
                </div>

                {!ready ? (
                    <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '14px', padding: '24px 0' }}>
                        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#ffffff', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
                        กำลังตรวจสอบลิงก์...
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : status?.type === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <CheckCircle2 size={48} style={{ color: '#4ade80', margin: '0 auto 16px', display: 'block' }} />
                        <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '15px', margin: 0 }}>{status.message}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Password field */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>
                                รหัสผ่านใหม่
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="อย่างน้อย 8 ตัวอักษร"
                                    required
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '11px 40px 11px 36px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                />
                                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 0 }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm field */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>
                                ยืนยันรหัสผ่าน
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                                    required
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '11px 40px 11px 36px', color: '#ffffff', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                                />
                                <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 0 }}>
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {status?.type === 'error' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                                <AlertCircle size={15} style={{ color: '#f87171', flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>{status.message}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{ width: '100%', background: loading ? 'rgba(139,53,64,0.5)' : 'linear-gradient(135deg,#7a2d35,#c0392b)', color: '#ffffff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}
                        >
                            {loading ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่าน →'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

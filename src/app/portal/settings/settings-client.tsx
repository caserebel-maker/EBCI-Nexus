'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, KeyRound, Settings as SettingsIcon } from 'lucide-react'

const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.16)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
}

export function SettingsClient() {
    const [email, setEmail] = useState<string | null>(null)
    const [current, setCurrent] = useState('')
    const [next, setNext] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNext, setShowNext] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    // Fetch the signed-in user's email so we can re-authenticate them
    // before applying the password change. signInWithPassword needs an email.
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user?.email) setEmail(data.user.email)
        })
    }, [])

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus(null)

        if (!email) {
            setStatus({ type: 'error', message: 'ไม่พบอีเมลผู้ใช้ — ลองรีเฟรชหน้า' })
            return
        }
        if (next.length < 8) {
            setStatus({ type: 'error', message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })
            return
        }
        if (next !== confirm) {
            setStatus({ type: 'error', message: 'รหัสผ่านยืนยันไม่ตรงกัน' })
            return
        }
        if (current === next) {
            setStatus({ type: 'error', message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม' })
            return
        }

        setLoading(true)

        // Verify current password by attempting a sign-in. Supabase doesn't
        // expose a "verify password" endpoint, so this is the conventional
        // way to check the user knows their existing credential before we
        // accept a change.
        const reauth = await supabase.auth.signInWithPassword({ email, password: current })
        if (reauth.error) {
            setLoading(false)
            setStatus({ type: 'error', message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' })
            return
        }

        const { error } = await supabase.auth.updateUser({ password: next })
        if (error) {
            setLoading(false)
            setStatus({ type: 'error', message: error.message })
            return
        }

        setStatus({
            type: 'success',
            message: 'เปลี่ยนรหัสผ่านสำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ...',
        })
        setLoading(false)

        // Force a full re-login: clears all session cookies + Supabase storage
        // so the new password takes effect immediately on every device.
        await supabase.auth.signOut()
        await fetch('/api/auth/logout', { method: 'POST' })
        document.cookie.split(';').forEach(c => {
            document.cookie = c
                .replace(/^ +/, '')
                .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
        })
        setTimeout(() => {
            window.location.replace('/login?message=password-changed')
        }, 1400)
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div
                    className="flex items-center justify-center rounded-full"
                    style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.18)' }}
                >
                    <SettingsIcon size={22} style={{ color: '#fcd34d' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                        ตั้งค่า
                    </h1>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                        จัดการบัญชีและความปลอดภัย
                    </p>
                </div>
            </div>

            {/* Change password card */}
            <section style={glass} className="p-6 mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <KeyRound size={18} style={{ color: '#fcd34d' }} />
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                        เปลี่ยนรหัสผ่าน
                    </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '20px' }}>
                    หลังเปลี่ยนสำเร็จ ระบบจะออกจากระบบทุกอุปกรณ์ และให้เข้าสู่ระบบใหม่
                </p>

                <form onSubmit={submit} className="flex flex-col gap-4">
                    <PasswordField
                        label="รหัสผ่านปัจจุบัน"
                        value={current}
                        onChange={setCurrent}
                        show={showCurrent}
                        toggleShow={() => setShowCurrent(v => !v)}
                        placeholder="กรอกรหัสผ่านที่ใช้อยู่"
                    />
                    <PasswordField
                        label="รหัสผ่านใหม่"
                        value={next}
                        onChange={setNext}
                        show={showNext}
                        toggleShow={() => setShowNext(v => !v)}
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                    />
                    <PasswordField
                        label="ยืนยันรหัสผ่านใหม่"
                        value={confirm}
                        onChange={setConfirm}
                        show={showConfirm}
                        toggleShow={() => setShowConfirm(v => !v)}
                        placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    />

                    {status?.type === 'error' && (
                        <div className="flex items-center gap-2"
                             style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
                            <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>{status.message}</p>
                        </div>
                    )}
                    {status?.type === 'success' && (
                        <div className="flex items-center gap-2"
                             style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
                            <CheckCircle2 size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
                            <p style={{ margin: 0, fontSize: '13px', color: '#4ade80' }}>{status.message}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !current || !next || !confirm}
                        style={{
                            background: loading || !current || !next || !confirm
                                ? 'rgba(139,53,64,0.4)'
                                : 'linear-gradient(135deg,#7a2d35,#c0392b)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '14px',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: loading || !current || !next || !confirm ? 'not-allowed' : 'pointer',
                            marginTop: '4px',
                        }}
                    >
                        {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                    </button>
                </form>
            </section>
        </div>
    )
}

function PasswordField({
    label, value, onChange, show, toggleShow, placeholder,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    show: boolean
    toggleShow: () => void
    placeholder: string
}) {
    return (
        <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    required
                    style={{
                        width: '100%',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        padding: '12px 44px 12px 40px',
                        color: '#ffffff',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                    }}
                />
                <button
                    type="button"
                    onClick={toggleShow}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 0 }}
                    aria-label={show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    )
}

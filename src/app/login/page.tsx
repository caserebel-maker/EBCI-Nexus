"use client"

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useTranslation } from '@/contexts/language-context'

function LoginForm() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showPw, setShowPw] = useState(false)
    const searchParams = useSearchParams()
    const redirectAfterLogin = searchParams.get('redirect') ?? null
    const messageParam = searchParams.get('message')

    const { t } = useTranslation()

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* 1. Background Video (Blue Wireframe - Local/Pexels) */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                >
                    {/* Tech/Network Abstract Blue Wireframe */}
                    <source src="https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                {/* Dark Overlay for Readability */}
                <div className="absolute inset-0 bg-black/50 pointer-events-none" />
                {/* Maroon Gradient Overlay to tint the Blue Video (CI Matching) */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#561e23] to-[#ad5f6c] mix-blend-color opacity-90 pointer-events-none" />
            </div>

            {/* Language Toggle (Floating Top Right) */}
            <div className="absolute top-4 right-4 z-20">
                <LanguageToggle />
            </div>

            {/* 2. Glassmorphism Card (Switched to White Glass Theme) */}
            <div className="relative z-10 w-full max-w-[422px] p-8 mx-4">
                <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-5 animate-in fade-in zoom-in duration-500">

                    {/* Header */}
                    <div className="text-center mb-6 flex flex-col items-center">
                        <img
                            src="/sidebar-logo.png"
                            alt="EBCI Nexus"
                            className="h-12 w-auto opacity-90 drop-shadow-2xl"
                        />
                        <p className="text-white font-medium text-[9px] md:text-[10px] tracking-[0.2em] opacity-80 mt-1">
                            Human Resource Management System
                        </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={async (e) => {
                        e.preventDefault()
                        setLoading(true)
                        setError(null)
                        const formData = new FormData(e.currentTarget)
                        const data = Object.fromEntries(formData.entries())

                        try {
                            const res = await fetch('/api/auth/login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    ...data,
                                    ...(redirectAfterLogin ? { redirectTo: redirectAfterLogin } : {}),
                                })
                            })

                            const result = await res.json()

                            if (!res.ok) {
                                throw new Error(result.error || t('auth.errorCredentials'))
                            }

                            window.location.href = result.redirectTo
                        } catch (err) {
                            console.error("Login Error:", err)
                            setError((err as Error).message)
                            setLoading(false)
                        }
                    }} className="space-y-6">

                        {messageParam === 'password-set' && !error && (
                            <div className="bg-emerald-500/20 text-emerald-100 text-sm p-3 rounded-lg border border-emerald-500/40 text-center backdrop-blur-sm">
                                ✓ ตั้งรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ
                            </div>
                        )}
                        {messageParam === 'password-changed' && !error && (
                            <div className="bg-emerald-500/20 text-emerald-100 text-sm p-3 rounded-lg border border-emerald-500/40 text-center backdrop-blur-sm">
                                ✓ เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-500/20 text-red-100 text-sm p-3 rounded-lg border border-red-500/50 text-center backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/60 pl-9 pr-3 py-2 rounded-xl focus:ring-2 focus:ring-[#882136] focus:border-white/50 outline-none transition-all hover:bg-white/20 shadow-none text-[15px]"
                                    placeholder={t('auth.email')}
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
                                <input
                                    name="password"
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/60 pl-9 pr-9 py-2 rounded-xl focus:ring-2 focus:ring-[#882136] focus:border-white/50 outline-none transition-all hover:bg-white/20 shadow-none text-[15px]"
                                    placeholder={t('auth.password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-2.5 text-white/50 hover:text-white/80 transition-colors"
                                >
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#561e23] to-[#ad5f6c] hover:from-[#ad5f6c] hover:to-[#c47080] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center border border-white/10 text-[15px]"
                            >
                                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : t('auth.signIn')}
                            </button>

                            <div className="text-center mt-3">
                                <Link
                                    href="/forgot-password"
                                    className="text-white/60 hover:text-white text-[13px] transition-colors"
                                >
                                    ลืมรหัสผ่าน?
                                </Link>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Credit */}
                <p className="text-center text-white/40 text-xs mt-5 font-light">
                    © 2026 EBCI Group. All rights reserved.
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    )
}

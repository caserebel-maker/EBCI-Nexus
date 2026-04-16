"use client"

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, Mail, Lock } from 'lucide-react'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useTranslation } from '@/contexts/language-context'

function LoginForm() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const searchParams = useSearchParams()
    const redirectAfterLogin = searchParams.get('redirect') ?? null
    // Show HR Admin badge when entering from /hradmin (no redirect param, or redirect=/hradmin)
    const isAdminEntry = !redirectAfterLogin || redirectAfterLogin.startsWith('/hradmin')

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
            <div className="relative z-10 w-full max-w-md p-8 mx-4">
                <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-500">

                    {/* Header */}
                    <div className="text-center mb-10 flex flex-col items-center">
                        <img
                            src="/sidebar-logo.png"
                            alt="EBCI Nexus"
                            className="h-20 w-auto opacity-90 drop-shadow-2xl"
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

                            // Success → use redirect param if present, otherwise role-based home
                            window.location.href = redirectAfterLogin ?? result.redirectTo
                        } catch (err) {
                            console.error("Login Error:", err)
                            setError((err as Error).message)
                            setLoading(false)
                        }
                    }} className="space-y-6">

                        {error && (
                            <div className="bg-red-500/20 text-red-100 text-sm p-3 rounded-lg border border-red-500/50 text-center backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-white/70" />
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/60 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#882136] focus:border-white/50 outline-none transition-all hover:bg-white/20 shadow-none"
                                    placeholder={t('auth.email')}
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-white/70" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/60 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#882136] focus:border-white/50 outline-none transition-all hover:bg-white/20 shadow-none"
                                    placeholder={t('auth.password')}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#561e23] to-[#ad5f6c] hover:from-[#ad5f6c] hover:to-[#c47080] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center border border-white/10"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : t('auth.signIn')}
                            </button>

                            {isAdminEntry ? (
                                /* HR Admin badge */
                                <div className="mt-5 rounded-xl px-4 py-3 text-center"
                                    style={{
                                        background: 'rgba(136,33,54,0.18)',
                                        border: '1px solid rgba(173,95,108,0.40)',
                                        backdropFilter: 'blur(8px)',
                                    }}>
                                    <p className="text-xs font-semibold tracking-wide"
                                        style={{ color: 'rgba(252,165,165,0.90)' }}>
                                        🔐&nbsp; HR Administrator Access
                                    </p>
                                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                                        ระบบสำหรับผู้ดูแลระบบ HR เท่านั้น
                                    </p>
                                </div>
                            ) : (
                                <p className="text-center text-white/30 text-xs mt-6">
                                    Authorized Personnel Only
                                </p>
                            )}
                        </div>
                    </form>
                </div>

                {/* Footer Credit */}
                <p className="text-center text-white/40 text-xs mt-8 font-light">
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

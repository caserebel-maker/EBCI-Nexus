"use client"

import { useState, Suspense, type CSSProperties } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, IdCard, Lock, Eye, EyeOff } from 'lucide-react'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { useTranslation } from '@/contexts/language-context'

type LoginBackgroundTheme = 'night-city' | 'legacy-video' | 'city-night-video'

// Keep the old backgrounds available. Switch this constant to:
// - 'city-night-video' for the night city aerial/traffic drone video
// - 'night-city' for the 3D animated CSS city towers
// - 'legacy-video' for the abstract geometrical lines video
const LOGIN_BACKGROUND_THEME: LoginBackgroundTheme = 'legacy-video'

const CITY_TOWERS = [
    { left: '4%', top: '22%', width: '7.6rem', height: '18rem', rise: '124px', glow: 'rgba(14,165,233,0.40)', delay: '-4s' },
    { left: '14%', top: '38%', width: '5.8rem', height: '13rem', rise: '96px', glow: 'rgba(251,191,36,0.30)', delay: '-12s' },
    { left: '24%', top: '16%', width: '8.8rem', height: '22rem', rise: '150px', glow: 'rgba(45,212,191,0.34)', delay: '-18s' },
    { left: '36%', top: '34%', width: '6.6rem', height: '16rem', rise: '108px', glow: 'rgba(248,113,113,0.28)', delay: '-7s' },
    { left: '48%', top: '12%', width: '9.2rem', height: '25rem', rise: '166px', glow: 'rgba(96,165,250,0.38)', delay: '-15s' },
    { left: '62%', top: '30%', width: '7rem', height: '18rem', rise: '126px', glow: 'rgba(244,114,182,0.27)', delay: '-9s' },
    { left: '74%', top: '18%', width: '8rem', height: '21rem', rise: '145px', glow: 'rgba(34,197,94,0.30)', delay: '-22s' },
    { left: '84%', top: '42%', width: '5.4rem', height: '13rem', rise: '92px', glow: 'rgba(250,204,21,0.30)', delay: '-2s' },
    { left: '9%', top: '64%', width: '6.2rem', height: '12rem', rise: '82px', glow: 'rgba(56,189,248,0.32)', delay: '-19s' },
    { left: '22%', top: '72%', width: '8rem', height: '15rem', rise: '104px', glow: 'rgba(251,146,60,0.28)', delay: '-6s' },
    { left: '39%', top: '60%', width: '7.2rem', height: '14rem', rise: '98px', glow: 'rgba(45,212,191,0.30)', delay: '-13s' },
    { left: '55%', top: '68%', width: '9rem', height: '17rem', rise: '118px', glow: 'rgba(147,197,253,0.34)', delay: '-25s' },
    { left: '70%', top: '58%', width: '6.4rem', height: '15rem', rise: '102px', glow: 'rgba(248,113,113,0.26)', delay: '-11s' },
    { left: '86%', top: '70%', width: '7.4rem', height: '14rem', rise: '98px', glow: 'rgba(52,211,153,0.30)', delay: '-17s' },
] as const

function LoginBackground() {
    if (LOGIN_BACKGROUND_THEME === 'night-city') {
        return <NightCityBackground />
    }
    if (LOGIN_BACKGROUND_THEME === 'city-night-video') {
        return <CityNightVideoBackground />
    }
    return <LegacyVideoBackground />
}

function CityNightVideoBackground() {
    return (
        <div className="absolute inset-0 z-0 bg-black">
            <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover opacity-80"
            >
                <source src="https://videos.pexels.com/video-files/5992517/5992517-hd_1920_1080_30fps.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            {/* Vignette & Contrast Overlay */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_10%,rgba(0,0,0,0.75)_100%)] pointer-events-none" />
            
            {/* Brand Mix-Blend Color Overlay (matching Burgundy theme) */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#561e23]/40 to-[#ad5f6c]/30 mix-blend-color pointer-events-none" />
        </div>
    )
}

function LegacyVideoBackground() {
    return (
        <div className="absolute inset-0 z-0">
            <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
            >
                <source src="https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#561e23] to-[#ad5f6c] mix-blend-color opacity-90 pointer-events-none" />
        </div>
    )
}

function NightCityBackground() {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#080609]" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(15,118,110,0.34),transparent_32%),radial-gradient(circle_at_82%_24%,rgba(251,191,36,0.18),transparent_24%),linear-gradient(140deg,#05060b_0%,#1b0810_42%,#4a151e_72%,#0b0b12_100%)]" />
            <div className="login-city-camera">
                <div className="login-city-deck">
                    <div className="login-city-road login-city-road-a" />
                    <div className="login-city-road login-city-road-b" />
                    <div className="login-city-road login-city-road-c" />
                    {CITY_TOWERS.map((tower, index) => (
                        <div
                            key={`${tower.left}-${tower.top}`}
                            className="login-city-tower"
                            style={{
                                '--left': tower.left,
                                '--top': tower.top,
                                '--width': tower.width,
                                '--height': tower.height,
                                '--rise': tower.rise,
                                '--glow': tower.glow,
                                '--delay': tower.delay,
                                '--window-shift': `${index % 4}px`,
                            } as CSSProperties}
                        >
                            <span className="login-city-roof" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.62)_0%,rgba(3,7,18,0.12)_35%,rgba(86,30,35,0.20)_64%,rgba(3,7,18,0.68)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.12)_48%,rgba(0,0,0,0.74)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#180409]/90 via-[#4b151f]/34 to-transparent" />
            <style>{`
                .login-city-camera {
                    position: absolute;
                    inset: -18% -12%;
                    perspective: 980px;
                    transform-style: preserve-3d;
                }

                .login-city-deck {
                    position: absolute;
                    inset: 0;
                    transform-style: preserve-3d;
                    transform: rotateX(60deg) rotateZ(-14deg) translate3d(-2%, 2%, 0);
                    animation: loginCityOrbit 46s ease-in-out infinite alternate;
                }

                .login-city-road {
                    position: absolute;
                    border-radius: 999px;
                    background: linear-gradient(90deg, transparent, rgba(252, 211, 77, 0.30), rgba(56, 189, 248, 0.22), transparent);
                    box-shadow: 0 0 34px rgba(56, 189, 248, 0.18);
                    opacity: 0.7;
                }

                .login-city-road-a {
                    left: -8%;
                    right: -8%;
                    top: 49%;
                    height: 18px;
                }

                .login-city-road-b {
                    left: 48%;
                    top: -8%;
                    width: 18px;
                    bottom: -8%;
                    background: linear-gradient(180deg, transparent, rgba(244, 114, 182, 0.24), rgba(45, 212, 191, 0.25), transparent);
                }

                .login-city-road-c {
                    left: 12%;
                    right: 6%;
                    top: 24%;
                    height: 10px;
                    transform: rotateZ(24deg);
                    opacity: 0.46;
                }

                .login-city-tower {
                    position: absolute;
                    left: var(--left);
                    top: var(--top);
                    width: var(--width);
                    height: var(--height);
                    overflow: hidden;
                    border-radius: 8px 8px 3px 3px;
                    transform: translateZ(var(--rise));
                    transform-origin: center bottom;
                    background:
                        linear-gradient(90deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 22%, rgba(0,0,0,0.34) 100%),
                        repeating-linear-gradient(
                            180deg,
                            rgba(255,255,255,0.00) 0 13px,
                            rgba(255,255,255,0.26) 13px 15px,
                            rgba(255,255,255,0.00) 15px 28px
                        ),
                        repeating-linear-gradient(
                            90deg,
                            rgba(255,255,255,0.00) 0 calc(14px + var(--window-shift)),
                            rgba(251,191,36,0.42) calc(14px + var(--window-shift)) calc(17px + var(--window-shift)),
                            rgba(255,255,255,0.00) calc(17px + var(--window-shift)) 30px
                        ),
                        linear-gradient(180deg, rgba(148,163,184,0.68) 0%, rgba(30,41,59,0.92) 25%, rgba(8,13,27,0.98) 100%);
                    box-shadow:
                        inset 0 0 0 1px rgba(255,255,255,0.16),
                        inset -18px 0 34px rgba(0,0,0,0.30),
                        0 24px 54px rgba(0,0,0,0.48),
                        0 0 42px var(--glow);
                    animation: loginTowerPulse 8s ease-in-out infinite;
                    animation-delay: var(--delay);
                }

                .login-city-tower::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(255,255,255,0.20), transparent 22%, rgba(0,0,0,0.28) 100%);
                    pointer-events: none;
                }

                .login-city-roof {
                    position: absolute;
                    left: 8%;
                    right: 8%;
                    top: 7px;
                    height: 12px;
                    border-radius: 999px;
                    background: linear-gradient(90deg, rgba(255,255,255,0.40), rgba(45,212,191,0.34), rgba(251,191,36,0.30));
                    box-shadow: 0 0 24px var(--glow);
                    opacity: 0.72;
                }

                @keyframes loginCityOrbit {
                    0% {
                        transform: rotateX(62deg) rotateZ(-18deg) translate3d(-3%, 3%, 0);
                    }
                    100% {
                        transform: rotateX(56deg) rotateZ(13deg) translate3d(2%, -2%, 0);
                    }
                }

                @keyframes loginTowerPulse {
                    0%, 100% {
                        filter: brightness(0.92) saturate(1);
                    }
                    50% {
                        filter: brightness(1.08) saturate(1.15);
                    }
                }

                @media (max-width: 640px) {
                    .login-city-camera {
                        inset: -24% -64%;
                    }

                    .login-city-deck {
                        animation-duration: 58s;
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .login-city-deck,
                    .login-city-tower {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    )
}

function LoginForm() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showPw, setShowPw] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)
    const searchParams = useSearchParams()
    const redirectAfterLogin = searchParams.get('redirect') ?? null
    const messageParam = searchParams.get('message')

    const { t } = useTranslation()

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <LoginBackground />

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
                                    rememberMe,
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
                                {/*
                                    Hybrid identifier — accepts รหัสพนักงาน
                                    OR อีเมล. The form field is still named
                                    `email` so existing flows (password reset,
                                    saved sessions) keep working; the server
                                    resolves codes → email transparently.
                                    type="text" + autoComplete="username" so
                                    the browser/keychain doesn't keyboard-spam
                                    the @ key for code-only users.
                                */}
                                <IdCard className="absolute left-3 top-2.5 h-4 w-4 text-white/70" />
                                <input
                                    name="email"
                                    type="text"
                                    required
                                    autoComplete="username"
                                    inputMode="text"
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/60 pl-9 pr-3 py-2 rounded-xl focus:ring-2 focus:ring-[#882136] focus:border-white/50 outline-none transition-all hover:bg-white/20 shadow-none text-[15px]"
                                    placeholder="รหัสพนักงาน หรืออีเมล"
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

                        {/* Remember-me — extends signed cookie from 7 → 30
                            days. Default checked because the user base is
                            primarily older office staff on personal/work
                            devices that don't change hands often; logging
                            in weekly is the bigger risk than a forgotten
                            session on a shared computer. Anyone on a true
                            shared machine should untick. */}
                        <label className="flex items-center gap-2 text-white/80 text-[13px] select-none cursor-pointer mt-1">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                                className="h-4 w-4 rounded border-white/30 bg-white/10 accent-[#882136]"
                            />
                            <span>จำฉันไว้ในเครื่องนี้ (30 วัน)</span>
                        </label>

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

"use client"

import { useState } from 'react'
import { login } from './action'
import { Loader2, User, Lock } from 'lucide-react'

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)

        // Call Server Action
        const result = await login(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

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

            {/* 2. Glassmorphism Card (Switched to White Glass Theme) */}
            <div className="relative z-10 w-full max-w-md p-8 mx-4">
                <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-500">

                    {/* Header */}
                    <div className="text-center mb-10 flex flex-col items-center">
                        <img
                            src="/logo-white.png"
                            alt="EBCI NEXUS"
                            className="h-20 drop-shadow-[0_4px_10px_rgba(255,255,255,0.3)] mb-6 transition-transform hover:scale-105 duration-500"
                        />
                        <div className="text-white font-medium text-[10px] md:text-xs uppercase tracking-[0.4em] opacity-80 flex flex-col gap-1.5">
                            <span>Human Resources</span>
                            <span>Management System</span>
                        </div>
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
                                body: JSON.stringify(data)
                            })

                            const result = await res.json()

                            if (!res.ok) {
                                throw new Error(result.error || 'Login failed')
                            }

                            // Success -> Redirect
                            window.location.href = result.redirectTo
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
                                <User className="absolute left-3 top-3 h-5 w-5 text-white/70" />
                                <input
                                    name="username"
                                    type="text"
                                    required
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/60 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#882136] focus:border-white/50 outline-none transition-all hover:bg-white/20 shadow-none"
                                    placeholder="Employee ID"
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-white/70" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/60 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#882136] focus:border-white/50 outline-none transition-all hover:bg-white/20 shadow-none"
                                    placeholder="Password"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#561e23] to-[#ad5f6c] hover:from-[#ad5f6c] hover:to-[#c47080] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center border border-white/10"
                            >
                                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'SIGN IN'}
                            </button>
                            <p className="text-center text-white/30 text-xs mt-6">
                                Authorized Personnel Only
                            </p>
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

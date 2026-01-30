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
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
            {/* 1. Background Video (YouTube Iframe) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <iframe
                    // Reduced zoom from 300% to 150% to show more content
                    className="absolute top-1/2 left-1/2 w-[150vw] h-[150vh] -translate-x-1/2 -translate-y-1/2 opacity-70"
                    src="https://www.youtube.com/embed/VzJ2ym69oio?autoplay=1&mute=1&controls=0&loop=1&playlist=VzJ2ym69oio&showinfo=0&rel=0&iv_load_policy=3&disablekb=1&modestbranding=1"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                ></iframe>
                {/* Dark Overlay for Readability */}
                <div className="absolute inset-0 bg-black/50 pointer-events-none" />
            </div>

            {/* 2. Glassmorphism Card */}
            <div className="relative z-10 w-full max-w-md p-8 mx-4">
                <div className="backdrop-blur-sm bg-black/20 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-500">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-white tracking-wider mb-2 drop-shadow-md">EBCI NEXUS</h1>
                        <p className="text-white/70 text-sm font-light uppercase tracking-widest">Human Resources Management</p>
                    </div>

                    {/* Login Form */}
                    <form action={handleSubmit} className="space-y-6">

                        {error && (
                            <div className="bg-red-500/20 text-red-100 text-sm p-3 rounded-lg border border-red-500/50 text-center backdrop-blur-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-5 w-5 text-white/50" />
                                <input
                                    name="username"
                                    type="text"
                                    required
                                    className="w-full bg-transparent border border-white/30 text-white placeholder:text-white/60 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#882136] focus:border-white/50 outline-none transition-all hover:bg-white/5 shadow-inner"
                                    placeholder="Employee ID"
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-white/50" />
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full bg-transparent border border-white/30 text-white placeholder:text-white/60 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-[#882136] focus:border-white/50 outline-none transition-all hover:bg-white/5 shadow-inner"
                                    placeholder="Password"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-[#882136] to-[#a02840] hover:from-[#a02840] hover:to-[#b8304a] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center border border-white/10"
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

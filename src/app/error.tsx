'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home, LogIn } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Application error captured:', error)
    }, [error])

    return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 backdrop-blur-md text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center ring-1 ring-rose-500/30">
                    <AlertCircle size={30} />
                </div>

                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">
                        ระบบเกิดข้อผิดพลาดชั่วคราว
                    </h2>
                    <p className="text-xs text-white/70 leading-relaxed">
                        ไม่สามารถโหลดหน้าเว็บได้ อาจเกิดจากสัญญาณอินเทอร์เน็ตหลุด หรือเชื่อมต่อเซิร์ฟเวอร์ไม่ได้
                    </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                    <button
                        onClick={() => {
                            if (reset) {
                                reset()
                            } else {
                                window.location.reload()
                            }
                        }}
                        className="flex-1 py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/10"
                    >
                        <RefreshCw size={16} />
                        โหลดใหม่อีกครั้ง
                    </button>
                    <button
                        onClick={() => { window.location.href = '/' }}
                        className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/15 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Home size={16} />
                        กลับหน้าแรก
                    </button>
                </div>

                <div className="pt-2 border-t border-white/10">
                    <button
                        onClick={() => { window.location.href = '/login' }}
                        className="text-xs text-white/50 hover:text-white/80 inline-flex items-center gap-1.5 transition-colors underline decoration-dotted"
                    >
                        <LogIn size={13} />
                        เข้าสู่ระบบใหม่
                    </button>
                </div>
            </div>
        </div>
    )
}

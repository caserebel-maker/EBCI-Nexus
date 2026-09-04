'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw, Home, LogIn } from 'lucide-react'

export default function PortalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Portal error captured:', error)
    }, [error])

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 backdrop-blur-md text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center ring-1 ring-rose-500/30">
                    <AlertCircle size={30} />
                </div>

                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">
                        เกิดข้อผิดพลาดในการโหลดหน้าเว็บ
                    </h2>
                    <p className="text-xs text-white/70 leading-relaxed">
                        อาจเกิดจากสัญญาณอินเทอร์เน็ตขาดหายชั่วคราว หรือการเชื่อมต่อเซิร์ฟเวอร์ขัดข้อง
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
                        onClick={() => { window.location.href = '/portal' }}
                        className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/15 flex items-center justify-center gap-2 transition-colors"
                    >
                        <Home size={16} />
                        หน้าหลัก
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

                {error?.message && (
                    <details className="text-left text-[11px] text-white/40 pt-2">
                        <summary className="cursor-pointer hover:text-white/60">รายละเอียดเทคนิค</summary>
                        <pre className="mt-1 p-2 bg-black/40 rounded-lg overflow-x-auto text-rose-300/80 font-mono">
                            {error.message}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    )
}

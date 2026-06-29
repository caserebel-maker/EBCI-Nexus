'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

const REFRESH_SECONDS = 10

export function AutoRefresh() {
    const router = useRouter()
    const [secondsLeft, setSecondsLeft] = useState(REFRESH_SECONDS)

    useEffect(() => {
        const tick = window.setInterval(() => {
            setSecondsLeft(current => {
                if (current <= 1) {
                    router.refresh()
                    return REFRESH_SECONDS
                }
                return current - 1
            })
        }, 1000)

        return () => window.clearInterval(tick)
    }, [router])

    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
            <RefreshCw size={13} />
            อัปเดตอัตโนมัติใน {secondsLeft} วิ
        </div>
    )
}

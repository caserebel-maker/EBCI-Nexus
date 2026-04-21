'use client'

import { cn } from '@/lib/utils'
import { getGreeting } from '@/lib/greeting'

interface DailyGreetingProps {
    nickname?: string | null
    dateOfBirth?: string | null
    /** 'mobile' = compact one-line pill for header; 'desktop' = hero banner */
    variant?: 'mobile' | 'desktop'
    className?: string
}

/**
 * Daily/payday/birthday greeting, shared between mobile shell header and
 * desktop dashboard hero. Rotation logic lives in src/lib/greeting.ts.
 */
export function DailyGreeting({
    nickname,
    dateOfBirth,
    variant = 'desktop',
    className,
}: DailyGreetingProps) {
    const message = getGreeting({ nickname: nickname ?? null, dateOfBirth: dateOfBirth ?? null })

    if (variant === 'mobile') {
        return (
            <p
                className={cn(
                    'text-xs text-amber-300/90 font-semibold leading-snug text-center',
                    className,
                )}
            >
                {message}
            </p>
        )
    }

    // Desktop hero — centered, large, maroon-tinted plate with subtle divider
    return (
        <div
            className={cn(
                'py-4 mb-4 text-center border-b border-white/10',
                className,
            )}
        >
            <p
                className="font-bold leading-snug text-white px-4"
                style={{
                    fontSize: 'clamp(18px, 2.2vw, 28px)',
                    letterSpacing: '0.01em',
                    textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                }}
            >
                {message}
            </p>
        </div>
    )
}

'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Color = 'maroon' | 'amber' | 'green' | 'blue'
type Tone = 'up' | 'down' | 'warning' | 'neutral'

const PALETTE: Record<Color, {
    iconBg: string
    iconFg: string
    valueColor: string
    ringGlow: string
}> = {
    maroon: {
        iconBg: 'rgba(173,95,108,0.25)',
        iconFg: '#f9c5cd',
        valueColor: '#ffffff',
        ringGlow: 'rgba(173,95,108,0.4)',
    },
    amber: {
        iconBg: 'rgba(251,191,36,0.18)',
        iconFg: '#fcd34d',
        valueColor: '#ffffff',
        ringGlow: 'rgba(251,191,36,0.35)',
    },
    green: {
        iconBg: 'rgba(52,211,153,0.18)',
        iconFg: '#6ee7b7',
        valueColor: '#ffffff',
        ringGlow: 'rgba(52,211,153,0.35)',
    },
    blue: {
        iconBg: 'rgba(96,165,250,0.18)',
        iconFg: '#93c5fd',
        valueColor: '#ffffff',
        ringGlow: 'rgba(96,165,250,0.35)',
    },
}

const TONE_CLASS: Record<Tone, string> = {
    up: 'text-emerald-300',
    down: 'text-red-300',
    warning: 'text-amber-300',
    neutral: 'text-white/55',
}

interface Props {
    label: string
    value: string | number
    icon: LucideIcon
    color: Color
    hint?: string
    hintTone?: Tone
}

/**
 * Single stat tile — icon bubble + value + label + trend hint.
 * Glassmorphism with a subtle accent glow keyed off `color`.
 */
export function StatsCard({ label, value, icon: Icon, color, hint, hintTone = 'neutral' }: Props) {
    const p = PALETTE[color]
    return (
        <div
            className="relative p-4 sm:p-5 rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
            style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: `0 4px 24px ${p.ringGlow}`,
            }}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <p className="text-xs sm:text-[13px] font-semibold text-white/65 leading-tight">
                    {label}
                </p>
                <span
                    className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
                    style={{ background: p.iconBg }}
                >
                    <Icon size={17} style={{ color: p.iconFg }} />
                </span>
            </div>
            <p
                className="text-3xl sm:text-4xl font-black leading-none tracking-tight"
                style={{ color: p.valueColor }}
            >
                {value}
            </p>
            {hint && (
                <p className={cn('mt-2 text-[11px] sm:text-xs font-semibold', TONE_CLASS[hintTone])}>
                    {hint}
                </p>
            )}
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserMinus, ChevronRight, Loader2, Home, Plane, Palmtree } from 'lucide-react'

/**
 * Compact dashboard card "ใครไม่อยู่วันนี้".
 *
 * Mounts on /portal/dashboard between the Today Calendar Banner and
 * the Announcements Carousel. Self-fetches from /api/team/who-is-out
 * on mount; auto-hides when zero people are out (don't waste real
 * estate on empty state).
 *
 * Design constraints (from Mod's 4 May UX brief):
 *   - top 3-4 names visible (avatar + nickname + status badge)
 *   - "+N" overflow link → /portal/who-is-out (full detail page)
 *   - no reasons, no attachments — privacy is enforced at lib layer
 */

type Kind = 'leave' | 'wfh' | 'field'

interface Entry {
    employeeId: string
    firstNameTh: string
    nickname: string | null
    kind: Kind
    statusLabel: string
    isHalfDay: boolean
}

const PREVIEW_COUNT = 4

const kindStyles: Record<Kind, { bg: string; color: string; border: string; Icon: React.ElementType }> = {
    leave: { bg: 'rgba(74,222,128,0.12)', color: '#86efac', border: 'rgba(74,222,128,0.3)', Icon: Palmtree },
    wfh:   { bg: 'rgba(96,165,250,0.12)', color: '#93c5fd', border: 'rgba(96,165,250,0.3)', Icon: Home },
    field: { bg: 'rgba(251,146,60,0.12)', color: '#fdba74', border: 'rgba(251,146,60,0.3)', Icon: Plane },
}

export function WhoIsOutWidget() {
    const [entries, setEntries] = useState<Entry[] | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch('/api/team/who-is-out', { cache: 'no-store' })
                if (!res.ok) throw new Error('fetch failed')
                const json = await res.json()
                if (!cancelled) setEntries(json.entries ?? [])
            } catch {
                if (!cancelled) setEntries([])  // soft-fail: hide widget on error
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [])

    // Loading state — show a slim placeholder so the dashboard layout
    // doesn't jump when entries arrive a beat later.
    if (loading) {
        return (
            <div
                className="rounded-2xl p-3 flex items-center gap-2 text-white/40 text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
                <Loader2 size={14} className="animate-spin" />
                กำลังโหลด...
            </div>
        )
    }

    // Empty state — auto-hide. Mod's call: "ซ่อนเองอัตโนมัติถ้าทุกคนอยู่"
    if (!entries || entries.length === 0) return null

    const previewEntries = entries.slice(0, PREVIEW_COUNT)
    const overflow = entries.length - previewEntries.length

    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(6px)',
            }}
        >
            {/* Header */}
            <Link
                href="/portal/who-is-out"
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors active:bg-white/10"
            >
                <div className="flex items-center gap-2">
                    <UserMinus size={16} className="text-amber-300" />
                    <span className="text-sm font-bold text-white">
                        ใครไม่อยู่วันนี้ <span className="text-white/55 font-normal">({entries.length} คน)</span>
                    </span>
                </div>
                <span className="inline-flex items-center gap-0.5 text-xs text-white/55">
                    ดูทั้งหมด <ChevronRight size={13} />
                </span>
            </Link>

            {/* Rows */}
            <div className="divide-y divide-white/5">
                {previewEntries.map(e => {
                    const s = kindStyles[e.kind]
                    const displayName = e.nickname?.trim() || e.firstNameTh.trim() || 'พนักงาน'
                    return (
                        <div key={`${e.employeeId}-${e.kind}`} className="px-4 py-2.5 flex items-center gap-3">
                            {/* Avatar circle (initial) */}
                            <span
                                className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
                            >
                                {displayName.charAt(0)}
                            </span>
                            <span className="text-sm text-white font-medium truncate flex-1">{displayName}</span>
                            <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold whitespace-nowrap shrink-0"
                                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                            >
                                <s.Icon size={11} />
                                {e.statusLabel}
                            </span>
                        </div>
                    )
                })}

                {overflow > 0 && (
                    <Link
                        href="/portal/who-is-out"
                        className="block px-4 py-2.5 text-center text-xs text-white/55 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        +{overflow} คน · ดูทั้งหมด
                    </Link>
                )}
            </div>
        </div>
    )
}

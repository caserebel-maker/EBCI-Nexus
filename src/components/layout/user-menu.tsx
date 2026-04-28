'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Globe, KeyRound, LogOut, RefreshCw, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/language-context'

/**
 * Topbar profile dropdown — the future home of every "my account" action
 * (change password, switch mode, logout, and eventually theme + language
 * preferences + profile photo).
 *
 * The component is intentionally self-contained: it controls its own
 * open/close state, manages outside-click + Escape, and ships its own
 * styling. Drop another instance anywhere a topbar exists and it works.
 *
 * Why a dropdown instead of growing the sidebar? Account-level actions
 * are scoped to the authenticated user, not the page they're on; a
 * persistent topbar slot maps that intuition (Gmail/Slack/GitHub
 * pattern) without forcing HR Admins to switch into /portal mode just
 * to change their own password.
 */
interface UserMenuProps {
    fullName: string
    /** Optional — Supabase Auth email pulled server-side. Hidden if missing. */
    email: string | null
    roleLabel: string
    role: 'hr_admin' | 'manager' | 'employee'
    photoUrl: string | null
    /** Job title — surfaced in the dropdown header so the mobile identity
     *  card on every page can go away without losing the info. */
    position?: string | null
    department?: string | null
    /** Pre-formatted tenure string (e.g. "2 ปี 3 เดือน"). Computed
     *  server-side; we don't want to redo the math here. */
    tenure?: string | null
}

export function UserMenu({
    fullName, email, roleLabel, role, photoUrl,
    position, department, tenure,
}: UserMenuProps) {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const containerRef = useRef<HTMLDivElement>(null)
    const { language, toggleLanguage } = useLanguage()

    // HR admins toggle between /hradmin and /portal. The dropdown surfaces
    // the same affordance the sidebar already has so the action is
    // reachable from any page on any viewport.
    const inHradmin = pathname?.startsWith('/hradmin') ?? false
    const togglePath = inHradmin ? '/portal/dashboard' : '/hradmin/dashboard'
    const toggleLabel = inHradmin ? 'สลับเป็นพนักงาน' : 'กลับเป็น HR Admin'

    // Close on Escape — improves keyboard UX + dismisses cleanly when the
    // user opens a different control (e.g. the language toggle) which
    // doesn't intercept clicks themselves.
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    const initial = (fullName ?? 'U').charAt(0).toUpperCase()

    const handleLogout = async () => {
        setOpen(false)
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
        } catch (err) {
            console.warn('[user-menu] logout request failed:', err)
        }
        window.location.href = '/login'
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="เมนูบัญชีผู้ใช้"
                className="flex items-center gap-1 pl-0.5 pr-1.5 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
            >
                <span className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-white/30 bg-white/10 flex items-center justify-center shrink-0">
                    {photoUrl ? (
                        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-xs font-bold text-white">{initial}</span>
                    )}
                </span>
                <ChevronDown
                    size={13}
                    className={cn('text-white/75 transition-transform', open && 'rotate-180')}
                />
            </button>

            {open && (
                <>
                    {/* Click-outside backdrop. Sits below the panel but above
                        the rest of the page so any click anywhere else closes
                        the menu cleanly without needing an event listener on
                        the document. The 20% scrim makes the dropdown read as
                        "above" the page rather than floating in the same plane
                        as the topbar — without it the panel competes visually
                        with the maroon body gradient. */}
                    <div
                        className="fixed inset-0 z-[80] bg-black/20"
                        aria-hidden
                        onClick={() => setOpen(false)}
                    />
                    {/* Panel — anchored to the trigger's right edge. The width
                        is capped so it doesn't overflow narrow phone screens;
                        on iPhone SE-class widths it still leaves a 12-16px
                        margin from the viewport edge. */}
                    <div
                        role="menu"
                        className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] z-[90] rounded-2xl shadow-2xl overflow-hidden border"
                        style={{
                            // Maroon-tinted at 77% — matches the rest of the
                            // app brand (NotificationDropdown gradient base,
                            // ImageCropModal) instead of looking like a black
                            // floater. Lower opacity lets the page bleed
                            // through so the panel reads as "above" rather
                            // than "blocking", per the screenshot feedback.
                            background: 'rgba(60,15,20,0.77)',
                            borderColor: 'rgba(255,255,255,0.18)',
                            backdropFilter: 'blur(14px)',
                            WebkitBackdropFilter: 'blur(14px)',
                        }}
                    >
                        {/* Identity header — full HR identity (photo, name,
                            role, position/department, tenure, email) lives
                            here so the per-page mobile identity card can
                            be retired. Email + tenure stay subdued; the role
                            + name carry the primary weight. */}
                        <div className="px-4 py-3 border-b border-white/10 flex items-start gap-3">
                            <span className="h-12 w-12 rounded-full overflow-hidden ring-1 ring-white/25 bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-base font-bold text-white">{initial}</span>
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-white font-bold text-sm leading-tight truncate">{fullName}</p>
                                <p className="text-amber-300/85 text-xs mt-0.5 font-medium">{roleLabel}</p>
                                {(position || department) && (() => {
                                    // Department often duplicates the position
                                    // string ("หัวหน้าฝ่าย<dept>"), so strip
                                    // the prefix and skip the second line if
                                    // the dept name is already in the title.
                                    const pos = position ?? ''
                                    const dept = department ?? ''
                                    const normalizedDept = dept.replace(/^ฝ่าย|^แผนก/, '').trim()
                                    const deptInPos = !!normalizedDept && pos.includes(normalizedDept)
                                    const showDept = !!dept && !deptInPos
                                    return (
                                        <p className="text-white/75 text-[12px] mt-1 leading-snug break-words">
                                            {pos}
                                            {showDept && <span className="text-white/40 mx-1.5">·</span>}
                                            {showDept && <span className="text-white/65">{dept}</span>}
                                        </p>
                                    )
                                })()}
                                {tenure && (
                                    <p className="text-white/55 text-[11px] mt-1">อายุงาน {tenure}</p>
                                )}
                                {email && (
                                    <p className="text-white/55 text-[11px] mt-0.5 truncate">{email}</p>
                                )}
                            </div>
                        </div>

                        {/* Account actions */}
                        <div className="py-1">
                            <MenuItem
                                href="/portal/profile"
                                icon={UserCircle}
                                label="ข้อมูลส่วนตัว"
                                onSelect={() => setOpen(false)}
                            />
                            <MenuItem
                                href="/portal/settings"
                                icon={KeyRound}
                                label="เปลี่ยนรหัสผ่าน"
                                onSelect={() => setOpen(false)}
                            />
                        </div>

                        {/* Preferences — language live here so the topbar
                            stays cluttered-free. Future user prefs (theme,
                            notification opt-ins) come into this same group. */}
                        <div className="border-t border-white/10 py-1">
                            <button
                                type="button"
                                onClick={toggleLanguage}
                                role="menuitem"
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
                            >
                                <Globe size={16} className="text-white/75" />
                                <span>{language === 'th' ? 'ภาษา' : 'Language'}</span>
                                <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold tracking-widest text-white/85">
                                    <span className={cn('px-1.5 py-0.5 rounded', language === 'th' ? 'bg-amber-500/85 text-[#1a0a0d]' : 'text-white/50')}>TH</span>
                                    <span className={cn('px-1.5 py-0.5 rounded', language === 'en' ? 'bg-amber-500/85 text-[#1a0a0d]' : 'text-white/50')}>EN</span>
                                </span>
                            </button>
                        </div>

                        {/* Mode toggle — HR Admin only. The accent colour
                            mirrors the sidebar toggle (amber when in /portal
                            preview, blue when in /hradmin) so HR admins read
                            the two affordances as the same action. */}
                        {role === 'hr_admin' && (
                            <div className="border-t border-white/10 py-1">
                                <Link
                                    href={togglePath}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-2.5 text-sm font-semibold transition-colors',
                                        inHradmin
                                            ? 'text-blue-200 hover:bg-blue-500/15'
                                            : 'text-amber-200 hover:bg-amber-500/15',
                                    )}
                                    role="menuitem"
                                >
                                    <RefreshCw size={16} className={inHradmin ? 'text-blue-300' : 'text-amber-300'} />
                                    {toggleLabel}
                                </Link>
                            </div>
                        )}

                        {/* Logout — visually separated and red so it's hard
                            to misclick into. Mirrors the sidebar logout
                            colour scheme. */}
                        <div className="border-t border-white/10">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
                                role="menuitem"
                            >
                                <LogOut size={16} />
                                ออกจากระบบ
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Reusable internal building block ─────────────────────────────────────

function MenuItem({
    href,
    icon: Icon,
    label,
    onSelect,
}: {
    href: string
    icon: React.ElementType
    label: string
    onSelect?: () => void
}) {
    return (
        <Link
            href={href}
            onClick={onSelect}
            role="menuitem"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
        >
            <Icon size={16} className="text-white/75" />
            {label}
        </Link>
    )
}

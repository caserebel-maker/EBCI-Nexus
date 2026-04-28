'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
    ShieldCheck, X, Save, AlertTriangle, History, Loader2, Check,
    ChevronRight, Search, UserPlus, Eye, EyeOff,
} from 'lucide-react'
import {
    EMPTY_PERMISSIONS,
    PERMISSION_FLAGS,
    type UserPermissions,
} from '@/lib/permissions'
import {
    PERMISSION_PRESETS,
    PRESET_ORDER,
    detectPreset,
    type PresetName,
} from '@/lib/permission-presets'
import { updateUserPermissions, createUser } from './actions'

export interface UserRow {
    id: string
    username: string
    name: string
    role: string
    permissions: UserPermissions
    preset: PresetName | 'custom'
}

export interface AuditEntry {
    id: string
    target_user_id: string
    actor_name: string
    changed_at: string
    permissions_before: Partial<UserPermissions>
    permissions_after: Partial<UserPermissions>
    preset_before: string | null
    preset_after: string | null
    role_before: string | null
    role_after: string | null
    note: string | null
}

/** Lightweight projection of an employee that doesn't have a User
 *  account yet — used to populate the "link to employee" dropdown
 *  in the Create-User modal. */
export interface UnlinkedEmployee {
    id: string
    employee_code: string
    display_name: string
    department: string | null
    position: string | null
    email: string | null
}

interface Props {
    users: UserRow[]
    audits: AuditEntry[]
    currentUserId: string
    unlinkedEmployees: UnlinkedEmployee[]
}

const PRESET_TONE: Record<PresetName | 'custom', { bg: string; text: string; border: string }> = {
    super_admin:     { bg: 'bg-amber-500/15',   text: 'text-amber-200',   border: 'border-amber-400/40' },
    hr_manager:      { bg: 'bg-emerald-500/15', text: 'text-emerald-200', border: 'border-emerald-400/40' },
    payroll_manager: { bg: 'bg-sky-500/15',     text: 'text-sky-200',     border: 'border-sky-400/40' },
    executive:       { bg: 'bg-purple-500/15',  text: 'text-purple-200',  border: 'border-purple-400/40' },
    employee:        { bg: 'bg-white/10',       text: 'text-white/70',    border: 'border-white/15' },
    custom:          { bg: 'bg-rose-500/15',    text: 'text-rose-200',    border: 'border-rose-400/40' },
}

const CUSTOM_LABEL = '🛠️ Custom'

export function PermissionsView({ users, audits, currentUserId, unlinkedEmployees }: Props) {
    const [editing, setEditing] = useState<UserRow | null>(null)
    const [creating, setCreating] = useState(false)

    // Search filter — case-insensitive match across name, username, role,
    // and the resolved preset label so HR can type either "ปุ๋ย",
    // "wiyada", "payroll", or "บัญชี" and find the right person fast.
    //
    // When the search box is empty we additionally hide users whose preset
    // resolves to plain "employee" — i.e. role=employee/user with zero
    // permission flags set. The page is for managing privileges; rows with
    // nothing to manage just clutter the list (e.g. mock test users L1/L2,
    // or staff who got their flags revoked). HR can still find them by
    // typing their name — search overrides the default hide.
    const [query, setQuery] = useState('')
    const hiddenPlainEmployeeCount = useMemo(
        () => users.filter(u => u.preset === 'employee').length,
        [users],
    )
    const filteredUsers = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return users.filter(u => u.preset !== 'employee')
        return users.filter(u => {
            const presetLabel = u.preset === 'custom'
                ? CUSTOM_LABEL
                : PERMISSION_PRESETS[u.preset].label
            return (
                u.name.toLowerCase().includes(q)
                || u.username.toLowerCase().includes(q)
                || u.role.toLowerCase().includes(q)
                || presetLabel.toLowerCase().includes(q)
            )
        })
    }, [users, query])

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} className="text-amber-200" />
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">สิทธิ์การเข้าถึงระบบ</h1>
                    <p className="text-sm text-white/60 mt-0.5">
                        จัดการสิทธิ์ของผู้ใช้ทุกคน · เลือก preset หรือกำหนดทีละ flag · มี audit log ทุกการเปลี่ยนแปลง
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold shadow-lg shadow-emerald-500/30"
                >
                    <UserPlus size={14} />
                    <span className="hidden sm:inline">เพิ่มผู้ใช้ใหม่</span>
                    <span className="sm:hidden">เพิ่ม</span>
                </button>
            </div>

            {/* Search bar */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ค้นหา — ชื่อ, อีเมล, role, preset (เช่น ปุ๋ย / wiyada / payroll)"
                    className="w-full h-11 pl-9 pr-3 rounded-lg bg-black/25 border border-white/15 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-300/50"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                        title="ล้างคำค้น"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Hidden-rows hint — shown only when no search query is active.
                Tells HR that plain-employee accounts (no flags) are filtered
                out by default, and that typing a name will surface them. */}
            {!query && hiddenPlainEmployeeCount > 0 && (
                <p className="text-xs text-white/45 -mt-2 px-1">
                    ซ่อนผู้ใช้ที่ไม่มีสิทธิ์พิเศษ {hiddenPlainEmployeeCount} คน · พิมพ์ชื่อเพื่อค้นหา
                </p>
            )}

            {filteredUsers.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/55 text-sm">
                    ไม่พบผู้ใช้ที่ตรงกับ "{query}"
                </div>
            ) : (
                <>
                    {/* Users table — desktop */}
                    <div
                        className="hidden md:block rounded-2xl border border-white/10 overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)' }}
                    >
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/[0.03]">
                                    <th className="text-left px-4 py-3 font-semibold text-white/65">ผู้ใช้</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white/65">Role</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white/65">Preset</th>
                                    <th className="text-left px-4 py-3 font-semibold text-white/65">Active flags</th>
                                    <th className="text-right px-4 py-3 font-semibold text-white/65">การกระทำ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <UserRowDesktop
                                        key={u.id}
                                        user={u}
                                        isSelf={u.id === currentUserId}
                                        onEdit={() => setEditing(u)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="md:hidden space-y-2">
                        {filteredUsers.map(u => (
                            <UserRowMobile
                                key={u.id}
                                user={u}
                                isSelf={u.id === currentUserId}
                                onEdit={() => setEditing(u)}
                            />
                        ))}
                    </div>
                </>
            )}

            {editing && (
                <EditPermissionsModal
                    user={editing}
                    audits={audits.filter(a => a.target_user_id === editing.id).slice(0, 8)}
                    isSelf={editing.id === currentUserId}
                    onClose={() => setEditing(null)}
                />
            )}

            {creating && (
                <CreateUserModal
                    unlinkedEmployees={unlinkedEmployees}
                    onClose={() => setCreating(false)}
                />
            )}
        </div>
    )
}

// ─── Row components ──────────────────────────────────────────────────────

function FlagDots({ permissions }: { permissions: UserPermissions }) {
    return (
        <div className="flex flex-wrap items-center gap-1">
            {PERMISSION_FLAGS.map(({ key, label }) => {
                const active = permissions[key]
                return (
                    <span
                        key={key}
                        title={label}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            active
                                ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
                                : 'bg-white/[0.03] text-white/30 border-white/10 line-through'
                        }`}
                    >
                        {key.replace(/^can_/, '').replace(/_/g, ' ')}
                    </span>
                )
            })}
        </div>
    )
}

function PresetBadge({ preset }: { preset: PresetName | 'custom' }) {
    const tone = PRESET_TONE[preset]
    const label = preset === 'custom' ? CUSTOM_LABEL : PERMISSION_PRESETS[preset].label
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone.bg} ${tone.text} ${tone.border}`}>
            {label}
        </span>
    )
}

function UserRowDesktop({
    user, isSelf, onEdit,
}: {
    user: UserRow
    isSelf: boolean
    onEdit: () => void
}) {
    return (
        <tr className="border-b border-white/5 hover:bg-white/[0.04]">
            <td className="px-4 py-3">
                <div className="flex flex-col">
                    <p className="text-white font-semibold flex items-center gap-1.5">
                        {user.name}
                        {isSelf && (
                            <span className="text-[9px] font-bold uppercase bg-amber-400 text-black px-1 py-0.5 rounded leading-none">
                                คุณ
                            </span>
                        )}
                    </p>
                    <p className="text-[11px] text-white/45 font-mono">{user.username}</p>
                </div>
            </td>
            <td className="px-4 py-3 text-white/70 text-xs font-mono">{user.role}</td>
            <td className="px-4 py-3"><PresetBadge preset={user.preset} /></td>
            <td className="px-4 py-3"><FlagDots permissions={user.permissions} /></td>
            <td className="px-4 py-3 text-right">
                <button
                    onClick={onEdit}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15"
                >
                    แก้ไข <ChevronRight size={12} />
                </button>
            </td>
        </tr>
    )
}

function UserRowMobile({
    user, isSelf, onEdit,
}: {
    user: UserRow
    isSelf: boolean
    onEdit: () => void
}) {
    return (
        <button
            onClick={onEdit}
            className="w-full text-left p-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold flex items-center gap-1.5">
                        {user.name}
                        {isSelf && (
                            <span className="text-[9px] font-bold uppercase bg-amber-400 text-black px-1 py-0.5 rounded leading-none">
                                คุณ
                            </span>
                        )}
                    </p>
                    <p className="text-[11px] text-white/45 font-mono">{user.username} · {user.role}</p>
                    <div className="mt-1.5"><PresetBadge preset={user.preset} /></div>
                </div>
                <ChevronRight size={16} className="text-white/40 flex-shrink-0 mt-1" />
            </div>
            <div className="mt-2"><FlagDots permissions={user.permissions} /></div>
        </button>
    )
}

// ─── Edit modal ─────────────────────────────────────────────────────────

function EditPermissionsModal({
    user, audits, isSelf, onClose,
}: {
    user: UserRow
    audits: AuditEntry[]
    isSelf: boolean
    onClose: () => void
}) {
    const router = useRouter()
    const [, startTransition] = useTransition()
    const [permissions, setPermissions] = useState<UserPermissions>(user.permissions)
    // Role lives outside the permission-flag set but moves through the
    // same edit modal — switching from "employee" to "hr_admin" gives
    // the user the role-toggle button + admin sidebar, switching back
    // takes them away.
    const initialRole = (user.role as 'employee' | 'manager' | 'hr_admin' | string) || 'employee'
    const [role, setRole] = useState<'employee' | 'manager' | 'hr_admin'>(
        (['employee', 'manager', 'hr_admin'] as const).includes(initialRole as never)
            ? (initialRole as 'employee' | 'manager' | 'hr_admin')
            : 'employee',
    )
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Lock body scroll + Esc-to-close while open. Uses native event so
    // handler removal happens even when the modal unmounts mid-keypress.
    useEffect(() => {
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = prevOverflow
            window.removeEventListener('keydown', onKey)
        }
    }, [onClose])

    const detectedPreset = useMemo(() => detectPreset(permissions), [permissions])

    const applyPreset = (name: PresetName) => {
        setPermissions({ ...EMPTY_PERMISSIONS, ...PERMISSION_PRESETS[name].permissions })
    }
    const toggle = (key: keyof UserPermissions) => {
        setPermissions(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const flagsDirty = useMemo(
        () => PERMISSION_FLAGS.some(f => permissions[f.key] !== user.permissions[f.key]),
        [permissions, user.permissions],
    )
    const roleDirty = role !== initialRole
    const dirty = flagsDirty || roleDirty

    const save = async () => {
        setError(null)
        setSaving(true)
        const res = await updateUserPermissions({
            targetUserId: user.id,
            permissions,
            role: roleDirty ? role : undefined,
            note: note.trim() || null,
        })
        setSaving(false)
        if (!res.success) {
            setError(res.error ?? 'บันทึกไม่สำเร็จ')
            return
        }
        startTransition(() => { router.refresh() })
        onClose()
    }

    // Self-edit safety: warn before stripping super-admin from yourself.
    const aboutToLockSelfOut =
        isSelf && user.permissions.can_manage_system && !permissions.can_manage_system

    if (typeof document === 'undefined') return null
    return createPortal(
        <div
            className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center px-0 sm:px-4 py-0 sm:py-8"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`แก้ไขสิทธิ์ของ ${user.name}`}
                onClick={e => e.stopPropagation()}
                className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-[#2a0a0e] border-t sm:border border-white/15 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <header className="flex items-start justify-between gap-3 p-4 border-b border-white/10">
                    <div className="min-w-0">
                        <p className="text-white font-bold text-base">{user.name}</p>
                        <p className="text-[11px] text-white/50 font-mono">{user.username} · role={user.role}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                        aria-label="ปิด"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {aboutToLockSelfOut && (
                        <div
                            className="p-3 rounded-xl border border-rose-400/40 flex items-start gap-2 text-xs text-rose-100"
                            style={{ background: 'rgba(239,68,68,0.10)' }}
                        >
                            <AlertTriangle size={14} className="text-rose-300 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-semibold">⚠ คุณกำลังลด can_manage_system ของตัวเอง</p>
                                <p>การบันทึกจะทำให้คุณเข้าหน้านี้ไม่ได้อีก ต้องให้ Super Admin คนอื่นมาแก้คืน</p>
                            </div>
                        </div>
                    )}

                    {/* Role — controls which app shell + sidebar this user
                        sees + the legacy hr_admin gates. Editing this also
                        updates auth.users.user_metadata.role so the next
                        login picks up the new role without manual refresh. */}
                    <section>
                        <p className="text-[11px] uppercase tracking-wider text-white/45 mb-1.5 font-semibold">
                            Role (หน้าจอที่เห็น + ปุ่มสลับ)
                        </p>
                        <div className="grid grid-cols-3 gap-1.5">
                            {([
                                { value: 'employee', label: '👤 employee', desc: 'เข้า /portal · เมนูพนักงาน' },
                                { value: 'manager',  label: '👔 manager',  desc: 'เข้า /hradmin · เมนู manager' },
                                { value: 'hr_admin', label: '🔑 hr_admin', desc: 'เข้า /hradmin + ปุ่มสลับ portal' },
                            ] as const).map(({ value, label, desc }) => {
                                const active = role === value
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setRole(value)}
                                        title={desc}
                                        className={`text-left p-2 rounded-lg border text-xs font-semibold transition-all ${
                                            active
                                                ? 'bg-amber-400 text-[#561e23] border-amber-300 shadow'
                                                : 'bg-white/[0.04] text-white/85 border-white/10 hover:bg-white/[0.08]'
                                        }`}
                                    >
                                        <div>{label}</div>
                                        <p className={`mt-0.5 text-[10px] font-normal leading-snug ${active ? 'text-[#561e23]/70' : 'text-white/55'}`}>
                                            {desc}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                        {roleDirty && (
                            <p className="mt-1.5 text-[11px] text-amber-200">
                                ⚠ จะเปลี่ยน role จาก <span className="font-mono">{initialRole}</span> → <span className="font-mono">{role}</span> · user ต้อง logout แล้ว login ใหม่ถึงจะเห็นเมนูใหม่
                            </p>
                        )}
                    </section>

                    {/* Preset selector */}
                    <section>
                        <p className="text-[11px] uppercase tracking-wider text-white/45 mb-1.5 font-semibold">เลือก preset</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {PRESET_ORDER.map(name => {
                                const preset = PERMISSION_PRESETS[name]
                                const active = detectedPreset === name
                                return (
                                    <button
                                        key={name}
                                        onClick={() => applyPreset(name)}
                                        title={preset.description}
                                        className={`text-left p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                                            active
                                                ? 'bg-amber-400 text-[#561e23] border-amber-300 shadow'
                                                : 'bg-white/[0.04] text-white/85 border-white/10 hover:bg-white/[0.08]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1">{preset.label}</div>
                                        <p className={`mt-0.5 text-[10px] font-normal leading-snug line-clamp-2 ${active ? 'text-[#561e23]/70' : 'text-white/55'}`}>
                                            {preset.description}
                                        </p>
                                    </button>
                                )
                            })}
                            {detectedPreset === 'custom' && (
                                <div className="p-2.5 rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 text-xs font-semibold flex items-center gap-1">
                                    🛠️ Custom (ไม่ตรง preset)
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Per-flag checkboxes */}
                    <section>
                        <p className="text-[11px] uppercase tracking-wider text-white/45 mb-1.5 font-semibold">หรือกำหนดทีละ flag</p>
                        <div className="space-y-1">
                            {PERMISSION_FLAGS.map(({ key, label, description }) => {
                                const active = permissions[key]
                                return (
                                    <label
                                        key={key}
                                        className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                            active
                                                ? 'bg-emerald-500/10 border-emerald-400/30'
                                                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => toggle(key)}
                                            className="mt-0.5 h-4 w-4 accent-emerald-400 cursor-pointer"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-white">{label}</p>
                                            <p className="text-[11px] text-white/55 leading-snug">{description}</p>
                                        </div>
                                        {active && <Check size={14} className="text-emerald-300 flex-shrink-0 mt-1" />}
                                    </label>
                                )
                            })}
                        </div>
                    </section>

                    {/* Note */}
                    <section>
                        <label className="block text-[11px] uppercase tracking-wider text-white/45 mb-1.5 font-semibold">
                            เหตุผล (optional)
                        </label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            rows={2}
                            placeholder="เช่น 'มอบหน้าที่ payroll ให้บัญชีคนใหม่'"
                            className="w-full bg-white/[0.04] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                        />
                    </section>

                    {/* Audit history */}
                    <section>
                        <p className="text-[11px] uppercase tracking-wider text-white/45 mb-1.5 font-semibold flex items-center gap-1">
                            <History size={11} /> ประวัติการแก้ไข ({audits.length})
                        </p>
                        {audits.length === 0 ? (
                            <p className="text-xs text-white/40 italic px-1">ยังไม่เคยถูกแก้ไข</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {audits.map(a => (
                                    <li
                                        key={a.id}
                                        className="p-2 rounded-md border border-white/10 text-[11px] text-white/65"
                                        style={{ background: 'rgba(255,255,255,0.03)' }}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-white/45">
                                                {new Date(a.changed_at).toLocaleString('th-TH', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </span>
                                            <span className="text-white/55">โดย {a.actor_name}</span>
                                        </div>
                                        <p className="mt-0.5">
                                            <span className="text-white/45">{a.preset_before ?? 'unknown'}</span>
                                            {' → '}
                                            <span className="text-emerald-200 font-semibold">{a.preset_after ?? '?'}</span>
                                        </p>
                                        {a.note && <p className="mt-0.5 text-white/55 italic">"{a.note}"</p>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                {/* Footer */}
                <footer className="flex items-center justify-between gap-3 p-4 border-t border-white/10 bg-white/[0.02]">
                    <div className="text-xs text-white/55">
                        {dirty
                            ? <span className="text-amber-200">มีการแก้ไข — กดบันทึกเพื่อยืนยัน</span>
                            : 'ไม่มีการเปลี่ยนแปลง'}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 rounded-md text-sm font-semibold text-white/75 hover:text-white hover:bg-white/10"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={save}
                            disabled={!dirty || saving}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-semibold bg-amber-400 text-[#561e23] hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            บันทึก
                        </button>
                    </div>
                </footer>

                {error && (
                    <div className="absolute bottom-16 left-4 right-4 p-2 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-100 text-xs">
                        {error}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    )
}

// ─── Create User Modal ─────────────────────────────────────────────────

function CreateUserModal({
    unlinkedEmployees, onClose,
}: {
    unlinkedEmployees: UnlinkedEmployee[]
    onClose: () => void
}) {
    const router = useRouter()

    // Form state. Default to the Payroll Manager preset because that's
    // the most common "add another teammate" scenario right now (more
    // accounting hires after ปุ๋ย); HR can change it before saving.
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [role, setRole] = useState<'employee' | 'manager' | 'hr_admin'>('employee')
    const [employeeId, setEmployeeId] = useState<string>('')
    const [presetName, setPresetName] = useState<PresetName>('payroll_manager')
    const [permissions, setPermissions] = useState<UserPermissions>(
        PERMISSION_PRESETS.payroll_manager.permissions,
    )
    const [showPassword, setShowPassword] = useState(false)
    const [note, setNote] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Lock body scroll while open + Esc to close
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = prev
            window.removeEventListener('keydown', onKey)
        }
    }, [onClose])

    // Auto-fill name + email + role from the linked employee (if any).
    function pickEmployee(empId: string) {
        setEmployeeId(empId)
        if (!empId) return
        const emp = unlinkedEmployees.find(e => e.id === empId)
        if (!emp) return
        if (!name.trim()) setName(emp.display_name)
        if (!email.trim() && emp.email) setEmail(emp.email.toLowerCase())
    }

    function applyPreset(p: PresetName) {
        setPresetName(p)
        setPermissions(PERMISSION_PRESETS[p].permissions)
    }

    function toggleFlag(key: keyof UserPermissions) {
        setPermissions(prev => {
            const next = { ...prev, [key]: !prev[key] }
            // Recompute preset — flips to "custom" when flags don't
            // match any preset exactly (read-only display).
            return next
        })
    }
    const detected = detectPreset(permissions)

    async function handleSubmit() {
        if (saving) return
        setError(null)

        if (!email.trim()) return setError('ใส่อีเมลก่อน')
        if (!password) return setError('ตั้งรหัสผ่านก่อน')
        if (password.length < 4) return setError('รหัสผ่านต้องอย่างน้อย 4 ตัว')
        if (!name.trim()) return setError('ใส่ชื่อก่อน')

        setSaving(true)
        try {
            const result = await createUser({
                email: email.trim().toLowerCase(),
                password,
                name: name.trim(),
                role,
                employeeId: employeeId || null,
                permissions,
                note: note.trim() || null,
            })
            if (!result.success) {
                setError(result.error ?? 'ไม่สามารถสร้างผู้ใช้ได้')
                return
            }
            router.refresh()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
        } finally {
            setSaving(false)
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-3"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#15040a] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-[#15040a]">
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 inline-flex items-center justify-center">
                            <UserPlus size={16} className="text-emerald-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base">สร้างผู้ใช้ใหม่</h2>
                            <p className="text-white/55 text-xs">ระบบจะส่งอีเมล/รหัสผ่านให้ใช้ login ได้ทันที</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                    >
                        <X size={16} />
                    </button>
                </header>

                <div className="p-5 space-y-4">
                    {/* Optional: pick from existing employees who don't
                        have a User row yet. Auto-fills name + email so
                        HR doesn't retype what's already in employees. */}
                    {unlinkedEmployees.length > 0 && (
                        <Field label="เชื่อมกับพนักงานที่มีอยู่ (optional)">
                            <select
                                value={employeeId}
                                onChange={(e) => pickEmployee(e.target.value)}
                                disabled={saving}
                                className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            >
                                <option value="" className="bg-[#15040a]">— ไม่เชื่อม (สร้าง user แบบ standalone) —</option>
                                {unlinkedEmployees.map((emp) => (
                                    <option key={emp.id} value={emp.id} className="bg-[#15040a]">
                                        {emp.employee_code} · {emp.display_name}
                                        {emp.department ? ` · ${emp.department}` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-white/45 mt-1">
                                เลือกแล้ว ชื่อ + email จะถูก auto-fill · {unlinkedEmployees.length} คนที่ยังไม่มี account
                            </p>
                        </Field>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="อีเมล (ใช้ login) *">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={saving}
                                placeholder="user@ebcitrade.com"
                                className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            />
                        </Field>
                        <Field label="รหัสผ่านเริ่มต้น *">
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={saving}
                                    placeholder="≥ 4 ตัวอักษร"
                                    className="w-full h-10 pl-3 pr-10 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(s => !s)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center text-white/55 hover:text-white"
                                    title={showPassword ? 'ซ่อน' : 'แสดง'}
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </Field>
                        <Field label="ชื่อแสดงผล *">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={saving}
                                placeholder="เช่น สมชาย ใจดี (เอ)"
                                className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            />
                        </Field>
                        <Field label="Role">
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as typeof role)}
                                disabled={saving}
                                className="w-full h-10 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50"
                            >
                                <option value="employee" className="bg-[#15040a]">employee</option>
                                <option value="manager" className="bg-[#15040a]">manager</option>
                                <option value="hr_admin" className="bg-[#15040a]">hr_admin</option>
                            </select>
                        </Field>
                    </div>

                    {/* Preset picker */}
                    <Field label="Preset (เลือก preset แล้วทุก checkbox จะ auto)">
                        <div className="flex flex-wrap gap-2">
                            {PRESET_ORDER.map((p) => {
                                const active = presetName === p && detected === p
                                const tone = PRESET_TONE[p]
                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => applyPreset(p)}
                                        disabled={saving}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                            active ? `${tone.bg} ${tone.text} ${tone.border} ring-2 ring-amber-300/40` : 'bg-white/5 text-white/70 border-white/15 hover:bg-white/10'
                                        }`}
                                    >
                                        {PERMISSION_PRESETS[p].label}
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-[11px] text-white/55 mt-1.5">
                            ปัจจุบันคิดเป็น: <PresetBadge preset={detected} />
                        </p>
                    </Field>

                    {/* Per-flag checkboxes */}
                    <Field label="กำหนดทีละ flag (override preset)">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {PERMISSION_FLAGS.map(({ key, label, description }) => (
                                <label
                                    key={key}
                                    className="flex items-start gap-2 p-2 rounded-lg bg-black/20 border border-white/10 hover:border-white/25 cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={permissions[key]}
                                        onChange={() => toggleFlag(key)}
                                        disabled={saving}
                                        className="mt-0.5 h-4 w-4 accent-amber-400"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-white text-[0.85rem] font-semibold leading-tight">{label}</p>
                                        <p className="text-white/55 text-[0.72rem] leading-snug">{description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </Field>

                    {/* Audit note */}
                    <Field label="เหตุผล (เก็บใน audit log)">
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={saving}
                            rows={2}
                            placeholder="เช่น เพิ่มทีมบัญชีคนใหม่ — ตามคำขอเมื่อ 28 เม.ย."
                            className="w-full px-3 py-2 rounded-lg bg-black/25 border border-white/15 text-white text-sm focus:outline-none focus:border-amber-300/50 resize-none"
                        />
                    </Field>

                </div>

                {/* Footer + sticky error banner.
                    Original error <div> was inside the scrollable body so
                    a "ตั้งรหัสผ่านก่อน" warning sat above the form while
                    the user was looking at the action buttons. Pull it
                    into the same sticky container as the buttons so a
                    failed validation can't be missed. */}
                <footer className="sticky bottom-0 z-10 border-t border-white/10 bg-[#15040a]">
                    {error && (
                        <div className="px-5 pt-3 -mb-1">
                            <div className="rounded-lg bg-rose-500/15 border border-rose-500/40 px-3 py-2 text-[0.85rem] text-rose-100 inline-flex items-start gap-2 w-full">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span className="font-semibold">{error}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-end gap-2 px-5 py-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-sm font-semibold border border-white/15"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="px-5 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-500/30"
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" />
                                    กำลังสร้าง…
                                </>
                            ) : (
                                <>
                                    <Check size={13} />
                                    สร้างผู้ใช้
                                </>
                            )}
                        </button>
                    </div>
                </footer>
            </div>
        </div>,
        document.body,
    )
}

// ─── Field wrapper (shared) ─────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/55 font-bold mb-1.5 block">
                {label}
            </span>
            {children}
        </label>
    )
}


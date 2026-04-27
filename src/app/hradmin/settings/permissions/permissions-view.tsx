'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
    ShieldCheck, X, Save, AlertTriangle, History, Loader2, Check,
    ChevronRight,
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
import { updateUserPermissions } from './actions'

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

interface Props {
    users: UserRow[]
    audits: AuditEntry[]
    currentUserId: string
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

export function PermissionsView({ users, audits, currentUserId }: Props) {
    const [editing, setEditing] = useState<UserRow | null>(null)

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} className="text-amber-200" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">สิทธิ์การเข้าถึงระบบ</h1>
                    <p className="text-sm text-white/60 mt-0.5">
                        จัดการสิทธิ์ของผู้ใช้ทุกคน · เลือก preset หรือกำหนดทีละ flag · มี audit log ทุกการเปลี่ยนแปลง
                    </p>
                </div>
            </div>

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
                        {users.map(u => (
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
                {users.map(u => (
                    <UserRowMobile
                        key={u.id}
                        user={u}
                        isSelf={u.id === currentUserId}
                        onEdit={() => setEditing(u)}
                    />
                ))}
            </div>

            {editing && (
                <EditPermissionsModal
                    user={editing}
                    audits={audits.filter(a => a.target_user_id === editing.id).slice(0, 8)}
                    isSelf={editing.id === currentUserId}
                    onClose={() => setEditing(null)}
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

    const dirty = useMemo(
        () => PERMISSION_FLAGS.some(f => permissions[f.key] !== user.permissions[f.key]),
        [permissions, user.permissions],
    )

    const save = async () => {
        setError(null)
        setSaving(true)
        const res = await updateUserPermissions({
            targetUserId: user.id,
            permissions,
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


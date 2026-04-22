import {
    CheckCircle2, Clock, Hourglass, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusMeta {
    label: string
    chip: string
    icon: typeof Hourglass
}

/**
 * Single source of truth for applicant-status visuals. Kept in sync
 * with the STATUS_META in the list view; imported by the detail
 * header, status dropdown, and anywhere else admin surfaces render a
 * status pill.
 */
export const STATUS_META: Record<string, StatusMeta> = {
    draft:        { label: 'ร่าง',          chip: 'bg-white/20 text-white/85',    icon: Hourglass },
    submitted:    { label: 'ส่งแล้ว',        chip: 'bg-blue-500/80 text-white',     icon: CheckCircle2 },
    reviewing:    { label: 'กำลังพิจารณา',   chip: 'bg-amber-500/85 text-black',    icon: Clock },
    shortlisted:  { label: 'เข้ารอบ',       chip: 'bg-purple-500/85 text-white',   icon: CheckCircle2 },
    interview:    { label: 'สัมภาษณ์',      chip: 'bg-indigo-500/85 text-white',   icon: CheckCircle2 },
    hired:        { label: 'เสนองาน',       chip: 'bg-emerald-500/90 text-white',  icon: CheckCircle2 },
    rejected:     { label: 'ไม่ผ่าน',       chip: 'bg-red-500/85 text-white',      icon: X },
    // Legacy values that might still live on rows from before the rename
    interviewed:  { label: 'สัมภาษณ์แล้ว',  chip: 'bg-indigo-500/85 text-white',   icon: CheckCircle2 },
    offered:      { label: 'เสนองาน',       chip: 'bg-emerald-500/90 text-white',  icon: CheckCircle2 },
    withdrawn:    { label: 'ถอนใบสมัคร',    chip: 'bg-white/10 text-white/50',     icon: X },
}

export function StatusBadge({
    status, size = 'md',
}: {
    status: string
    size?: 'sm' | 'md'
}) {
    const meta = STATUS_META[status] ?? STATUS_META.draft
    const Icon = meta.icon
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-md font-bold uppercase tracking-wider shadow-sm',
                meta.chip,
                size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
            )}
        >
            <Icon size={size === 'sm' ? 10 : 12} />
            {meta.label}
        </span>
    )
}

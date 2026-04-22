'use client'

import { cn } from '@/lib/utils'

// Shared primitive inputs used across every Step component.
// Pure presentational — each takes a value + onChange callback + optional
// label / help / required / placeholder props. No form-library coupling,
// no React.useState inside — parent owns the value.

// ── TextField ────────────────────────────────────────────────────────────
export function TextField({
    label, value, onChange, required, placeholder, type = 'text', help,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    required?: boolean
    placeholder?: string
    type?: 'text' | 'email' | 'tel' | 'url'
    help?: string
}) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="mt-1.5 w-full h-11 px-3.5 rounded-lg bg-black/25 border border-white/15 text-white placeholder:text-white/30 text-[15px] focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/40 transition-colors"
            />
            {help && <p className="text-[11px] text-white/40 mt-1">{help}</p>}
        </label>
    )
}

// ── NumberField ──────────────────────────────────────────────────────────
export function NumberField({
    label, value, onChange, required, placeholder, min, max, step = 1, help,
}: {
    label: string
    value: number | null
    onChange: (v: number | null) => void
    required?: boolean
    placeholder?: string
    min?: number
    max?: number
    step?: number
    help?: string
}) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <input
                type="number"
                value={value ?? ''}
                onChange={e => {
                    const s = e.target.value
                    onChange(s === '' ? null : Number(s))
                }}
                placeholder={placeholder}
                required={required}
                min={min} max={max} step={step}
                className="mt-1.5 w-full h-11 px-3.5 rounded-lg bg-black/25 border border-white/15 text-white placeholder:text-white/30 text-[15px] tabular-nums focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/40 transition-colors"
            />
            {help && <p className="text-[11px] text-white/40 mt-1">{help}</p>}
        </label>
    )
}

// ── TextareaField ────────────────────────────────────────────────────────
export function TextareaField({
    label, value, onChange, required, placeholder, rows = 3, help,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    required?: boolean
    placeholder?: string
    rows?: number
    help?: string
}) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                rows={rows}
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-lg bg-black/25 border border-white/15 text-white placeholder:text-white/30 text-[15px] focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/40 transition-colors"
            />
            {help && <p className="text-[11px] text-white/40 mt-1">{help}</p>}
        </label>
    )
}

// ── DateField ────────────────────────────────────────────────────────────
export function DateField({
    label, value, onChange, required, min, max, help,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    required?: boolean
    min?: string
    max?: string
    help?: string
}) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <input
                type="date"
                value={value}
                onChange={e => onChange(e.target.value)}
                required={required}
                min={min} max={max}
                className="mt-1.5 w-full h-11 px-3.5 rounded-lg bg-black/25 border border-white/15 text-white text-[15px] focus:outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/40 transition-colors"
            />
            {help && <p className="text-[11px] text-white/40 mt-1">{help}</p>}
        </label>
    )
}

// ── SelectField ──────────────────────────────────────────────────────────
export function SelectField({
    label, value, onChange, options, required, help,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    options: Array<{ value: string; label: string }>
    required?: boolean
    help?: string
}) {
    return (
        <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                required={required}
                className="mt-1.5 w-full h-11 px-3 rounded-lg bg-black/25 border border-white/15 text-white text-[15px] focus:outline-none focus:border-amber-300/50"
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {help && <p className="text-[11px] text-white/40 mt-1">{help}</p>}
        </label>
    )
}

// ── RadioGroup ───────────────────────────────────────────────────────────
export function RadioGroup({
    label, value, onChange, options, required, help,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    options: Array<string | { value: string; label: string }>
    required?: boolean
    help?: string
}) {
    const normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
    return (
        <div>
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
                {normalized.map(o => {
                    const active = value === o.value
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => onChange(o.value)}
                            className={cn(
                                'px-4 h-10 rounded-lg text-sm font-semibold transition-all border',
                                active
                                    ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/25'
                                    : 'bg-black/25 text-white/80 border-white/15 hover:bg-white/10',
                            )}
                        >
                            {o.label}
                        </button>
                    )
                })}
            </div>
            {help && <p className="text-[11px] text-white/40 mt-1.5">{help}</p>}
        </div>
    )
}

// ── YesNoField (tri-state: null/true/false) ─────────────────────────────
export function YesNoField({
    label, value, onChange, required, help,
}: {
    label: string
    value: boolean | null
    onChange: (v: boolean) => void
    required?: boolean
    help?: string
}) {
    return (
        <div>
            <span className="text-[11px] uppercase tracking-wider text-white/65 font-bold inline-flex items-center gap-1">
                {label}
                {required && <span className="text-red-300">*</span>}
            </span>
            <div className="mt-2 flex items-center gap-2">
                {([
                    { value: true, label: 'ใช่' },
                    { value: false, label: 'ไม่' },
                ] as const).map(o => {
                    const active = value === o.value
                    return (
                        <button
                            key={String(o.value)}
                            type="button"
                            onClick={() => onChange(o.value)}
                            className={cn(
                                'px-5 h-10 rounded-lg text-sm font-semibold transition-all border',
                                active
                                    ? (o.value ? 'bg-emerald-500/80 text-white border-emerald-400' : 'bg-white/10 text-white/85 border-white/20')
                                    : 'bg-black/25 text-white/70 border-white/15 hover:bg-white/10',
                            )}
                        >
                            {o.label}
                        </button>
                    )
                })}
            </div>
            {help && <p className="text-[11px] text-white/40 mt-1.5">{help}</p>}
        </div>
    )
}

// ── CheckboxField ───────────────────────────────────────────────────────
export function CheckboxField({
    label, checked, onChange, help,
}: {
    label: React.ReactNode
    checked: boolean
    onChange: (v: boolean) => void
    help?: string
}) {
    return (
        <label className="flex items-start gap-2.5 cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="h-4 w-4 mt-0.5 accent-amber-400 shrink-0"
            />
            <span className="text-sm text-white/85 leading-snug">
                {label}
                {help && <span className="block text-[11px] text-white/45 mt-0.5">{help}</span>}
            </span>
        </label>
    )
}

// ── FormSection wrapper ─────────────────────────────────────────────────
export function FormSection({
    title, icon, children, description,
}: {
    title: string
    icon?: React.ReactNode
    description?: string
    children: React.ReactNode
}) {
    return (
        <section className="space-y-3">
            <div>
                <h3 className="text-white font-bold text-[15px] inline-flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
                {description && <p className="text-[12px] text-white/55 mt-0.5">{description}</p>}
            </div>
            {children}
        </section>
    )
}

'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronDown, Calendar, Loader2 } from 'lucide-react'

/**
 * Year dropdown — values in storage (Gregorian) but shown in Buddhist Era.
 *
 * Navigating sets `?year=2026` and the server page re-fetches with the
 * new bounds. useTransition gives us a pending state during the RSC
 * round-trip without awkward loading skeletons.
 */
export function YearSelector({ currentYear }: { currentYear: number }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Show 3 years: previous, current, next. If the selected year is
    // outside that window (e.g. archive lookup) we add it too.
    const now = new Date().getFullYear()
    const baseYears = [now - 1, now, now + 1]
    const years = baseYears.includes(currentYear) ? baseYears : [currentYear, ...baseYears]
    const uniqueYears = Array.from(new Set(years)).sort((a, b) => b - a)

    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const next = parseInt(e.target.value, 10)
        if (!Number.isFinite(next) || next === currentYear) return
        const sp = new URLSearchParams(searchParams.toString())
        sp.set('year', String(next))
        startTransition(() => {
            router.replace(`${pathname}?${sp.toString()}`)
        })
    }

    return (
        <label
            className="inline-flex items-center gap-2 pl-3 pr-2 h-11 rounded-xl border border-white/15 text-white text-sm font-semibold shrink-0 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}
        >
            {isPending
                ? <Loader2 size={15} className="text-white/60 animate-spin" />
                : <Calendar size={15} className="text-white/60" />}
            <span className="text-white/55 text-xs hidden sm:inline">ปี:</span>
            <select
                value={currentYear}
                onChange={onChange}
                disabled={isPending}
                className="bg-transparent border-0 appearance-none pr-6 text-white font-semibold focus:outline-none disabled:opacity-60 cursor-pointer"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e\")",
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 4px center',
                }}
            >
                {uniqueYears.map(y => (
                    <option key={y} value={y} className="bg-[#2a0a0e] text-white">
                        {y + 543} ({y})
                    </option>
                ))}
            </select>
            {/* Keep the caret visually consistent across browsers */}
            <ChevronDown size={14} className="text-white/40 hidden" aria-hidden="true" />
        </label>
    )
}

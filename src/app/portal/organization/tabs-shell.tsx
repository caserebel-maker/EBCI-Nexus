'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Network, ShieldCheck, Route } from 'lucide-react'
import type { OrgEmployee } from './view-department'
import type { UserPermissions } from '@/lib/permissions'
import { TabStructure } from './tab-structure'
import { TabAuthority } from './tab-authority'
import { TabMyChain } from './tab-my-chain'

type ViewKey = 'structure' | 'authority' | 'my-chain'

const TABS: Array<{ key: ViewKey; label: string; Icon: typeof Network }> = [
    { key: 'structure', label: 'โครงสร้าง',          Icon: Network },
    { key: 'authority', label: 'อำนาจอนุมัติ',        Icon: ShieldCheck },
    { key: 'my-chain',  label: 'สายอนุมัติของฉัน',    Icon: Route },
]

interface Props {
    employees: OrgEmployee[]
    currentEmployeeId: string | null
    permissions: UserPermissions
}

export function TabsShell({ employees, currentEmployeeId, permissions }: Props) {
    const params = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const viewParam = params.get('view')
    const view: ViewKey =
        viewParam === 'authority' || viewParam === 'my-chain' ? viewParam : 'structure'

    const switchTab = useCallback(
        (key: ViewKey) => {
            const sp = new URLSearchParams(params.toString())
            if (key === 'structure') sp.delete('view')
            else sp.set('view', key)
            if (key !== 'structure') sp.delete('sub')
            const qs = sp.toString()
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        },
        [params, router, pathname],
    )

    return (
        <div className="space-y-4 lg:space-y-6">
            <div
                role="tablist"
                aria-label="มุมมองผังองค์กร"
                className="flex gap-1 p-1 rounded-xl border border-white/15"
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}
            >
                {TABS.map(({ key, label, Icon }) => {
                    const active = view === key
                    return (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => switchTab(key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                                active
                                    ? 'bg-amber-400 text-[#561e23] shadow-md'
                                    : 'text-white/80 hover:bg-white/10'
                            }`}
                        >
                            <Icon size={16} className="flex-shrink-0" />
                            <span>{label}</span>
                        </button>
                    )
                })}
            </div>

            {view === 'structure' && (
                <TabStructure
                    employees={employees}
                    currentEmployeeId={currentEmployeeId}
                    canSeeHeadcount={permissions.can_view_all_employees}
                />
            )}
            {view === 'authority' && <TabAuthority permissions={permissions} />}
            {view === 'my-chain' && <TabMyChain permissions={permissions} />}
        </div>
    )
}

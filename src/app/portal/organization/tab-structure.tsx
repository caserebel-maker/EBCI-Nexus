'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Building2, Users, LayoutGrid } from 'lucide-react'
import { type OrgEmployee } from './view-department'
import { DepartmentOnlyView } from './view-department-only'
import { PeopleView } from './view-people'
import { OverviewView } from './view-overview'

type SubKey = 'department' | 'people' | 'overview'

interface Props {
    employees: OrgEmployee[]
    currentEmployeeId: string | null
    canSeeHeadcount: boolean
    viewerDepartment: string | null
    viewerSecondaryDepartment: string | null
    viewerLevel: number
    canSeeFullOrg: boolean
}

export function TabStructure({
    employees,
    currentEmployeeId,
    canSeeHeadcount,
    viewerDepartment,
    viewerSecondaryDepartment,
    viewerLevel: _viewerLevel,
    canSeeFullOrg,
}: Props) {
    void _viewerLevel

    const params = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    // "people" sub-view is L3+/admin only. L1/L2 can still use 'overview'.
    const requestedSub =
        params.get('sub') === 'people'   ? 'people'
      : params.get('sub') === 'overview' ? 'overview'
      :                                    'department'
    const sub: SubKey =
        requestedSub === 'people' && !canSeeFullOrg ? 'department' : requestedSub

    const switchSub = useCallback(
        (next: SubKey) => {
            const sp = new URLSearchParams(params.toString())
            if (next === 'department') sp.delete('sub')
            else sp.set('sub', next)
            const qs = sp.toString()
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
        },
        [params, router, pathname],
    )

    return (
        <div className="space-y-4 lg:space-y-6">
            <div
                role="tablist"
                aria-label="มุมมองย่อย"
                className="inline-flex gap-1 p-1 rounded-lg border border-white/15"
                style={{ background: 'rgba(255,255,255,0.04)' }}
            >
                <SubButton
                    active={sub === 'department'}
                    onClick={() => switchSub('department')}
                    icon={<Building2 size={14} />}
                    label="มุมมองแผนก"
                />
                <SubButton
                    active={sub === 'overview'}
                    onClick={() => switchSub('overview')}
                    icon={<LayoutGrid size={14} />}
                    label="ภาพรวมองค์กร"
                />
                {canSeeFullOrg && (
                    <SubButton
                        active={sub === 'people'}
                        onClick={() => switchSub('people')}
                        icon={<Users size={14} />}
                        label="มุมมองรายบุคคล"
                    />
                )}
            </div>

            {sub === 'department' && (
                <DepartmentOnlyView
                    employees={employees}
                    currentEmployeeId={currentEmployeeId}
                    viewerDepartment={viewerDepartment}
                    viewerSecondaryDepartment={viewerSecondaryDepartment}
                />
            )}
            {sub === 'overview' && <OverviewView employees={employees} />}
            {sub === 'people' && canSeeFullOrg && (
                <PeopleView
                    employees={employees}
                    currentEmployeeId={currentEmployeeId}
                    canSeeHeadcount={canSeeHeadcount}
                />
            )}
        </div>
    )
}

function SubButton({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
}) {
    return (
        <button
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                active ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/90 hover:bg-white/5'
            }`}
        >
            {icon}
            {label}
        </button>
    )
}

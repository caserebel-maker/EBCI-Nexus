'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Building2, Users } from 'lucide-react'
import { DepartmentView, type OrgEmployee } from './view-department'
import { DepartmentOnlyView } from './view-department-only'
import { PeopleView } from './view-people'

type SubKey = 'department' | 'people'

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
    // Suppress unused-var warning while keeping the prop available for
    // future per-level behaviour in Phase B/C.
    void _viewerLevel
    const params = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const sub: SubKey = params.get('sub') === 'people' ? 'people' : 'department'

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
                    active={sub === 'people'}
                    onClick={() => switchSub('people')}
                    icon={<Users size={14} />}
                    label="มุมมองรายบุคคล"
                />
            </div>

            {sub === 'department' && (
                canSeeFullOrg ? (
                    <DepartmentView
                        employees={employees}
                        currentEmployeeId={currentEmployeeId}
                    />
                ) : (
                    <DepartmentOnlyView
                        employees={employees}
                        currentEmployeeId={currentEmployeeId}
                        viewerDepartment={viewerDepartment}
                        viewerSecondaryDepartment={viewerSecondaryDepartment}
                    />
                )
            )}
            {sub === 'people' && (
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

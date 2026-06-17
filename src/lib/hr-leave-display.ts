export type CoreLeaveType = 'annual' | 'personal' | 'sick'

export type DashboardLeaveBalance = {
    leaveType: string
    entitledDays: number
    usedDays: number
    pendingDays: number
    remainingDays: number
}

export const CORE_LEAVE_TYPES: CoreLeaveType[] = ['annual', 'personal', 'sick']

export const CORE_LEAVE_ALIASES: Record<CoreLeaveType, string[]> = {
    annual: ['annual', 'annual_leave', 'vacation'],
    personal: ['personal', 'personal_leave', 'business_leave', 'business'],
    sick: ['sick', 'sick_leave'],
}

export const DEFAULT_CORE_LEAVE_TOTALS: Record<CoreLeaveType, number> = {
    annual: 6,
    personal: 3,
    sick: 30,
}

export function canonicalCoreLeaveType(leaveTypeId: string | null | undefined): CoreLeaveType | null {
    if (!leaveTypeId) return null
    const normalized = leaveTypeId.trim().toLowerCase()
    for (const type of CORE_LEAVE_TYPES) {
        if (CORE_LEAVE_ALIASES[type].includes(normalized)) return type
    }
    return null
}

export function emptyCoreLeaveBalance(type: CoreLeaveType): DashboardLeaveBalance {
    const total = DEFAULT_CORE_LEAVE_TOTALS[type]
    return {
        leaveType: type,
        entitledDays: total,
        usedDays: 0,
        pendingDays: 0,
        remainingDays: total,
    }
}


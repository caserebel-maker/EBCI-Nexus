// Approval levels for org hierarchy and leave approval routing.
// HR Admin is NOT a level here — it's a system role (users.role='hr_admin').
export const EMPLOYEE_LEVELS: Record<number, { label: string; color: string }> = {
    1: { label: 'Level 1 — พนักงานทั่วไป',              color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    2: { label: 'Level 2 — หัวหน้าแผนก',                 color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    3: { label: 'Level 3 — หัวหน้าฝ่าย / ผู้จัดการ',    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    4: { label: 'Level 4 — MD (กรรมการผู้จัดการ)',       color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    5: { label: 'Level 5 — ประธาน / เจ้าของ',             color: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/40' },
}

export const LEVEL_BADGE_COLORS: Record<number, string> = {
    1: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    2: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    3: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    4: 'bg-red-500/20 text-red-300 border-red-500/30',
    5: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/40',
}

export const LEVEL_SHORT: Record<number, string> = {
    1: 'Lv.1',
    2: 'Lv.2',
    3: 'Lv.3',
    4: 'Lv.4',
    5: 'Lv.5',
}

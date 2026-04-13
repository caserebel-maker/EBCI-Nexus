export const EMPLOYEE_LEVELS: Record<number, { label: string; color: string }> = {
    1: { label: 'Level 1 — พนักงานทั่วไป',       color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    2: { label: 'Level 2 — หัวหน้าแผนก',          color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    3: { label: 'Level 3 — หัวหน้าฝ่าย / ผู้จัดการ', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    4: { label: 'Level 4 — HR Admin / MD',         color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
}

export const LEVEL_BADGE_COLORS: Record<number, string> = {
    1: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    2: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    3: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    4: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

export const LEVEL_SHORT: Record<number, string> = {
    1: 'Lv.1',
    2: 'Lv.2',
    3: 'Lv.3',
    4: 'Lv.4',
}

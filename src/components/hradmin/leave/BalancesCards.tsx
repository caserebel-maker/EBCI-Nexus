'use client'

import { Pencil } from 'lucide-react'
import { BalanceCellBadge } from './BalancesTable'
import type { BalanceCell, EmployeeRowLite, LeaveTypeLite } from './types'

interface Props {
    employees: EmployeeRowLite[]
    leaveTypes: LeaveTypeLite[]
    balancesByEmployee: Record<string, Record<string, BalanceCell>>
    visibleTypeIds: string[]
    onEditEmployee: (employeeId: string) => void
    onEditCell: (employeeId: string, leaveTypeId: string) => void
}

/**
 * Mobile layout for Tab 3. One card per employee; each leave type is a
 * row inside the card with the same color-coded "used / total" badge
 * as the desktop pivot. Tapping a row opens the modal on that type;
 * the pencil icon opens it for all types.
 */
export function BalancesCards({
    employees, leaveTypes, balancesByEmployee,
    visibleTypeIds, onEditEmployee, onEditCell,
}: Props) {
    const types = visibleTypeIds.length > 0
        ? leaveTypes.filter(t => visibleTypeIds.includes(t.id))
        : leaveTypes

    if (employees.length === 0) {
        return (
            <div
                className="rounded-2xl border border-white/10 p-10 text-center"
                style={{ background: 'rgba(255,255,255,0.04)' }}
            >
                <p className="text-white/70 font-semibold">ไม่พบพนักงานที่ตรงกับตัวกรอง</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {employees.map(emp => {
                const cells = balancesByEmployee[emp.id] ?? {}
                return (
                    <div
                        key={emp.id}
                        className="rounded-xl border border-white/10 overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                        {/* Header */}
                        <div className="px-3 py-2.5 border-b border-white/5 flex items-center gap-3">
                            <span className="rounded-full overflow-hidden bg-white/10 w-10 h-10 flex items-center justify-center shrink-0 border border-white/10">
                                {emp.photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={emp.photo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-white/75 text-xs font-bold">
                                        {(emp.nickname?.[0] ?? emp.first_name_th?.[0] ?? '?').toUpperCase()}
                                    </span>
                                )}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-semibold text-sm truncate">
                                    {emp.nickname ?? emp.first_name_th ?? '—'}
                                    <span className="ml-1.5 text-white/45 font-normal text-[11px]">
                                        {emp.employee_code ?? ''}
                                    </span>
                                </p>
                                <p className="text-[11px] text-white/50 truncate">
                                    {emp.department ?? '—'}
                                    {emp.approval_level ? ` · L${emp.approval_level}` : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => onEditEmployee(emp.id)}
                                className="h-9 w-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="แก้ไขยอดทั้งหมด"
                            >
                                <Pencil size={14} />
                            </button>
                        </div>

                        {/* Leave types */}
                        <div className="divide-y divide-white/5">
                            {types.map(t => {
                                const cell = cells[t.id]
                                const color = t.color ?? '#f9c5cd'
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => onEditCell(emp.id, t.id)}
                                        className="flex items-center justify-between gap-3 w-full px-3 py-2.5 hover:bg-white/5 active:bg-white/10 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span
                                                className="w-2 h-6 rounded-full shrink-0"
                                                style={{ background: color }}
                                            />
                                            <span className="text-sm text-white/85 truncate">
                                                {t.name_th}
                                            </span>
                                        </div>
                                        {cell ? (
                                            <BalanceCellBadge cell={cell} />
                                        ) : (
                                            <span className="text-[11px] text-white/35 font-semibold">
                                                — / —
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

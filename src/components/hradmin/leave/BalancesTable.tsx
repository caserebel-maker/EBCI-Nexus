'use client'

import { Pencil, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatEmployeeName, employeeInitials } from '@/lib/format-employee-name'
import type { BalanceCell, EmployeeRowLite, LeaveTypeLite } from './types'

interface Props {
    employees: EmployeeRowLite[]
    leaveTypes: LeaveTypeLite[]
    balancesByEmployee: Record<string, Record<string, BalanceCell>>
    /** Narrow the visible columns; empty = show all active leave types. */
    visibleTypeIds: string[]
    onEditEmployee: (employeeId: string) => void
    onEditCell: (employeeId: string, leaveTypeId: string) => void
}

/**
 * Desktop pivot — rows = employees, columns = leave types.
 * Each cell reads "used / total" with a utilization-based color; a
 * purple dot on the cell flags `is_manually_adjusted`. Clicking a
 * single cell opens the modal focused on that (employee, type); the
 * trailing pencil opens the modal with every type editable.
 */
export function BalancesTable({
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
                <Sparkles size={26} className="mx-auto text-white/25 mb-3" />
                <p className="text-white/70 font-semibold">ไม่พบพนักงานที่ตรงกับตัวกรอง</p>
                <p className="text-white/45 text-xs mt-1">ลองล้างตัวกรองหรือเปลี่ยนปี</p>
            </div>
        )
    }

    return (
        <div
            className="rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: 'linear-gradient(160deg, rgba(60,15,20,0.95) 0%, rgba(86,30,35,0.92) 100%)' }}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                    <thead className="text-[11px] font-bold uppercase tracking-wider text-white/50 border-b border-white/10">
                        <tr>
                            <th className="text-left px-4 py-3 sticky left-0 z-10 bg-[rgba(30,8,12,0.96)]">
                                พนักงาน
                            </th>
                            <th className="text-left px-3 py-3">แผนก</th>
                            <th className="text-center px-2 py-3">Lv</th>
                            {types.map(t => {
                                const color = t.color ?? '#f9c5cd'
                                return (
                                    <th
                                        key={t.id}
                                        className="text-center px-2 py-3 font-semibold"
                                        style={{ color }}
                                    >
                                        {t.name_th}
                                    </th>
                                )
                            })}
                            <th className="w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => (
                            <EmployeeRow
                                key={emp.id}
                                emp={emp}
                                types={types}
                                cells={balancesByEmployee[emp.id] ?? {}}
                                onEditEmployee={onEditEmployee}
                                onEditCell={onEditCell}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function EmployeeRow({
    emp, types, cells, onEditEmployee, onEditCell,
}: {
    emp: EmployeeRowLite
    types: LeaveTypeLite[]
    cells: Record<string, BalanceCell>
    onEditEmployee: (id: string) => void
    onEditCell: (empId: string, typeId: string) => void
}) {
    return (
        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
            <td className="px-4 py-2.5 sticky left-0 bg-[rgba(30,8,12,0.92)]">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar emp={emp} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <p
                                className="text-white text-sm font-semibold truncate max-w-[240px]"
                                title={formatEmployeeName(emp)}
                            >
                                {formatEmployeeName(emp)}
                            </p>
                            {emp.work_location === 'johnson' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-red-600 border border-red-200 leading-none shrink-0 shadow-sm">
                                    จอห์นสัน
                                </span>
                            )}
                            {emp.work_location === 'saraburi' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-blue-600 border border-blue-200 leading-none shrink-0 shadow-sm">
                                    สระบุรี (WFH)
                                </span>
                            )}
                        </div>
                        {emp.employee_code && (
                            <p className="text-[11px] text-white/45 truncate max-w-[240px] font-mono">
                                {emp.employee_code}
                            </p>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-3 py-2.5 text-xs text-white/65 max-w-[160px] truncate">
                {emp.department ?? '—'}
            </td>
            <td className="px-2 py-2.5 text-center">
                {emp.approval_level ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-white/80 text-[10px] font-bold">
                        L{emp.approval_level}
                    </span>
                ) : (
                    <span className="text-white/30">—</span>
                )}
            </td>
            {types.map(t => {
                const cell = cells[t.id]
                return (
                    <td
                        key={t.id}
                        className="px-2 py-2 text-center"
                    >
                        {cell ? (
                            <BalanceCellBadge
                                cell={cell}
                                onClick={() => onEditCell(emp.id, t.id)}
                            />
                        ) : (
                            <button
                                onClick={() => onEditCell(emp.id, t.id)}
                                className="text-white/25 hover:text-white/60 text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors"
                                title="ยังไม่มียอด · คลิกเพื่อกำหนด"
                            >
                                —
                            </button>
                        )}
                    </td>
                )
            })}
            <td className="px-2 py-2.5 text-right">
                <button
                    onClick={() => onEditEmployee(emp.id)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-white/55 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="แก้ไขยอดทั้งหมด"
                    title="แก้ไขยอดทั้งหมดของพนักงานคนนี้"
                >
                    <Pencil size={14} />
                </button>
            </td>
        </tr>
    )
}

export function BalanceCellBadge({ cell, onClick }: { cell: BalanceCell; onClick?: () => void }) {
    const total = Number(cell.total_days ?? 0)
    const used = Number(cell.used_days ?? 0)
    const pending = Number(cell.pending_days ?? 0)
    const consumed = used + pending
    const pct = total > 0 ? consumed / total : 0

    // Tone keyed off consumption percent (used + pending vs total).
    //   0%         → gray (nothing consumed / zero allotment)
    //   0–50%      → green
    //   50–80%     → amber
    //   >80%       → red
    const tone = total === 0 || consumed === 0
        ? { bg: 'rgba(255,255,255,0.06)', color: '#cbd5e1', ring: 'rgba(255,255,255,0.12)' }
        : pct > 0.8
            ? { bg: 'rgba(239,68,68,0.18)', color: '#fca5a5', ring: 'rgba(239,68,68,0.35)' }
            : pct >= 0.5
                ? { bg: 'rgba(251,191,36,0.18)', color: '#fcd34d', ring: 'rgba(251,191,36,0.35)' }
                : { bg: 'rgba(52,211,153,0.18)', color: '#6ee7b7', ring: 'rgba(52,211,153,0.35)' }

    return (
        <button
            onClick={onClick}
            className={cn(
                'relative inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums transition-all',
                'hover:ring-2 hover:ring-white/30',
            )}
            style={{ background: tone.bg, color: tone.color, boxShadow: `0 0 0 1px ${tone.ring}` }}
            title={`ใช้ไป ${used} · pending ${pending} · รวม ${total} · คงเหลือ ${Math.max(0, total - consumed)}`}
        >
            <span>{used}</span>
            <span className="opacity-60">/</span>
            <span>{total}</span>
            {cell.is_manually_adjusted && (
                <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-400 shadow ring-1 ring-[#2a0a0e]"
                    aria-label="ปรับแต่งเอง"
                    title={cell.last_adjusted_by_name ? `ปรับโดย ${cell.last_adjusted_by_name}` : 'ปรับแต่งเอง'}
                />
            )}
        </button>
    )
}

function Avatar({ emp }: { emp: EmployeeRowLite }) {
    return (
        <span className="rounded-full overflow-hidden bg-white/10 w-8 h-8 flex items-center justify-center shrink-0 border border-white/10">
            {emp.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={emp.photo_url} alt={emp.nickname ?? ''} className="h-full w-full object-cover" />
            ) : (
                <span className="text-white/75 text-[10px] font-bold">{employeeInitials(emp)}</span>
            )}
        </span>
    )
}

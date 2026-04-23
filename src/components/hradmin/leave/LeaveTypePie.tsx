'use client'

import { useState } from 'react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { PieChart as PieIcon } from 'lucide-react'
import { resolveLeaveColor } from './palette'

interface PieSlice {
    leave_type_id: string
    name_th: string
    color: string | null
    count: number
}

interface Props {
    data: PieSlice[]
}

/**
 * Donut chart of approved leave requests by type, with legend list below.
 * Hover a slice to highlight + see tooltip. Center shows grand total.
 */
export function LeaveTypePie({ data }: Props) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null)
    const total = data.reduce((sum, s) => sum + s.count, 0)

    return (
        <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
                <PieIcon size={18} className="text-white/70" />
                <h3 className="text-white font-bold text-sm sm:text-base">
                    สัดส่วนประเภทการลา
                </h3>
            </div>

            {total === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-white/40">
                    <PieIcon size={28} className="mb-2 opacity-50" />
                    <p className="text-sm">ยังไม่มีใบลาที่อนุมัติแล้ว</p>
                </div>
            ) : (
                <>
                    <div className="relative mx-auto" style={{ width: 200, height: 200 }}>
                        <ResponsiveContainer width={200} height={200}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={58}
                                    outerRadius={88}
                                    paddingAngle={3}
                                    dataKey="count"
                                    onMouseEnter={(_, i) => setActiveIndex(i)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                    strokeWidth={0}
                                    isAnimationActive={false}
                                >
                                    {data.map((slice, i) => {
                                        const color = resolveLeaveColor(slice.color, i)
                                        return (
                                            <Cell
                                                key={slice.leave_type_id}
                                                fill={color}
                                                opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                                                style={{ cursor: 'pointer', transition: 'opacity 120ms' }}
                                            />
                                        )
                                    })}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number, _name: string, props: { payload?: PieSlice }) => {
                                        const slice = props.payload
                                        const pct = total > 0 ? Math.round((value / total) * 100) : 0
                                        return [`${value} ใบ (${pct}%)`, slice?.name_th ?? '']
                                    }}
                                    contentStyle={{
                                        background: 'rgba(20,5,8,0.96)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 10,
                                        fontSize: 12,
                                        padding: '6px 10px',
                                    }}
                                    itemStyle={{ color: '#fff', padding: 0 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl sm:text-3xl font-black text-white leading-none">{total}</span>
                            <span className="text-[11px] text-white/50 font-semibold mt-1">ใบทั้งหมด</span>
                        </div>
                    </div>

                    {/* Legend list */}
                    <div className="mt-4 space-y-1.5">
                        {data.map((slice, i) => {
                            const color = resolveLeaveColor(slice.color, i)
                            const pct = total > 0 ? Math.round((slice.count / total) * 100) : 0
                            const isActive = activeIndex === null || activeIndex === i
                            return (
                                <div
                                    key={slice.leave_type_id}
                                    className="flex items-center gap-2 text-xs transition-opacity"
                                    style={{ opacity: isActive ? 1 : 0.45 }}
                                    onMouseEnter={() => setActiveIndex(i)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                                    <span className="text-white/80 flex-1 truncate">{slice.name_th}</span>
                                    <span className="text-white/50 tabular-nums">{slice.count}</span>
                                    <span className="text-white/40 tabular-nums text-[11px] w-9 text-right">{pct}%</span>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}

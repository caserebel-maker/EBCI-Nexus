'use client'

import { useState } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { resolveLeaveColor } from './palette'

interface LeaveType {
    id: string
    name_th: string
    color: string | null
    display_order: number | null
}

interface Props {
    data: Array<Record<string, number | string>>
    leaveTypes: LeaveType[]
}

const MONTH_LABELS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

export function MonthlyTrendChart({ data, leaveTypes }: Props) {
    // Legend toggle: clicked types get hidden. Default: all visible.
    const [hidden, setHidden] = useState<Set<string>>(new Set())

    const chartData = data.map(row => ({
        ...row,
        monthLabel: MONTH_LABELS[(row.month as number) - 1] ?? '',
    }))

    // Show empty-state only when every month's every type is 0
    const hasAny = data.some(row =>
        leaveTypes.some(t => (row[t.id] as number) > 0),
    )

    const onLegendClick = (entry: { dataKey?: string | number }) => {
        if (!entry.dataKey) return
        const key = String(entry.dataKey)
        setHidden(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    return (
        <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-white/70" />
                <h3 className="text-white font-bold text-sm sm:text-base">
                    แนวโน้มการลารายเดือน
                </h3>
            </div>

            {!hasAny ? (
                <div className="flex flex-col items-center justify-center py-14 text-white/40">
                    <TrendingUp size={28} className="mb-2 opacity-50" />
                    <p className="text-sm">ยังไม่มีข้อมูลปีนี้</p>
                </div>
            ) : (
                <div className="w-full" style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 5, left: -12 }}>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.06)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="monthLabel"
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(20,5,8,0.96)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    padding: '8px 12px',
                                }}
                                labelStyle={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, marginBottom: 4 }}
                                itemStyle={{ color: '#fff', padding: 0 }}
                                formatter={(value: number | string, name: string) => {
                                    const t = leaveTypes.find(x => x.id === name)
                                    return [`${value} ใบ`, t?.name_th ?? name]
                                }}
                            />
                            <Legend
                                onClick={onLegendClick}
                                iconSize={10}
                                formatter={(value: string) => {
                                    const t = leaveTypes.find(x => x.id === value)
                                    const isHidden = hidden.has(value)
                                    return (
                                        <span
                                            style={{
                                                color: isHidden ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)',
                                                fontSize: 11,
                                                textDecoration: isHidden ? 'line-through' : 'none',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {t?.name_th ?? value}
                                        </span>
                                    )
                                }}
                            />
                            {leaveTypes.map((t, i) => {
                                const color = resolveLeaveColor(t.color, i)
                                return (
                                    <Line
                                        key={t.id}
                                        type="monotone"
                                        dataKey={t.id}
                                        name={t.id}
                                        stroke={color}
                                        strokeWidth={2}
                                        dot={{ fill: color, r: 3 }}
                                        activeDot={{ r: 5 }}
                                        hide={hidden.has(t.id)}
                                        isAnimationActive={false}
                                    />
                                )
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}

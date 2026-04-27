'use client'

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Building2 } from 'lucide-react'

interface DepartmentBar {
    department: string
    total_days: number
}

interface Props {
    data: DepartmentBar[]
}

// Maroon gradient — top dept gets the darkest, fading down. Mirrors the
// company brand while keeping enough contrast for 5 bars stacked vertically.
const MAROON_GRADIENT = [
    '#8b3540',
    '#a04a55',
    '#b76975',
    '#cb8993',
    '#dcabb1',
]

export function DepartmentBarChart({ data }: Props) {
    return (
        <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
                <Building2 size={18} className="text-white/70" />
                <h3 className="text-white font-bold text-sm sm:text-base">
                    แผนกที่ใช้วันลามากที่สุด
                </h3>
            </div>

            {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-white/40">
                    <Building2 size={28} className="mb-2 opacity-50" />
                    <p className="text-sm">ยังไม่มีใบลาที่อนุมัติแล้ว</p>
                </div>
            ) : (
                <div className="w-full" style={{ height: Math.max(200, data.length * 52) }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 5, right: 24, bottom: 5, left: 8 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.06)"
                                horizontal={false}
                            />
                            <XAxis
                                type="number"
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <YAxis
                                type="category"
                                dataKey="department"
                                tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                width={120}
                                interval={0}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                contentStyle={{
                                    background: 'rgba(20,5,8,0.96)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 10,
                                    fontSize: 12,
                                    padding: '8px 12px',
                                }}
                                labelStyle={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(v) => [`${Number(v ?? 0)} วัน`, 'รวม']}
                            />
                            <Bar
                                dataKey="total_days"
                                radius={[0, 6, 6, 0]}
                                isAnimationActive={false}
                            >
                                {data.map((_, i) => (
                                    <Cell
                                        key={i}
                                        fill={MAROON_GRADIENT[i] ?? MAROON_GRADIENT[MAROON_GRADIENT.length - 1]}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}

import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const EVENT_SLUG = 'world-cup-2026'

type EventRow = {
    id: string
    title: string
    prize_amount: number
    closes_at: string | null
}

type TeamRow = {
    id: string
    team_name: string
    team_name_en: string | null
    flag_emoji: string | null
    seed_order: number
}

type PredictionRow = {
    id: string
    employee_id: string
    team_id: string
    submitted_at: string
}

type EmployeeRow = {
    id: string
    employee_code: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    department: string | null
}

function displayName(employee: EmployeeRow | undefined): string {
    if (!employee) return 'ไม่พบข้อมูลพนักงาน'
    const fullName = [employee.first_name_th, employee.last_name_th].filter(Boolean).join(' ').trim()
    if (!fullName) return employee.employee_code ?? 'พนักงาน'
    return employee.nickname ? `${fullName} (${employee.nickname})` : fullName
}

function formatThaiDateTime(value: string | null): string {
    if (!value) return 'ยังไม่กำหนด'
    return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value))
}

export default async function WorldCupAdminPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!isHrStaff(auth)) redirect('/portal')

    const { data: eventData, error: eventError } = await supabaseAdmin
        .from('world_cup_events')
        .select('id, title, prize_amount, closes_at')
        .eq('slug', EVENT_SLUG)
        .maybeSingle()

    if (eventError || !eventData) {
        return (
            <div className="rounded-3xl border border-white/15 bg-white/10 p-8 text-white">
                <h1 className="text-2xl font-black">ยังไม่พบข้อมูล event</h1>
            </div>
        )
    }

    const event = eventData as EventRow
    const [teamsRes, predictionsRes] = await Promise.all([
        supabaseAdmin
            .from('world_cup_teams')
            .select('id, team_name, team_name_en, flag_emoji, seed_order')
            .eq('event_id', event.id)
            .eq('is_active', true)
            .order('seed_order', { ascending: true }),
        supabaseAdmin
            .from('world_cup_predictions')
            .select('id, employee_id, team_id, submitted_at')
            .eq('event_id', event.id)
            .order('submitted_at', { ascending: false }),
    ])

    const teams = (teamsRes.data ?? []) as TeamRow[]
    const predictions = (predictionsRes.data ?? []) as PredictionRow[]
    const employeeIds = Array.from(new Set(predictions.map(p => p.employee_id)))
    const employeesRes = employeeIds.length > 0
        ? await supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname, department')
            .in('id', employeeIds)
        : { data: [] }

    const employeeById = new Map(
        ((employeesRes.data ?? []) as EmployeeRow[]).map(employee => [employee.id, employee]),
    )
    const teamById = new Map(teams.map(team => [team.id, team]))
    const counts = predictions.reduce<Record<string, number>>((acc, prediction) => {
        acc[prediction.team_id] = (acc[prediction.team_id] ?? 0) + 1
        return acc
    }, {})

    return (
        <div className="space-y-6 pb-10">
            <div className="rounded-[2rem] border border-white/15 bg-gradient-to-br from-[#5a101b] via-[#2a0710] to-[#062318] p-6 shadow-2xl shadow-black/20">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-yellow-200">
                            <Trophy />
                        </div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-yellow-200/75">
                            Hidden Event Dashboard
                        </p>
                        <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">{event.title}</h1>
                        <p className="mt-2 text-white/60">
                            รางวัล {Number(event.prize_amount).toLocaleString('th-TH')} บาท · ปิดรับ {formatThaiDateTime(event.closes_at)}
                        </p>
                    </div>
                    <div className="rounded-3xl border border-white/15 bg-white/10 px-6 py-4 text-right">
                        <p className="text-sm text-white/55">ส่งคำตอบแล้ว</p>
                        <p className="text-4xl font-black text-white">{predictions.length}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                {teams.map(team => (
                    <div key={team.id} className="rounded-3xl border border-white/15 bg-white/10 p-5 text-white">
                        <div className="text-4xl">{team.flag_emoji ?? '🏆'}</div>
                        <h2 className="mt-4 text-xl font-black">{team.team_name}</h2>
                        <p className="text-xs uppercase tracking-[0.18em] text-white/40">{team.team_name_en}</p>
                        <p className="mt-4 text-3xl font-black text-yellow-200">{counts[team.id] ?? 0} คน</p>
                    </div>
                ))}
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/10">
                <div className="border-b border-white/10 p-5">
                    <h2 className="text-2xl font-black text-white">รายชื่อผู้ส่งคำตอบ</h2>
                </div>
                <div className="divide-y divide-white/10">
                    {predictions.length === 0 ? (
                        <div className="p-8 text-center text-white/55">ยังไม่มีคำตอบ</div>
                    ) : predictions.map(prediction => {
                        const employee = employeeById.get(prediction.employee_id)
                        const team = teamById.get(prediction.team_id)
                        return (
                            <div key={prediction.id} className="grid gap-2 p-5 text-white md:grid-cols-[1.4fr_1fr_1fr] md:items-center">
                                <div>
                                    <p className="font-black">{displayName(employee)}</p>
                                    <p className="text-sm text-white/45">
                                        {[employee?.employee_code, employee?.department].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                <p className="font-black text-yellow-100">
                                    <span className="mr-2">{team?.flag_emoji ?? '🏆'}</span>
                                    {team?.team_name ?? 'ไม่พบทีม'}
                                </p>
                                <p className="text-sm text-white/45 md:text-right">{formatThaiDateTime(prediction.submitted_at)}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

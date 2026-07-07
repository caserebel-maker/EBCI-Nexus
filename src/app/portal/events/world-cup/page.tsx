import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { employeeInitials } from '@/lib/format-employee-name'
import { WorldCupPredictionClient } from './world-cup-prediction-client'

export const dynamic = 'force-dynamic'

const EVENT_SLUG = 'world-cup-2026'

type EmployeeRow = {
    id?: string | null
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    employee_code: string | null
    department: string | null
    position: string | null
    photo_url?: string | null
}

type EventRow = {
    id: string
    title: string
    subtitle: string | null
    prize_amount: number
    status: string
    closes_at: string | null
}

type TeamRow = {
    id: string
    team_name: string
    team_name_en: string | null
    flag_emoji: string | null
    seed_order: number
    accent_color: string | null
    is_active: boolean
}

type PredictionRow = {
    team_id: string
    employee_id: string
}

function buildDisplayName(emp: EmployeeRow | null): string {
    if (!emp) return 'พนักงาน'
    const fullName = [emp.first_name_th, emp.last_name_th].filter(Boolean).join(' ').trim()
    if (!fullName) return emp.employee_code ? `พนักงาน ${emp.employee_code}` : 'พนักงาน'
    return emp.nickname ? `${fullName} (${emp.nickname})` : fullName
}

function countByTeam(predictions: PredictionRow[]): Record<string, number> {
    return predictions.reduce<Record<string, number>>((acc, prediction) => {
        acc[prediction.team_id] = (acc[prediction.team_id] ?? 0) + 1
        return acc
    }, {})
}

export default async function WorldCupEventPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) redirect('/portal')

    const { data: eventData, error: eventError } = await supabaseAdmin
        .from('world_cup_events')
        .select('id, title, subtitle, prize_amount, status, closes_at')
        .eq('slug', EVENT_SLUG)
        .maybeSingle()

    if (eventError || !eventData) {
        return (
            <div className="mx-auto max-w-3xl rounded-3xl border border-white/15 bg-white/10 p-8 text-white">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400/20 text-yellow-200">
                    <Trophy />
                </div>
                <h1 className="text-3xl font-black">ยังไม่พร้อมเปิด event</h1>
                <p className="mt-3 text-white/70">ยังไม่พบข้อมูลทายแชมป์ฟุตบอลโลกในฐานข้อมูล</p>
            </div>
        )
    }

    const event = eventData as EventRow
    const [employeesRes, teamsRes, myPredictionRes, predictionsRes] = await Promise.all([
        supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname, employee_code, department, position, photo_url')
            .eq('status', 'active')
            .order('employee_code', { ascending: true }),
        supabaseAdmin
            .from('world_cup_teams')
            .select('id, team_name, team_name_en, flag_emoji, seed_order, accent_color, is_active')
            .eq('event_id', event.id)
            .order('seed_order', { ascending: true }),
        supabaseAdmin
            .from('world_cup_predictions')
            .select('team_id, employee_id')
            .eq('event_id', event.id)
            .eq('employee_id', employeeId)
            .maybeSingle(),
        supabaseAdmin
            .from('world_cup_predictions')
            .select('team_id, employee_id')
            .eq('event_id', event.id),
    ])

    const allEmployees = (employeesRes.data ?? []) as EmployeeRow[]
    const employee = allEmployees.find(emp => emp.id === employeeId) ?? null
    const teams = (teamsRes.data ?? []) as TeamRow[]
    const myPrediction = (myPredictionRes.data as PredictionRow | null) ?? null
    const predictions = (predictionsRes.data ?? []) as PredictionRow[]
    
    const employeeById = new Map(allEmployees.map(emp => [emp.id, emp]))
    
    // Find active employees who have NOT predicted
    const predictedEmployeeIds = new Set(predictions.map(p => p.employee_id).filter(Boolean))
    const nonPredictors = allEmployees.filter(emp => !predictedEmployeeIds.has(emp.id))

    const pickersByTeam = predictions.reduce<Record<string, Array<{
        id: string
        name: string
        initials: string
        avatarUrl: string | null
        employeeCode: string | null
    }>>>((acc, prediction) => {
        const picker = employeeById.get(prediction.employee_id)
        if (!picker?.id) return acc
        if (!acc[prediction.team_id]) acc[prediction.team_id] = []
        acc[prediction.team_id].push({
            id: picker.id,
            name: buildDisplayName(picker),
            initials: employeeInitials(picker),
            avatarUrl: picker.photo_url ?? null,
            employeeCode: picker.employee_code ?? null,
        })
        return acc
    }, {})

    return (
        <WorldCupPredictionClient
            event={{
                title: event.title,
                subtitle: event.subtitle,
                prizeAmount: Number(event.prize_amount ?? 1000),
                status: event.status,
                closesAt: event.closes_at,
            }}
            employee={{
                id: employee?.id ?? employeeId,
                name: buildDisplayName(employee),
                code: employee?.employee_code ?? null,
                department: employee?.department ?? null,
                position: employee?.position ?? null,
                avatarUrl: employee?.photo_url ?? null,
                initials: employeeInitials(employee),
            }}
            teams={teams.map(team => ({
                id: team.id,
                name: team.team_name,
                nameEn: team.team_name_en,
                flag: team.flag_emoji,
                accentColor: team.accent_color,
                pickCount: countByTeam(predictions)[team.id] ?? 0,
                pickers: pickersByTeam[team.id] ?? [],
                isActive: team.is_active,
            }))}
            initialPredictionTeamId={myPrediction?.team_id ?? null}
            totalPredictions={predictions.length}
            nonPredictors={nonPredictors.map(emp => ({
                id: emp.id,
                name: buildDisplayName(emp),
                code: emp.employee_code ?? null,
                avatarUrl: emp.photo_url ?? null,
                initials: employeeInitials(emp),
            }))}
        />
    )
}

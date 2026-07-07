import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const EVENT_SLUG = 'world-cup-2026'

type EventRow = {
    id: string
    status: string
    closes_at: string | null
}

function isClosed(event: EventRow): boolean {
    if (event.status !== 'open') return true
    if (!event.closes_at) return false
    return new Date(event.closes_at).getTime() <= Date.now()
}

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ ok: false, error: 'กรุณาเข้าสู่ระบบใหม่' }, { status: 401 })
    }

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ ok: false, error: 'ไม่พบข้อมูลพนักงานของบัญชีนี้' }, { status: 403 })
    }

    const body = await req.json().catch(() => null) as { teamId?: unknown } | null
    const teamId = typeof body?.teamId === 'string' ? body.teamId : ''
    if (!teamId) {
        return NextResponse.json({ ok: false, error: 'กรุณาเลือกทีมก่อนส่งคำตอบ' }, { status: 400 })
    }

    const { data: eventData, error: eventError } = await supabaseAdmin
        .from('world_cup_events')
        .select('id, status, closes_at')
        .eq('slug', EVENT_SLUG)
        .maybeSingle()

    if (eventError || !eventData) {
        console.error('[world-cup] event lookup failed', eventError)
        return NextResponse.json({ ok: false, error: 'ยังไม่พบ event นี้ในระบบ' }, { status: 500 })
    }

    const event = eventData as EventRow
    if (isClosed(event)) {
        return NextResponse.json({ ok: false, error: 'ปิดรับคำทายแล้ว' }, { status: 409 })
    }

    const { data: team, error: teamError } = await supabaseAdmin
        .from('world_cup_teams')
        .select('id, team_name')
        .eq('id', teamId)
        .eq('event_id', event.id)
        .eq('is_active', true)
        .maybeSingle()

    if (teamError || !team) {
        return NextResponse.json({ ok: false, error: 'ทีมที่เลือกไม่ถูกต้อง' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
        .from('world_cup_predictions')
        .select('id')
        .eq('event_id', event.id)
        .eq('employee_id', employeeId)
        .maybeSingle()

    const savePayload = {
        event_id: event.id,
        employee_id: employeeId,
        team_id: teamId,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }

    const saveQuery = existing?.id
        ? supabaseAdmin
            .from('world_cup_predictions')
            .update(savePayload)
            .eq('id', existing.id)
            .select('id, team_id, submitted_at, updated_at')
            .single()
        : supabaseAdmin
            .from('world_cup_predictions')
            .insert(savePayload)
            .select('id, team_id, submitted_at, updated_at')
            .single()

    const { data: prediction, error: saveError } = await saveQuery
    if (saveError || !prediction) {
        console.error('[world-cup] prediction save failed', { employeeId, teamId, saveError })
        return NextResponse.json({ ok: false, error: 'บันทึกคำตอบไม่สำเร็จ กรุณาลองใหม่' }, { status: 500 })
    }

    return NextResponse.json({
        ok: true,
        prediction,
        team: {
            id: team.id,
            name: team.team_name,
        },
    })
}

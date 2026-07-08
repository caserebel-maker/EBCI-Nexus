import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EVENT_SLUG = 'world-cup-2026'
const TARGET_TIME = new Date('2026-07-10T13:01:00Z').getTime() // 20:01 Bangkok Time (UTC+7)
const RECIPIENT_EMAIL = 'tumyen@gmail.com'

type EmployeeRow = {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    employee_code: string | null
    department: string | null
}

type TeamRow = {
    id: string
    team_name: string
    team_name_en: string | null
    flag_emoji: string | null
    is_active: boolean
}

type PredictionRow = {
    team_id: string
    employee_id: string
    submitted_at: string
}

function buildDisplayName(emp: EmployeeRow): string {
    const fullName = [emp.first_name_th, emp.last_name_th].filter(Boolean).join(' ').trim()
    const codeStr = emp.employee_code ? `[${emp.employee_code}]` : ''
    const nickStr = emp.nickname ? `(${emp.nickname})` : ''
    return `${codeStr} ${fullName} ${nickStr}`.trim()
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    // Auth Validation (Bearer token or key in search query)
    const auth = req.headers.get('authorization')
    const queryKey = new URL(req.url).searchParams.get('key')
    if (auth !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isForce = new URL(req.url).searchParams.get('force') === 'true'
    const nowTime = Date.now()

    // 1. Time Check
    if (nowTime < TARGET_TIME && !isForce) {
        console.log('[world-cup-summary] Too early to send summary email')
        return NextResponse.json({ ok: true, sent: false, reason: 'too_early' })
    }

    // 2. Duplication Check
    if (!isForce) {
        const { data: sentLog, error: logError } = await supabaseAdmin
            .from('email_delivery_logs')
            .select('id')
            .eq('subject', 'สรุปผลการทายแชมป์ฟุตบอลโลก 2026')
            .neq('status', 'failed')
            .limit(1)
            .maybeSingle()

        if (logError) {
            console.error('[world-cup-summary] Error checking sent logs:', logError)
        }

        if (sentLog) {
            console.log('[world-cup-summary] Summary email was already sent')
            return NextResponse.json({ ok: true, sent: false, reason: 'already_sent' })
        }
    }

    console.log('[world-cup-summary] Compiling prediction summary...')

    // 3. Query Event Details
    const { data: event, error: eventError } = await supabaseAdmin
        .from('world_cup_events')
        .select('id, title, prize_amount')
        .eq('slug', EVENT_SLUG)
        .maybeSingle()

    if (eventError || !event) {
        console.error('[world-cup-summary] Event lookup failed:', eventError)
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // 4. Query All Required Data
    const [employeesRes, teamsRes, predictionsRes] = await Promise.all([
        supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname, employee_code, department')
            .eq('status', 'active'),
        supabaseAdmin
            .from('world_cup_teams')
            .select('id, team_name, team_name_en, flag_emoji, is_active')
            .eq('event_id', event.id),
        supabaseAdmin
            .from('world_cup_predictions')
            .select('team_id, employee_id, submitted_at')
            .eq('event_id', event.id),
    ])

    const allEmployees = (employeesRes.data ?? []) as EmployeeRow[]
    const teams = (teamsRes.data ?? []) as TeamRow[]
    const predictions = (predictionsRes.data ?? []) as PredictionRow[]

    const employeeById = new Map(allEmployees.map(emp => [emp.id, emp]))
    const teamById = new Map(teams.map(team => [team.id, team]))

    // Find who has NOT predicted
    const predictedEmployeeIds = new Set(predictions.map(p => p.employee_id).filter(Boolean))
    const nonPredictors = allEmployees.filter(emp => !predictedEmployeeIds.has(emp.id))

    // Group predictions by team
    const teamPredictionsMap: Record<string, Array<{ emp: EmployeeRow; submittedAt: string }>> = {}
    for (const p of predictions) {
        const emp = employeeById.get(p.employee_id)
        if (!emp) continue
        if (!teamPredictionsMap[p.team_id]) {
            teamPredictionsMap[p.team_id] = []
        }
        teamPredictionsMap[p.team_id].push({ emp, submittedAt: p.submitted_at })
    }

    // Sort teams by pick count (descending)
    const sortedTeams = teams.map(team => {
        const picks = teamPredictionsMap[team.id] ?? []
        // Sort pickers alphabetically by display name
        picks.sort((a, b) => buildDisplayName(a.emp).localeCompare(buildDisplayName(b.emp), 'th'))
        return {
            ...team,
            picks,
            pickCount: picks.length,
        }
    })
    sortedTeams.sort((a, b) => b.pickCount - a.pickCount)

    // 5. Generate beautiful HTML content
    const totalPicksCount = predictions.length
    const nonPicksCount = nonPredictors.length
    const formattedPrize = new Intl.NumberFormat('th-TH').format(event.prize_amount)

    let teamsHtmlRows = ''
    sortedTeams.forEach((team, idx) => {
        const pickerNames = team.picks.map(p => buildDisplayName(p.emp)).join('<br/>') || '<span style="color:#a1a1aa; font-style:italic;">- ไม่มีผู้ทาย -</span>'
        const rowBg = idx % 2 === 0 ? '#fafafa' : '#ffffff'
        const prizeShare = team.pickCount > 0 ? Math.round(event.prize_amount / team.pickCount) : 0
        const prizeShareStr = prizeShare > 0 ? `${new Intl.NumberFormat('th-TH').format(prizeShare)} บ./คน` : '-'

        teamsHtmlRows += `
            <tr style="background-color: ${rowBg};">
                <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: center; font-weight: bold; color: #71717a;">${idx + 1}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; font-weight: bold; color: #18181b;">
                    <span style="font-size: 1.25rem; margin-right: 4px; vertical-align: middle;">${team.flag_emoji ?? '🏆'}</span>
                    <span style="vertical-align: middle;">${team.team_name}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: center; font-weight: 800; color: #14532d; font-size: 1.1rem;">${team.pickCount}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; text-align: center; font-weight: bold; color: #b45309; font-size: 0.95rem;">${prizeShareStr}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e4e4e7; font-size: 0.85rem; line-height: 1.6; color: #3f3f46; font-weight: 550;">${pickerNames}</td>
            </tr>
        `
    })

    // Alphabetical sort of non-predictors
    nonPredictors.sort((a, b) => buildDisplayName(a).localeCompare(buildDisplayName(b), 'th'))
    const nonPredictorsNames = nonPredictors.map(emp => `<li>${buildDisplayName(emp)} (${emp.department ?? 'ไม่ระบุฝ่าย'})</li>`).join('') || '<li>ไม่มีพนักงานที่ค้างการทายผล</li>'

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>สรุปผลการทายแชมป์ฟุตบอลโลก 2026</title>
    </head>
    <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
        <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #e4e4e7;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #660f1c 0%, #1a0004 100%); padding: 32px 24px; text-align: center; border-bottom: 4px solid #facc15;">
                <h1 style="margin: 0; font-size: 1.6rem; font-weight: 900; color: #ffffff; letter-spacing: 0.03em;">🏆 สรุปผลการทายแชมป์ฟุตบอลโลก 2026</h1>
                <p style="margin: 8px 0 0 0; font-size: 0.95rem; color: #fef08a; font-weight: bold;">(กิจกรรมพิเศษชิงรางวัลรวม ${formattedPrize} บาท)</p>
            </div>

            <!-- Stats Bar -->
            <div style="display: flex; background-color: #fafafa; border-bottom: 1px solid #e4e4e7; text-align: center; padding: 16px 0;">
                <div style="flex: 1; border-right: 1px solid #e4e4e7;">
                    <p style="margin: 0; font-size: 0.8rem; color: #71717a; font-weight: bold; text-transform: uppercase;">ส่งทายผลแล้ว</p>
                    <p style="margin: 4px 0 0 0; font-size: 1.6rem; font-weight: 900; color: #18181b;">${totalPicksCount} คน</p>
                </div>
                <div style="flex: 1;">
                    <p style="margin: 0; font-size: 0.8rem; color: #71717a; font-weight: bold; text-transform: uppercase;">ยังไม่ส่งทายผล</p>
                    <p style="margin: 4px 0 0 0; font-size: 1.6rem; font-weight: 900; color: #dc2626;">${nonPicksCount} คน</p>
                </div>
            </div>

            <div style="padding: 24px;">
                <!-- Main Predictions Table -->
                <h2 style="margin: 0 0 16px 0; font-size: 1.15rem; font-weight: 800; color: #18181b; border-left: 4px solid #660f1c; padding-left: 8px;">📊 ตารางสรุปคะแนนทายผลแยกตามประเทศ</h2>
                
                <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; margin-bottom: 28px;">
                    <thead>
                        <tr style="background-color: #f4f4f5; color: #4b5563; font-weight: bold; border-bottom: 2px solid #e4e4e7;">
                            <th style="padding: 12px; text-align: center; width: 40px;">#</th>
                            <th style="padding: 12px; width: 140px;">ประเทศ</th>
                            <th style="padding: 12px; text-align: center; width: 90px;">จำนวนคนทาย</th>
                            <th style="padding: 12px; text-align: center; width: 110px;">ส่วนแบ่งรางวัล</th>
                            <th style="padding: 12px;">รายชื่อพนักงานที่ทาย</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teamsHtmlRows}
                    </tbody>
                </table>

                <!-- Non-Predictors Section -->
                <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 0.95rem; font-weight: 800; color: #92400e;">⚠️ พนักงานที่ไม่ได้ส่งคำทายบอลโลก (${nonPicksCount} คน)</h3>
                    <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: #78350f; line-height: 1.6;">
                        ${nonPredictorsNames}
                    </ul>
                </div>
                
                <!-- Footer Info -->
                <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e4e4e7; color: #71717a; font-size: 0.75rem; line-height: 1.5;">
                    <p style="margin: 0;">รายงานนี้จัดทำขึ้นโดยอัตโนมัติจากระบบ EBCI Nexus หลังปิดโหวตกิจกรรม</p>
                    <p style="margin: 4px 0 0 0; font-weight: bold;">วันที่ 10 กรกฎาคม 2026 เวลา 20.00 น.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `

    // 6. Send the Summary Email
    console.log(`[world-cup-summary] Sending summary email to ${RECIPIENT_EMAIL}...`)
    const emailResult = await sendEmail({
        to: RECIPIENT_EMAIL,
        subject: 'สรุปผลการทายแชมป์ฟุตบอลโลก 2026',
        html: emailHtml,
        sender: 'system',
        audit: {
            category: 'world-cup-summary',
            entityType: 'world_cup_event',
            entityId: event.id,
            template: 'world-cup-summary-report',
        },
    })

    if (!emailResult.success) {
        console.error('[world-cup-summary] Email delivery failed:', emailResult)
        return NextResponse.json({ ok: false, error: 'Email delivery failed' }, { status: 500 })
    }

    console.log('[world-cup-summary] Summary email sent successfully!')
    return NextResponse.json({
        ok: true,
        sent: true,
        recipient: RECIPIENT_EMAIL,
        totalPicks: totalPicksCount,
        nonPicks: nonPicksCount,
    })
}

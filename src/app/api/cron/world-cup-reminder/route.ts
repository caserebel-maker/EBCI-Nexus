import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const EVENT_SLUG = 'world-cup-2026'
// Closes at 20:00 Bangkok Time on July 10, 2026 (13:00 UTC).
// 12-hour reminder should run at 08:00 Bangkok Time on July 10, 2026 (01:00 UTC).
const REMINDER_TIME = new Date('2026-07-10T01:00:00Z').getTime()

type EmployeeRow = {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    email: string | null
    employee_code: string | null
    status: string
}

type TeamRow = {
    id: string
    team_name: string
    flag_emoji: string | null
}

type PredictionRow = {
    team_id: string
    employee_id: string
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    // Auth Validation (Bearer token or key in query params)
    const auth = req.headers.get('authorization')
    const queryKey = new URL(req.url).searchParams.get('key')
    if (auth !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isForce = new URL(req.url).searchParams.get('force') === 'true'
    const nowTime = Date.now()

    // 1. Time Check
    if (nowTime < REMINDER_TIME && !isForce) {
        console.log('[world-cup-reminder] Too early to send reminder emails')
        return NextResponse.json({ ok: true, sent: false, reason: 'too_early' })
    }

    const subject = '⏳ โค้งสุดท้าย! เหลือเวลาอีก 12 ชั่วโมงเท่านั้น ในการร่วมสนุกทายผลแชมป์ฟุตบอลโลก 2026!'

    // 2. Duplication Check
    if (!isForce) {
        const { data: sentLog, error: logError } = await supabaseAdmin
            .from('email_delivery_logs')
            .select('id')
            .eq('subject', subject)
            .neq('status', 'failed')
            .limit(1)
            .maybeSingle()

        if (logError) {
            console.error('[world-cup-reminder] Error checking sent logs:', logError)
        }

        if (sentLog) {
            console.log('[world-cup-reminder] Reminder email was already sent')
            return NextResponse.json({ ok: true, sent: false, reason: 'already_sent' })
        }
    }

    console.log('[world-cup-reminder] Compiling reminder list...')

    // 3. Query Event Details
    const { data: event, error: eventError } = await supabaseAdmin
        .from('world_cup_events')
        .select('id, title, prize_amount')
        .eq('slug', EVENT_SLUG)
        .maybeSingle()

    if (eventError || !event) {
        console.error('[world-cup-reminder] Event lookup failed:', eventError)
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // 4. Query Employees, Teams, and Current Predictions
    const [employeesRes, teamsRes, predictionsRes] = await Promise.all([
        supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname, email, employee_code, status')
            .eq('status', 'active'),
        supabaseAdmin
            .from('world_cup_teams')
            .select('id, team_name, flag_emoji')
            .eq('event_id', event.id),
        supabaseAdmin
            .from('world_cup_predictions')
            .select('team_id, employee_id')
            .eq('event_id', event.id),
    ])

    const allEmployees = (employeesRes.data ?? []) as EmployeeRow[]
    const teams = (teamsRes.data ?? []) as TeamRow[]
    const predictions = (predictionsRes.data ?? []) as PredictionRow[]

    const teamById = new Map(teams.map(t => [t.id, t]))
    const predictionByEmployeeId = new Map(predictions.map(p => [p.employee_id, p]))

    const formattedPrize = new Intl.NumberFormat('th-TH').format(event.prize_amount)
    
    // Filter active employees with emails
    const recipients = allEmployees.filter(emp => emp.email && emp.email.trim() !== '')
    console.log(`[world-cup-reminder] Found ${recipients.length} employees to email.`)

    let sentCount = 0
    let failCount = 0

    // 5. Send customized email to each employee
    for (const emp of recipients) {
        const prediction = predictionByEmployeeId.get(emp.id)
        const firstName = emp.first_name_th || 'พนักงาน'
        const nickname = emp.nickname || firstName

        let statusBox = ''
        let buttonText = ''

        if (prediction) {
            const team = teamById.get(prediction.team_id)
            const teamName = team ? team.team_name : 'ไม่พบข้อมูลทีม'
            const flag = team ? (team.flag_emoji || '🏆') : '🏆'
            statusBox = `
                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 1.8rem; display: block; margin-bottom: 6px;">✅</span>
                    <p style="margin: 0; font-size: 1rem; font-weight: bold; color: #065f46;">คุณได้ร่วมทายผลแชมป์โลกเรียบร้อยแล้ว!</p>
                    <p style="margin: 6px 0 0 0; font-size: 0.95rem; color: #047857; font-weight: bold;">
                        ทีมที่คุณเลือก: ${flag} ${teamName}
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 0.85rem; color: #065f46; opacity: 0.8; line-height: 1.5;">
                        หากอยากเปลี่ยนใจหรือต้องการวิเคราะห์ใหม่ ยังสามารถกดแก้ไขคำทายได้จนถึงเวลาระบบปิดรับโหวตครับ
                    </p>
                </div>
            `
            buttonText = '🔍 ตรวจสอบคำตอบ / เปลี่ยนทีม'
        } else {
            statusBox = `
                <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 1.8rem; display: block; margin-bottom: 6px;">❌</span>
                    <p style="margin: 0; font-size: 1rem; font-weight: bold; color: #991b1b;">คุณยังไม่ได้ส่งคำทายผลแชมป์โลก!</p>
                    <p style="margin: 6px 0 0 0; font-size: 0.90rem; color: #7f1d1d; opacity: 0.8; line-height: 1.5;">
                        รีบกดทายด่วน! เพื่อรักษาสิทธิ์ร่วมรับรางวัลขั้นต่ำ (กติกาพิเศษ: หากจบกิจกรรมแล้วไม่มีใครทายถูกเลย เงินรางวัลรวมทั้งหมดจะถูกหารแบ่งเท่ากันทุกคนที่เข้าร่วมกิจกรรมส่งทายผลครับ)
                    </p>
                </div>
            `
            buttonText = '👉 กดทายผลแชมป์โลกตอนนี้เลย'
        }

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>⏳ 12 ชั่วโมงสุดท้าย! ร่วมสนุกทายผลแชมป์ฟุตบอลโลก 2026</title>
            </head>
            <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
                <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border: 1px solid #e4e4e7;">
                    <!-- Header Banner -->
                    <div style="background: linear-gradient(135deg, #660f1c 0%, #1a0004 100%); padding: 32px 24px; text-align: center; border-bottom: 4px solid #facc15;">
                        <span style="font-size: 2.5rem; display: block; margin-bottom: 10px;">🏆</span>
                        <h1 style="margin: 0; font-size: 1.5rem; font-weight: 900; color: #ffffff; letter-spacing: 0.03em; line-height: 1.4;">โค้งสุดท้าย! เหลือเวลาอีก 12 ชั่วโมงเท่านั้น</h1>
                        <p style="margin: 8px 0 0 0; font-size: 0.95rem; color: #fef08a; font-weight: bold;">ร่วมสนุกทายผลแชมป์ฟุตบอลโลก 2026 ชิงรางวัลรวม ${formattedPrize} บาท!</p>
                    </div>

                    <!-- Body Content -->
                    <div style="padding: 30px 24px;">
                        <p style="margin: 0 0 16px 0; font-size: 1.05rem; line-height: 1.6; font-weight: bold; color: #18181b;">สวัสดีครับคุณ ${nickname} (${firstName}),</p>
                        <p style="margin: 0 0 24px 0; font-size: 0.95rem; line-height: 1.6; color: #52525b;">
                            กิจกรรมทายผลแชมป์ฟุตบอลโลก 2026 ของบริษัท EBCI กำลังจะปิดรับโหวตแล้ว! ระบบจะทำการล็อกคำตอบและ **ปิดรับทายผลอย่างเป็นทางการในวันศุกร์ที่ 10 กรกฎาคม 2569 เวลา 20:00 น.** (คืนนี้)
                        </p>

                        <!-- Personalized Status Box -->
                        ${statusBox}

                        <!-- Call to Action -->
                        <div style="margin: 32px 0; text-align: center;">
                            <a href="https://ebci-nexus.vercel.app/portal/events/world-cup" style="background-color: #be123c; color: #ffffff; padding: 14px 28px; border-radius: 9999px; text-decoration: none; font-size: 0.95rem; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(190, 18, 60, 0.25);">
                                ${buttonText}
                            </a>
                        </div>

                        <p style="margin: 0; font-size: 0.85rem; line-height: 1.6; color: #71717a;">
                            *กติกาการแจกรางวัล:* ทายถูกคนเดียวรับ 3,000 บาทเต็มจำนวน! หากทายถูกหลายคนหารแบ่งรางวัลเท่าๆ กัน และหากไม่มีใครทายถูกเลย จะหารแบ่งรางวัลเฉลี่ยให้กับทุกคนที่เข้าร่วมสนุกส่งผลทายครับ
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #fafafa; padding: 20px 24px; text-align: center; border-top: 1px solid #e4e4e7; font-size: 0.8rem; color: #a1a1aa;">
                        <p style="margin: 0;">ข้อความอัตโนมัติส่งโดยระบบ EBCI Nexus</p>
                        <p style="margin: 4px 0 0 0;">&copy; 2026 Eastern Beverage Company Limited. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `

        const mailRes = await sendEmail({
            to: emp.email!,
            subject: subject,
            html: emailHtml,
            sender: 'system',
            audit: {
                action: 'world-cup-reminder',
                target_id: emp.id
            }
        })

        if (mailRes.success) {
            sentCount++
        } else {
            failCount++
        }
    }

    console.log(`[world-cup-reminder] Finished reminder campaign: Sent=${sentCount}, Failed=${failCount}`)
    return NextResponse.json({ ok: true, sent: true, recipients: sentCount, failed: failCount })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendTelegram } from '@/lib/telegram'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MONITOR_START_BKK_MIN = 9 * 60 + 30 // 09:30
const MONITOR_END_BKK_MIN = 18 * 60 + 30  // 18:30
const STALL_LIMIT_MS = 2 * 60 * 60 * 1000 // 2 hours

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    
    // Auth validation (Vercel Cron security pattern)
    const auth = req.headers.get('authorization')
    const queryKey = new URL(req.url).searchParams.get('key')
    if (auth !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now = new Date()
        // Convert to Bangkok time (UTC+7)
        const bkkTime = new Date(now.getTime() + 7 * 60 * 60 * 1000)
        
        const yyyy = bkkTime.getUTCFullYear()
        const mm = String(bkkTime.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(bkkTime.getUTCDate()).padStart(2, '0')
        const dateKey = `${yyyy}-${mm}-${dd}`
        
        const dayOfWeek = bkkTime.getUTCDay() // 0 = Sunday, 6 = Saturday
        const currentHour = bkkTime.getUTCHours()
        const currentMin = bkkTime.getUTCMinutes()
        const timeValMin = currentHour * 60 + currentMin

        // 1. Check if it's a holiday
        const { data: holiday } = await supabaseAdmin
            .from('holidays')
            .select('type')
            .eq('date', dateKey)
            .maybeSingle()

        const isHoliday = holiday && holiday.type !== 'work'
        const isWeekend = dayOfWeek === 0 || (dayOfWeek === 6 && (!holiday || holiday.type !== 'work'))

        if (isHoliday || isWeekend) {
            return NextResponse.json({ success: true, message: 'Monitoring skipped: weekend or holiday' })
        }

        // 2. Check if within monitoring window (09:30 - 18:30)
        if (timeValMin < MONITOR_START_BKK_MIN || timeValMin > MONITOR_END_BKK_MIN) {
            return NextResponse.json({ success: true, message: 'Monitoring skipped: outside working hours' })
        }

        // 3. Query the latest card scan record
        const { data: latestScan, error: scanErr } = await supabaseAdmin
            .from('card_scans')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (scanErr) {
            console.error('[monitor-sync] database fetch error:', scanErr)
            return NextResponse.json({ error: scanErr.message }, { status: 500 })
        }

        if (!latestScan) {
            return NextResponse.json({ success: true, message: 'No card scan logs found in database' })
        }

        const lastSyncMs = new Date(latestScan.created_at).getTime()
        const delayMs = Date.now() - lastSyncMs

        if (delayMs > STALL_LIMIT_MS) {
            // 4. Resolve Telegram recipients (Mod and Mod HR)
            const { data: employees } = await supabaseAdmin
                .from('employees')
                .select('telegram_chat_id, nickname')
                .in('employee_code', ['506-69', '153-59'])

            const chatIds = new Set<string>()
            employees?.forEach(e => {
                if (e.telegram_chat_id) chatIds.add(e.telegram_chat_id)
            })

            // Fallback hardcoded chat IDs if not found/modified in DB
            if (chatIds.size === 0) {
                chatIds.add('5921815138') // สุริยะ (ม๊อด)
                chatIds.add('5814594966') // อาทิตย์ (มด)
            }

            // Format last sync time for BKK timezone
            const lastSyncDate = new Date(lastSyncMs)
            const bkkSyncDate = new Date(lastSyncDate.getTime() + 7 * 60 * 60 * 1000)
            const syncTimeStr = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'UTC',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(bkkSyncDate)

            const syncDateStr = `${bkkSyncDate.getUTCDate()} ${
                ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][bkkSyncDate.getUTCMonth()]
            } ${bkkSyncDate.getUTCFullYear() + 543}`

            // Construct Alert Message
            const alertText = [
                `⚠️ <b>[แจ้งเตือนระบบ EBCI Nexus]</b>`,
                `การเชื่อมต่อเครื่องสแกนบัตรขัดข้อง หรือหยุดส่งข้อมูลนานเกิน 2 ชั่วโมง`,
                ``,
                `⏱ <b>Sync ล่าสุดเมื่อ:</b> ${syncDateStr} เวลา ${syncTimeStr} น.`,
                `📢 โปรดตรวจสอบว่าเครื่อง Windows หรือ HIP Link Agent ทำงานปกติและเปิดอินเทอร์เน็ตอยู่หรือไม่`
            ].join('\n')

            // Send Telegram to all resolved chat IDs
            const sendPromises = Array.from(chatIds).map(chatId => 
                sendTelegram({ chatId, text: alertText })
                    .catch(err => console.error(`[monitor-sync] failed to alert chat ${chatId}:`, err))
            )
            await Promise.all(sendPromises)

            return NextResponse.json({ 
                success: true, 
                alertSent: true, 
                delayMinutes: Math.round(delayMs / 60000), 
                lastSyncTime: latestScan.created_at 
            })
        }

        return NextResponse.json({ 
            success: true, 
            alertSent: false, 
            delayMinutes: Math.round(delayMs / 60000) 
        })

    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        console.error('[monitor-sync] handler error:', errMsg)
        return NextResponse.json({ error: errMsg }, { status: 500 })
    }
}

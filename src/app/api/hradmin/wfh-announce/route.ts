import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

/**
 * §3.1 BETA + new — Bulk WFH announcement.
 *
 * One-click HR action that combines:
 *   1. Insert N rows in `holidays` (type='wfh', one per day in range)
 *   2. Insert 1 row in `announcements` (pinned to dashboard) — optional
 *   3. Bulk insert N notifications (one per active employee) — optional
 *   4. Bulk send N emails — optional
 *
 * Use case: company decides to WFH for 3-4 days at short notice (oil
 * spike, flooding, COVID, etc). HR can't be expected to manually create
 * 4 holiday rows + 53 notifications + 53 emails by hand — this collapses
 * it into one button press.
 *
 * The 3 side-effect channels are independently toggleable via the
 * request body so HR can adjust noise per-event:
 *   - notifyInApp: true   (recommended — cheap, always-on)
 *   - notifyEmail: true   (recommended — beats people who don't open the app)
 *   - createAnnouncement: true (recommended — durable record on dashboard)
 *
 * Returns a summary of what actually happened so the UI can show
 * "สร้าง 4 วัน WFH · แจ้ง 53 คน · ส่งเมล 53 ฉบับ" instead of an opaque OK.
 */

interface RequestBody {
    startDate: string                   // YYYY-MM-DD
    endDate: string                     // YYYY-MM-DD (inclusive)
    reason: string                      // free-text Thai
    notifyInApp?: boolean
    notifyEmail?: boolean
    createAnnouncement?: boolean
}

interface BulkSummary {
    daysCreated: number
    daysSkipped: number                 // dates that already had a 'wfh' row
    announcementId: string | null
    notificationsCreated: number
    emailsSent: number
    emailsFailed: number
    employeesTargeted: number
    errors: string[]
}

const MAX_DAYS = 14   // sanity cap — anything longer is suspicious

export async function POST(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let body: RequestBody
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }

    const { startDate, endDate, reason } = body
    if (!startDate || !endDate || !reason?.trim()) {
        return NextResponse.json({ error: 'startDate + endDate + reason required' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return NextResponse.json({ error: 'dates must be YYYY-MM-DD' }, { status: 400 })
    }

    // Build the date list (inclusive on both ends).
    const dates = expandDateRange(startDate, endDate)
    if (dates.length === 0) {
        return NextResponse.json({ error: 'endDate must be >= startDate' }, { status: 400 })
    }
    if (dates.length > MAX_DAYS) {
        return NextResponse.json(
            { error: `range too long (max ${MAX_DAYS} days). Split into multiple announcements.` },
            { status: 400 },
        )
    }

    const reasonText = reason.trim().slice(0, 1000)
    const summary: BulkSummary = {
        daysCreated: 0, daysSkipped: 0,
        announcementId: null,
        notificationsCreated: 0, emailsSent: 0, emailsFailed: 0,
        employeesTargeted: 0, errors: [],
    }

    // ── 1. Insert holidays (skip dates that already have a wfh row) ─────
    const { data: existing } = await supabaseAdmin
        .from('holidays')
        .select('date, type')
        .in('date', dates)
        .eq('type', 'wfh')
    const alreadyWfh = new Set(((existing ?? []) as Array<{ date: string }>).map(r => r.date))
    const toInsert = dates.filter(d => !alreadyWfh.has(d))

    if (toInsert.length > 0) {
        const rows = toInsert.map(d => ({
            id: randomUUID(),
            date: d,
            // Truncate the name so a long reason doesn't blow out the
            // calendar UI; full text lives on the announcement.
            name: `WFH — ${reasonText.slice(0, 60)}${reasonText.length > 60 ? '…' : ''}`,
            type: 'wfh',
        }))
        const { error: holErr } = await supabaseAdmin.from('holidays').insert(rows)
        if (holErr) {
            console.error('[wfh-announce] holidays insert error:', holErr)
            summary.errors.push(`holidays insert: ${holErr.message}`)
        } else {
            summary.daysCreated = toInsert.length
        }
    }
    summary.daysSkipped = dates.length - toInsert.length

    // ── 2. Create announcement (optional) ───────────────────────────────
    if (body.createAnnouncement !== false) {
        const headline = dates.length === 1
            ? `📢 ประกาศ WFH วันที่ ${formatThaiShort(dates[0])}`
            : `📢 ประกาศ WFH ${formatThaiShort(dates[0])} – ${formatThaiShort(dates[dates.length - 1])}`
        const content = `${reasonText}\n\nวัน WFH: ${dates.map(formatThaiShort).join(', ')}\n\nสามารถเช็คอิน WFH ผ่านแอปได้เลยในวันดังกล่าว`

        const now = new Date().toISOString()
        const { data: ann, error: annErr } = await supabaseAdmin
            .from('announcements')
            .insert({
                id: randomUUID(),
                headline,
                content,
                priority: 'high',
                publishStatus: 'published',
                publish_status: 'published',  // some queries use snake_case alias
                publish_date: now,
                email_sent: !!body.notifyEmail,
                email_sent_at: body.notifyEmail ? now : null,
                created_by: auth.session.id,
                created_at: now,
                updated_at: now,
                expires_at: new Date(Date.parse(dates[dates.length - 1] + 'T23:59:59') + 86_400_000)
                    .toISOString(),
            })
            .select('id')
            .single()
        if (annErr || !ann) {
            console.error('[wfh-announce] announcement insert error:', annErr)
            summary.errors.push(`announcement insert: ${annErr?.message ?? 'unknown'}`)
        } else {
            summary.announcementId = ann.id as string
        }
    }

    // ── 3+4. Notify employees (in-app + email) ─────────────────────────
    if (body.notifyInApp !== false || body.notifyEmail !== false) {
        const { data: emps } = await supabaseAdmin
            .from('employees')
            .select('id, user_id, email, first_name_th, nickname')
            .eq('status', 'active')
        const targets = (emps ?? []) as Array<{
            id: string
            user_id: string | null
            email: string | null
            first_name_th: string | null
            nickname: string | null
        }>
        summary.employeesTargeted = targets.length

        const headline = dates.length === 1
            ? `📢 WFH วันที่ ${formatThaiShort(dates[0])}`
            : `📢 WFH ${formatThaiShort(dates[0])} – ${formatThaiShort(dates[dates.length - 1])}`
        const bodyText = `${reasonText} (รวม ${dates.length} วัน)`

        // In-app: per-recipient row via createNotification (RPC handles
        // the FK + actor metadata). We deliberately don't Promise.all to
        // avoid hammering the RPC — sequential is fine for ~50 employees.
        if (body.notifyInApp !== false) {
            for (const t of targets) {
                if (!t.user_id) continue
                const result = await createNotification({
                    recipient_user_id: t.user_id,
                    type: 'wfh_announcement',
                    title: headline,
                    body: bodyText,
                    action_url: summary.announcementId
                        ? `/portal/announcements?focus=${summary.announcementId}`
                        : '/portal/announcements',
                    action_label: 'ดูรายละเอียด',
                    icon: '📢',
                    color: 'blue',
                    sender_user_id: auth.session.id,
                    sender_name: auth.session.name ?? 'HR',
                })
                if (result?.id) summary.notificationsCreated++
            }
        }

        // Email: also sequential — Resend can handle parallelism but we
        // care more about not double-sending if the route gets retried.
        if (body.notifyEmail !== false) {
            const html = renderWfhEmail({ headline, reasonText, dates })
            for (const t of targets) {
                if (!t.email) continue
                try {
                    const res = await sendEmail({
                        to: t.email,
                        subject: headline,
                        html,
                        sender: 'hr',
                    })
                    if (res && (res as { mock?: boolean }).mock !== true) {
                        summary.emailsSent++
                    } else if (res) {
                        // mock mode — treat as "sent" for the dev flow
                        summary.emailsSent++
                    }
                } catch (err) {
                    console.error('[wfh-announce] email failed for', t.email, err)
                    summary.emailsFailed++
                }
            }
        }
    }

    return NextResponse.json({ success: true, summary })
}

// ─── helpers ───────────────────────────────────────────────────────────────

function expandDateRange(start: string, end: string): string[] {
    const startMs = Date.parse(start + 'T00:00:00Z')
    const endMs = Date.parse(end + 'T00:00:00Z')
    if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return []
    const out: string[] = []
    for (let t = startMs; t <= endMs; t += 86_400_000) {
        out.push(new Date(t).toISOString().slice(0, 10))
    }
    return out
}

const TH_MONTH_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function formatThaiShort(iso: string): string {
    const [y, m, d] = iso.split('-')
    return `${parseInt(d, 10)} ${TH_MONTH_SHORT[parseInt(m, 10) - 1]} ${parseInt(y, 10) + 543}`
}

function renderWfhEmail({
    headline, reasonText, dates,
}: {
    headline: string; reasonText: string; dates: string[]
}): string {
    const dayList = dates.map(d => `<li style="padding:4px 0;">${formatThaiShort(d)}</li>`).join('')
    return `
<!doctype html>
<html><body style="margin:0;padding:0;background:#0d0408;font-family:'Sukhumvit Set','Noto Sans Thai',sans-serif;color:#f6e7ea;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:linear-gradient(135deg,#561e23 0%,#15040a 100%);padding:24px;border-radius:20px;border:1px solid rgba(255,255,255,0.10);">
      <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:0.04em;color:rgba(246,231,234,0.6);text-transform:uppercase;font-weight:700;">EBCI HR ประกาศ</p>
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#fff;font-weight:800;">${escapeHtml(headline)}</h1>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:rgba(246,231,234,0.85);white-space:pre-wrap;">${escapeHtml(reasonText)}</p>
      <div style="margin-top:16px;padding:14px 16px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:12px;">
        <p style="margin:0 0 8px 0;font-size:12px;color:rgba(246,231,234,0.55);font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">วัน WFH</p>
        <ul style="margin:0;padding:0 0 0 18px;font-size:14px;color:#fcd34d;font-weight:600;">${dayList}</ul>
      </div>
      <p style="margin:18px 0 0 0;font-size:13px;color:rgba(246,231,234,0.55);">เช็คอิน WFH ผ่านแอปได้เลยในวันดังกล่าว</p>
    </div>
    <p style="margin:16px 0 0 0;font-size:11px;color:rgba(246,231,234,0.4);text-align:center;">EBCI Nexus · ระบบส่งอัตโนมัติ — กรุณาอย่าตอบกลับอีเมลนี้</p>
  </div>
</body></html>`.trim()
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

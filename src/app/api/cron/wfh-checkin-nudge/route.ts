import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createNotification, getEmployeeUserId } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/wfh-checkin-nudge
 *
 * Daily cron (vercel.json: 03:00 UTC = 10:00 BKK) that finds employees
 * with an APPROVED WFH covering today who haven't checked in yet, and
 * sends them a nudge (in-app 🔔 + email).
 *
 * Mod's 4 May audit Scenario 3: "อนุมัติ WFH แต่ลืมเช็คอิน" — without
 * this cron, the day silently lands as `status='absent'` in
 * reconciliation (then gets reclassified to 'on_leave' only if the
 * employee also happened to file leave for the day, which they didn't).
 * The nudge gives them a chance to fix it before the day ends and the
 * data calcifies.
 *
 * Why 10:00 BKK (1.5h past the 08:30 official start)? Earlier than that
 * is too aggressive — the on-time WFH'er hasn't even sat down at their
 * desk yet at 09:00. Past noon and we're nudging too late to save
 * the workday's data.
 *
 * Cooldown: per-day. We use the existing wfh_requests.last_reminded_at
 * (already stamped by the leave-reminders cron when nagging the
 * approver). Filter: only nudge if last_reminded_at is older than
 * "today's start in Bangkok" — that way the same approval-pending
 * reminder vs check-in nudge don't accidentally suppress each other.
 *
 * Auth: same Bearer CRON_SECRET pattern as /api/cron/leave-reminders.
 */

interface WfhRow {
    id: string
    employee_id: string
    reference_code: string
    start_date: string
    end_date: string
    last_reminded_at: string | null
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    const auth = req.headers.get('authorization')
    const queryKey = new URL(req.url).searchParams.get('key')
    if (auth !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nowIso = new Date().toISOString()

    // Bangkok-local "today" YYYY-MM-DD — used to match against
    // wfh_requests.start_date / end_date which are date-typed.
    const nowBkk = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const todayBkkIso = `${nowBkk.getUTCFullYear()}-${String(nowBkk.getUTCMonth() + 1).padStart(2, '0')}-${String(nowBkk.getUTCDate()).padStart(2, '0')}`

    // Bangkok start-of-today expressed as a UTC instant.
    // Use this to (a) check if the employee already checked in today,
    // (b) decide whether last_reminded_at is "stale enough" to re-nudge.
    const startOfTodayBkkUtcIso = new Date(`${todayBkkIso}T00:00:00+07:00`).toISOString()

    // 1. WFH approved + covering today + not nudged today yet.
    const { data: wfhRows, error: qErr } = await supabaseAdmin
        .from('wfh_requests')
        .select('id, employee_id, reference_code, start_date, end_date, last_reminded_at')
        .eq('status', 'approved')
        .lte('start_date', todayBkkIso)
        .gte('end_date', todayBkkIso)
        .or(`last_reminded_at.is.null,last_reminded_at.lt.${startOfTodayBkkUtcIso}`)
        .limit(200)

    if (qErr) {
        console.error('[cron/wfh-nudge] query error:', qErr)
        return NextResponse.json({ error: qErr.message }, { status: 500 })
    }

    const rows = (wfhRows ?? []) as WfhRow[]
    const summary = { scanned: rows.length, nudged: 0, alreadyCheckedIn: 0, errors: 0 }

    if (rows.length === 0) {
        return NextResponse.json({ success: true, summary })
    }

    // 2. Bulk-fetch today's checkins for ALL candidate employees in one
    //    query (avoid N+1).
    const employeeIds = Array.from(new Set(rows.map(r => r.employee_id)))
    const { data: todaysCheckins } = await supabaseAdmin
        .from('checkins')
        .select('employee_id')
        .in('employee_id', employeeIds)
        .gte('checked_in_at', startOfTodayBkkUtcIso)

    const checkedInToday = new Set(
        (todaysCheckins ?? []).map(c => c.employee_id as string),
    )

    // 3. Per-row nudge.
    for (const row of rows) {
        try {
            if (checkedInToday.has(row.employee_id)) {
                summary.alreadyCheckedIn++
                continue
            }
            const ok = await nudgeEmployee(row, todayBkkIso)
            if (ok) {
                summary.nudged++
                await supabaseAdmin
                    .from('wfh_requests')
                    .update({ last_reminded_at: nowIso })
                    .eq('id', row.id)
            }
        } catch (err) {
            summary.errors++
            console.error('[cron/wfh-nudge] row failed:', row.id, err)
        }
    }

    return NextResponse.json({ success: true, summary })
}

async function nudgeEmployee(row: WfhRow, todayBkkIso: string): Promise<boolean> {
    const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('first_name_th, last_name_th, nickname, email, user_id')
        .eq('id', row.employee_id)
        .maybeSingle()

    const e = emp as {
        first_name_th: string | null
        last_name_th: string | null
        nickname: string | null
        email: string | null
        user_id: string | null
    } | null
    if (!e) return false

    const displayName = e.nickname?.trim()
        || `${(e.first_name_th ?? '').trim()} ${(e.last_name_th ?? '').trim()}`.trim()
        || 'พนักงาน'

    // ── In-app 🔔 ─────────────────────────────────────────────────────
    const userId = e.user_id ?? await getEmployeeUserId(row.employee_id)
    if (userId) {
        await createNotification({
            recipient_user_id: userId,
            type: 'wfh_checkin_nudge',
            title: 'อย่าลืมเช็คอิน WFH วันนี้',
            body: `วันนี้คุณได้รับอนุมัติ WFH แล้ว (${row.reference_code}) — กรุณาเช็คอินผ่านแอปเพื่อบันทึกว่ามาทำงานวันนี้`,
            color: 'amber',
            icon: 'Home',
            entity_type: 'wfh_request',
            entity_id: row.id,
            reference_code: row.reference_code,
            action_url: '/portal/checkin',
            action_label: 'ไปเช็คอิน',
        }).catch(err => console.error('[cron/wfh-nudge] notif failed:', err))
    }

    // ── Email ─────────────────────────────────────────────────────────
    if (e.email) {
        await sendEmail({
            to: e.email,
            subject: `[เตือน] อย่าลืมเช็คอิน WFH วันนี้ (${todayBkkIso})`,
            html: buildNudgeEmailHtml(displayName, row.reference_code, todayBkkIso),
        }).catch(err => console.error('[cron/wfh-nudge] email failed:', err))
    }

    return true
}

function buildNudgeEmailHtml(displayName: string, refCode: string, todayBkkIso: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nexus.ebci-cargo.com'
    return `
<!DOCTYPE html>
<html lang="th">
  <head><meta charset="utf-8"><title>เตือนเช็คอิน WFH</title></head>
  <body style="margin:0;padding:0;background:#1a0a0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;color:#fff">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#1a0a0e">
      <tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:rgba(86,30,35,0.92);border-radius:16px;overflow:hidden">
          <tr><td style="padding:24px 28px;background:rgba(50,15,20,0.96)">
            <h1 style="margin:0;font-size:18px;font-weight:700;color:#fff">⏰ อย่าลืมเช็คอิน WFH วันนี้</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7)">${todayBkkIso} · รหัสคำขอ ${refCode}</p>
          </td></tr>
          <tr><td style="padding:24px 28px">
            <p style="margin:0 0 12px;font-size:15px;line-height:1.6">สวัสดีคุณ <strong>${escapeHtml(displayName)}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6">วันนี้คุณได้รับอนุมัติ WFH แล้ว แต่ระบบยังไม่ได้รับการเช็คอินจากคุณ — กรุณาเปิดแอปและกดเช็คอินเพื่อให้ระบบบันทึกว่าวันนี้คุณมาทำงาน (ไม่ทำจะถูก mark ว่าขาดงาน)</p>
            <p style="margin:24px 0 0;text-align:center">
              <a href="${appUrl}/portal/checkin" style="display:inline-block;padding:12px 28px;border-radius:10px;background:#f59e0b;color:#1a0a0e;font-weight:700;font-size:15px;text-decoration:none">เช็คอิน WFH ตอนนี้</a>
            </p>
          </td></tr>
          <tr><td style="padding:16px 28px;background:rgba(50,15,20,0.96);font-size:12px;color:rgba(255,255,255,0.55)">
            EBCI Nexus · เตือนอัตโนมัติทุก 10:00 น. หากเช็คอินแล้วก่อนเวลานี้จะไม่มี email ฉบับนี้
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`.trim()
}

function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]!))
}

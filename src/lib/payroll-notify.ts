import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ebci-nexus.vercel.app'

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

/**
 * Notify the employee that a new salary slip has been uploaded for
 * a given period. Fires both an in-app notification and (if the
 * employee has a personal email on file) a templated email. Best-
 * effort: never throws — slip upload should not roll back if a
 * single notification can't be delivered.
 *
 * Called from both the single-upload and bulk-upload code paths so
 * the wording stays in one place.
 */
export async function notifyEmployeeOfNewSlip(args: {
    employeeId: string
    year: number
    month: number   // 1-12
}): Promise<void> {
    const monthName = THAI_MONTHS[args.month - 1] ?? String(args.month)
    const periodLabel = `${monthName} ${args.year + 543}`  // BE for Thai readers

    // Pull the employee row — we need user_id for the notification
    // and email for the mail send.
    const { data: emp } = await supabaseAdmin
        .from('employees')
        .select('id, user_id, email, first_name_th, last_name_th, nickname')
        .eq('id', args.employeeId)
        .maybeSingle()
    if (!emp) {
        console.warn('[payroll-notify] employee not found:', args.employeeId)
        return
    }

    // ── In-app notification ───────────────────────────────────────────
    if (emp.user_id) {
        try {
            await createNotification({
                recipient_user_id: emp.user_id as string,
                type: 'salary_slip_ready',
                title: `สลิปเงินเดือน ${periodLabel} พร้อมแล้ว`,
                body: 'ฝ่ายบัญชีได้นำสลิปเงินเดือนเข้าระบบเรียบร้อย — แตะเพื่อเปิดดู',
                action_url: '/portal/payroll',
                action_label: 'เปิดดูสลิป',
                entity_type: 'salary_slip',
                entity_id: `${args.employeeId}_${args.year}_${args.month}`,
                icon: 'Wallet',
                color: 'green',
            })
        } catch (err) {
            console.error('[payroll-notify] notification error:', err)
        }
    }

    // ── Email ─────────────────────────────────────────────────────────
    const recipientEmail = (emp.email as string | null)?.trim()
    if (recipientEmail) {
        const displayName = (emp.nickname as string | null)?.trim()
            ? `${emp.nickname}`
            : `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim() || 'พนักงาน'

        const portalUrl = `${APP_URL}/portal/payroll`

        const html = `
<!doctype html>
<html lang="th"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter, 'Sukhumvit Set', sans-serif;color:#1a1a1a;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#065f46 0%,#0e7c5a 60%,#34d399 100%);padding:32px 24px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.28em;color:rgba(255,255,255,0.7);text-transform:uppercase;">Payroll · Salary Slip</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;">สลิปเงินเดือน ${periodLabel}</h1>
          </td>
        </tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.65;">สวัสดีค่ะ คุณ<strong>${escapeHtml(displayName)}</strong></p>
          <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#374151;">
            ดิฉันแจ้งให้ทราบว่า <strong>สลิปเงินเดือนประจำเดือน ${periodLabel}</strong>
            พร้อมให้ดาวน์โหลดในระบบเรียบร้อยแล้วนะคะ
          </p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#4b5563;">
            กรุณากดปุ่มด้านล่างเพื่อเข้าดูสลิป — ระบบจะเปิดเฉพาะของคุณเท่านั้น
            หากพบความผิดพลาดในรายการคำนวณ โปรดแจ้งฝ่ายบัญชีโดยเร็วที่สุดเพื่อแก้ไข
          </p>
          <table cellpadding="0" cellspacing="0" role="presentation" style="margin:18px 0;">
            <tr><td>
              <a href="${portalUrl}" style="display:inline-block;background:#0e7c5a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
                เปิดดูสลิป
              </a>
            </td></tr>
          </table>
          <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
            อีเมลอัตโนมัติ โปรดอย่าตอบกลับ — หากมีข้อสงสัยเกี่ยวกับเงินเดือน กรุณาติดต่อฝ่ายบัญชีโดยตรง
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
`

        try {
            await sendEmail({
                to: recipientEmail,
                subject: `สลิปเงินเดือน ${periodLabel} พร้อมให้ดาวน์โหลดแล้ว`,
                html,
                sender: 'hr',  // generic HR sender; payroll-specific identity can be added later
            })
        } catch (err) {
            console.error('[payroll-notify] email error:', err)
        }
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

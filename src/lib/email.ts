import { Resend } from 'resend'

/**
 * From address used on every outgoing transactional email.
 *
 * - Set EMAIL_FROM in Vercel env to something like
 *   "EBCI Careers <careers@ebcinext.com>" once the domain is verified
 *   in the Resend dashboard. Until then the default
 *   `onboarding@resend.dev` works ONLY for the email address that owns
 *   the Resend account — any other recipient will silently be dropped
 *   (this is a Resend restriction, not something the code can work
 *   around).
 * - EMAIL_REPLY_TO is optional; set it to e.g. "hr@ebcitrade.com" so
 *   replies go to a monitored inbox.
 */
const FROM = process.env.EMAIL_FROM ?? 'EBCI NEXUS HR <onboarding@resend.dev>'
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? undefined

interface SendEmailParams {
    to: string | string[]
    subject: string
    html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
    const apiKey = process.env.RESEND_API_KEY
    const recipients = Array.isArray(to) ? to : [to]

    if (!apiKey) {
        // Dev/dry-run mode — do not pretend success in logs; the caller
        // receives `mock: true` so it can surface the state clearly.
        console.log('==========================================')
        console.log('📧 [MOCK EMAIL] — RESEND_API_KEY not set')
        console.log(`From: ${FROM}`)
        console.log(`To: ${recipients.join(', ')}`)
        console.log(`Subject: ${subject}`)
        console.log('==========================================')
        return { success: true, mock: true as const, recipients }
    }

    const resend = new Resend(apiKey)

    try {
        // Chunk to stay under Resend's 50-recipient per-call limit.
        const chunkSize = 50
        const results: Array<{ success: boolean; id?: string; error?: unknown }> = []
        for (let i = 0; i < recipients.length; i += chunkSize) {
            const chunk = recipients.slice(i, i + chunkSize)
            const { data, error } = await resend.emails.send({
                from: FROM,
                to: chunk,
                subject,
                html,
                ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
            })
            if (error) {
                console.error('[email] Resend chunk error:', {
                    to: chunk, subject, from: FROM, error,
                })
                results.push({ success: false, error })
            } else {
                console.log(`[email] sent → ${chunk.join(', ')} — id=${data?.id}`)
                results.push({ success: true, id: data?.id })
            }
        }
        const allOk = results.every(r => r.success)
        return { success: allOk, results, recipients }
    } catch (err) {
        console.error('[email] sendEmail exception:', err)
        return { success: false, error: err, recipients }
    }
}

// ─── Announcement email HTML builder ──────────────────────────────────────────
export function buildAnnouncementEmail({
    priority,
    headline,
    content,
    imageUrl,
}: {
    priority: 'urgent' | 'emergency'
    headline: string
    content: string
    imageUrl?: string | null
}): string {
    const isEmergency = priority === 'emergency'

    const accentColor = isEmergency ? '#dc2626' : '#d97706'  // red-600 / amber-600
    const accentLight = isEmergency ? '#fef2f2' : '#fffbeb'
    const badgeLabel = isEmergency ? '🚨 ฉุกเฉิน' : '⚠️ ด่วน'
    const bannerBg = isEmergency ? '#7f1d1d' : '#78350f'

    const contentHtml = content
        .split('\n')
        .map(line => `<p style="margin:0 0 8px 0;line-height:1.7;color:#374151;">${line}</p>`)
        .join('')

    const imageBlock = imageUrl
        ? `<div style="margin:24px 0;">
               <img src="${imageUrl}" alt="${headline}"
                    style="width:100%;max-height:360px;object-fit:cover;border-radius:8px;display:block;" />
           </div>`
        : ''

    return `<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Sarabun',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- Header / Logo -->
        <tr>
          <td style="background:linear-gradient(135deg,#561e23 0%,#882136 60%,#ad5f6c 100%);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:0.12em;text-transform:uppercase;">EBCI NEXUS</p>
            <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.55);letter-spacing:0.3em;text-transform:uppercase;">Human Resources</p>
          </td>
        </tr>

        <!-- Priority Banner -->
        <tr>
          <td style="background:${bannerBg};padding:10px 32px;text-align:center;">
            <span style="font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.15em;text-transform:uppercase;">${badgeLabel} — ประกาศจากฝ่าย HR</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <!-- Headline -->
            <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:${accentColor};line-height:1.3;">${headline}</h1>

            <!-- Alert badge -->
            <div style="display:inline-block;background:${accentLight};border:1px solid ${accentColor}33;border-radius:6px;padding:6px 14px;margin-bottom:20px;">
              <span style="font-size:12px;font-weight:700;color:${accentColor};text-transform:uppercase;letter-spacing:0.1em;">${badgeLabel}</span>
            </div>

            <!-- Image -->
            ${imageBlock}

            <!-- Content -->
            <div style="font-size:15px;color:#374151;line-height:1.7;">${contentHtml}</div>

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />

            <!-- Meta -->
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              วันที่: ${new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<br/>
              อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ — กรุณาอย่าตอบกลับ
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#6b7280;">ประกาศโดยฝ่าย HR — <strong>EBCI NEXUS</strong></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`
}

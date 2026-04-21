import 'server-only'
import { sendEmail } from '@/lib/email'

const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://nexus.ebcitrade.com'

const HR_NOTIFY_EMAIL = process.env.HR_NOTIFY_EMAIL ?? 'hr@ebcitrade.com'

// ── Template helpers ────────────────────────────────────────────────────────
function wrap(title: string, bodyHtml: string): string {
    return `<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#1a0609;font-family:'Prompt','Kanit','Helvetica Neue',sans-serif;color:#fff;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="background:linear-gradient(145deg,#561e23 0%,#882136 100%);padding:20px 28px;border-radius:16px 16px 0 0;">
        <p style="margin:0;font-size:12px;letter-spacing:0.3em;color:rgba(255,255,255,0.5);text-transform:uppercase;">EBCI Careers</p>
        <h1 style="margin:6px 0 0;font-size:20px;line-height:1.35;font-weight:700;color:#fff;">${title}</h1>
      </div>
      <div style="background:#2a0a12;padding:28px;border-radius:0 0 16px 16px;border:1px solid rgba(255,255,255,0.08);border-top:0;">
        ${bodyHtml}
      </div>
      <p style="margin:20px 0 0;font-size:11px;color:rgba(255,255,255,0.3);text-align:center;">
        EBCI Trade &middot; อีเมลอัตโนมัติ โปรดอย่าตอบกลับ
      </p>
    </div>
  </body>
</html>`
}

function button(href: string, label: string): string {
    return `<a href="${href}" style="display:inline-block;background:#ad5f6c;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">${label}</a>`
}

// ── 1. Draft saved — sent after /start ──────────────────────────────────────
export async function sendDraftSavedEmail(args: {
    to: string
    referenceCode: string
    position?: string | null
}) {
    const resumeUrl = `${BASE_URL}/careers/apply?ref=${encodeURIComponent(args.referenceCode)}`
    const html = wrap(
        'ใบสมัครงาน EBCI บันทึกเรียบร้อย',
        `
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.85);">
            สวัสดีค่ะ<br>
            เราได้รับใบสมัครของคุณ${args.position ? ` สำหรับตำแหน่ง <strong>${args.position}</strong>` : ''}
            และบันทึกเรียบร้อยแล้ว
        </p>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px 16px;margin:18px 0;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.2em;">รหัสใบสมัคร</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:700;letter-spacing:0.05em;color:#ffb4be;">${args.referenceCode}</p>
        </div>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75);">
            คุณสามารถกลับมากรอกใบสมัครต่อได้ โดยคลิกลิงก์ด้านล่าง หรือกรอก email และรหัสใบสมัครที่หน้า
            “ดูสถานะใบสมัคร” ในเว็บไซต์
        </p>
        ${button(resumeUrl, 'กรอกใบสมัครต่อ')}
        `,
    )
    return sendEmail({ to: args.to, subject: 'ใบสมัครงาน EBCI บันทึกเรียบร้อย', html })
}

// ── 2. Application submitted — sent to applicant ────────────────────────────
export async function sendApplicationSubmittedEmail(args: {
    to: string
    referenceCode: string
    applicantName?: string | null
    position?: string | null
}) {
    const html = wrap(
        'ขอบคุณสำหรับการสมัครงาน EBCI',
        `
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.85);">
            สวัสดี${args.applicantName ? ` คุณ${args.applicantName}` : ''}<br>
            เราได้รับใบสมัครของคุณ${args.position ? ` สำหรับตำแหน่ง <strong>${args.position}</strong>` : ''}เรียบร้อยแล้ว
        </p>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px 16px;margin:18px 0;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.2em;">รหัสใบสมัคร</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:700;letter-spacing:0.05em;color:#ffb4be;">${args.referenceCode}</p>
        </div>
        <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75);">
            ทีม HR จะพิจารณาใบสมัครและติดต่อกลับภายใน <strong>7 วันทำการ</strong>
            โปรดเก็บรหัสใบสมัครไว้เพื่อใช้อ้างอิง
        </p>
        `,
    )
    return sendEmail({ to: args.to, subject: 'ขอบคุณสำหรับการสมัครงาน EBCI', html })
}

// ── 3. HR notification — sent to HR team ────────────────────────────────────
export async function sendHrNotificationEmail(args: {
    applicationId: string
    referenceCode: string
    applicantName: string | null
    email: string
    position: string | null
}) {
    const adminUrl = `${BASE_URL}/hradmin/applicants/${args.applicationId}`
    const html = wrap(
        `ใบสมัครใหม่: ${args.position ?? 'ไม่ระบุตำแหน่ง'}`,
        `
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.85);">
            ใบสมัครใหม่เพิ่งส่งเข้าระบบ
        </p>
        <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;color:rgba(255,255,255,0.85);">
            <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);width:120px;">ตำแหน่ง</td><td><strong>${args.position ?? '—'}</strong></td></tr>
            <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);">ผู้สมัคร</td><td>${args.applicantName ?? '—'}</td></tr>
            <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);">Email</td><td>${args.email}</td></tr>
            <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);">รหัส</td><td style="color:#ffb4be;font-weight:600;">${args.referenceCode}</td></tr>
        </table>
        ${button(adminUrl, 'เปิดใบสมัคร')}
        `,
    )
    return sendEmail({
        to: HR_NOTIFY_EMAIL,
        subject: `ใบสมัครใหม่: ${args.position ?? 'ไม่ระบุตำแหน่ง'} — ${args.applicantName ?? args.email}`,
        html,
    })
}

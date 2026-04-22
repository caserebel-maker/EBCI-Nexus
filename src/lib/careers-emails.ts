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

// ─── Status-change emails ───────────────────────────────────────────────────
// One template per destination state. Each takes the same shape so the
// status API can pick and call without thinking about props.

export interface StatusEmailContext {
    to: string
    referenceCode: string
    applicantName?: string | null
    position?: string | null
    notes?: string | null
}

function statusHeader(ctx: StatusEmailContext, accentColor: string): string {
    return `
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.85);">
            สวัสดี${ctx.applicantName ? ` คุณ${ctx.applicantName}` : ''}
        </p>
        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px 16px;margin:18px 0;">
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.2em;">รหัสใบสมัคร</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:700;letter-spacing:0.05em;color:${accentColor};">${ctx.referenceCode}</p>
            ${ctx.position ? `<p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">ตำแหน่ง: ${ctx.position}</p>` : ''}
        </div>
    `
}

function optionalNotes(notes: string | null | undefined): string {
    if (!notes || !notes.trim()) return ''
    const escaped = notes.trim()
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `
        <div style="background:rgba(173,95,108,0.12);border:1px solid rgba(173,95,108,0.3);border-radius:8px;padding:12px 14px;margin-top:16px;">
            <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.2em;">หมายเหตุจาก HR</p>
            <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.85);white-space:pre-wrap;">${escaped}</p>
        </div>
    `
}

// ── 4a. reviewing ──────────────────────────────────────────────────────────
export async function sendStatusReviewingEmail(ctx: StatusEmailContext) {
    const html = wrap(
        'ใบสมัครของคุณกำลังถูกพิจารณา',
        `
        ${statusHeader(ctx, '#ffb4be')}
        <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.8);">
            ทีม HR ได้รับใบสมัครของคุณและ<strong>กำลังพิจารณา</strong>อยู่
            เราจะแจ้งผลให้ทราบเมื่อมีความคืบหน้า โปรดรอการติดต่อจากเราเร็ว ๆ นี้
        </p>
        ${optionalNotes(ctx.notes)}
        `,
    )
    return sendEmail({
        to: ctx.to,
        subject: `ใบสมัครของคุณกำลังถูกพิจารณา [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4b. shortlisted ────────────────────────────────────────────────────────
export async function sendStatusShortlistedEmail(ctx: StatusEmailContext) {
    const html = wrap(
        '🎉 ใบสมัครของคุณผ่านรอบแรก',
        `
        ${statusHeader(ctx, '#a7f3d0')}
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
            <strong>ขอแสดงความยินดี!</strong> ใบสมัครของคุณผ่านการพิจารณารอบแรกเรียบร้อย
            ทีม HR จะติดต่อกลับภายในไม่กี่วันเพื่อนัดวัน-เวลาสัมภาษณ์
        </p>
        <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.7);">
            โปรดเตรียมเอกสารประกอบเพิ่มเติมที่อาจต้องใช้ในวันสัมภาษณ์
        </p>
        ${optionalNotes(ctx.notes)}
        `,
    )
    return sendEmail({
        to: ctx.to,
        subject: `ใบสมัครของคุณผ่านรอบแรก [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4c. interview ──────────────────────────────────────────────────────────
export async function sendStatusInterviewEmail(ctx: StatusEmailContext) {
    const html = wrap(
        'นัดสัมภาษณ์',
        `
        ${statusHeader(ctx, '#c7d2fe')}
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
            ขอเชิญคุณเข้าร่วม<strong>สัมภาษณ์งาน</strong>ในขั้นตอนถัดไป
        </p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75);">
            ทีม HR จะติดต่อทางโทรศัพท์หรืออีเมลเพื่อนัดวัน-เวลา-สถานที่สัมภาษณ์
            โปรดเตรียมพร้อมและตอบกลับภายใน 2-3 วัน
        </p>
        ${optionalNotes(ctx.notes)}
        `,
    )
    return sendEmail({
        to: ctx.to,
        subject: `นัดสัมภาษณ์ [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4d. hired ──────────────────────────────────────────────────────────────
export async function sendStatusHiredEmail(ctx: StatusEmailContext) {
    const html = wrap(
        '🎊 ยินดีต้อนรับสู่ EBCI!',
        `
        ${statusHeader(ctx, '#6ee7b7')}
        <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:rgba(255,255,255,0.9);">
            <strong>ขอแสดงความยินดีอย่างยิ่ง!</strong> เรายินดีเสนอให้คุณเข้าร่วมงานกับทีม EBCI
        </p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75);">
            ทีม HR จะติดต่อเพื่อแจ้งรายละเอียดของสัญญาจ้าง
            วันเริ่มงาน และเอกสารที่ต้องเตรียมในลำดับถัดไป
        </p>
        ${optionalNotes(ctx.notes)}
        `,
    )
    return sendEmail({
        to: ctx.to,
        subject: `ยินดีต้อนรับสู่ EBCI! [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4e. rejected ───────────────────────────────────────────────────────────
export async function sendStatusRejectedEmail(ctx: StatusEmailContext) {
    const html = wrap(
        'ผลการพิจารณาใบสมัคร',
        `
        ${statusHeader(ctx, '#ffb4be')}
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
            ขอบคุณที่ให้ความสนใจร่วมงานกับ EBCI และสละเวลากรอกใบสมัครให้เรา
        </p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75);">
            หลังจากพิจารณาอย่างถี่ถ้วนแล้ว เราเสียใจที่ต้องแจ้งให้ทราบว่า<strong>ใบสมัครของคุณยังไม่ตรงกับที่เรามองหาในรอบนี้</strong>
            อย่างไรก็ดี เราจะเก็บข้อมูลของคุณไว้สำหรับโอกาสในอนาคต
            หากมีตำแหน่งที่เหมาะสมเราจะรีบติดต่อกลับ
        </p>
        <p style="margin:0;font-size:13px;line-height:1.7;color:rgba(255,255,255,0.6);">
            ขอให้คุณพบโอกาสดี ๆ ในเส้นทางอาชีพข้างหน้า
        </p>
        ${optionalNotes(ctx.notes)}
        `,
    )
    return sendEmail({
        to: ctx.to,
        subject: `ผลการพิจารณาใบสมัคร [${ctx.referenceCode}]`,
        html,
    })
}

/**
 * Dispatcher — picks the right template by the destination status so
 * the status-change API doesn't need to import each template by name.
 * Returns the sendEmail() result (or null for statuses with no email).
 */
export async function sendStatusChangeEmail(
    newStatus: string,
    ctx: StatusEmailContext,
) {
    switch (newStatus) {
        case 'reviewing':   return sendStatusReviewingEmail(ctx)
        case 'shortlisted': return sendStatusShortlistedEmail(ctx)
        case 'interview':   return sendStatusInterviewEmail(ctx)
        case 'hired':       return sendStatusHiredEmail(ctx)
        case 'rejected':    return sendStatusRejectedEmail(ctx)
        default:            return null
    }
}

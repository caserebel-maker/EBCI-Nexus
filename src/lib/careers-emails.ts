import 'server-only'
import { sendEmail } from '@/lib/email'

const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://ebci-nexus.vercel.app'

const HR_NOTIFY_EMAIL = process.env.HR_NOTIFY_EMAIL ?? 'hr@ebcitrade.com'

const LOGO_SILVER = `${BASE_URL}/brand/ebci-logo-silver.png`
const LOGO_MAROON = `${BASE_URL}/brand/ebci-logo-maroon.png`

// ── Shared tokens ───────────────────────────────────────────────────────────
// Kept inline (no CSS classes) because email clients strip <style> blocks
// and have wildly different inheritance rules. Inline style on every tag
// is the Outlook-safe pattern.
const FONT_STACK = `Inter, 'Helvetica Neue', Helvetica, Arial, 'Sukhumvit Set', 'Prompt', sans-serif`
const TEXT_PRIMARY = '#1a1a1a'
const TEXT_MUTED = '#4b5563'
const TEXT_DIM = '#6b7280'
const TEXT_GHOST = '#9ca3af'
const BORDER_LIGHT = '#e5e7eb'
const MAROON = '#882136'
const MAROON_DEEP = '#561e23'

// ── Layout helpers ──────────────────────────────────────────────────────────
interface WrapOptions {
    title: string
    accent?: 'maroon' | 'green' | 'red'   // header gradient
    subhead?: string | null                // small eyebrow caps above title
    bodyHtml: string
}

function wrap({ title, accent = 'maroon', subhead = null, bodyHtml }: WrapOptions): string {
    const gradients: Record<NonNullable<WrapOptions['accent']>, string> = {
        maroon: `linear-gradient(135deg, ${MAROON_DEEP} 0%, ${MAROON} 60%, #ad5f6c 100%)`,
        green:  'linear-gradient(135deg, #065f46 0%, #0e7c5a 60%, #34d399 100%)',
        red:    'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 60%, #f87171 100%)',
    }

    return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:${FONT_STACK};color:${TEXT_PRIMARY};">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;padding:32px 16px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="background:${gradients[accent]};padding:32px 24px;">
              <img
                src="${LOGO_SILVER}"
                alt="EBCI"
                width="180"
                style="display:inline-block;height:auto;max-width:180px;"
              />
              ${subhead ? `<p style="margin:12px 0 0;font-size:11px;letter-spacing:0.28em;color:rgba(255,255,255,0.65);text-transform:uppercase;">${escapeHtml(subhead)}</p>` : ''}
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:28px 32px 0;">
              <h1 style="margin:0;font-family:${FONT_STACK};font-size:22px;line-height:1.35;font-weight:600;color:${TEXT_PRIMARY};">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:18px 32px 32px;font-family:${FONT_STACK};font-size:16px;line-height:1.65;color:${TEXT_MUTED};">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 28px;">
              <div style="border-top:1px solid ${BORDER_LIGHT};padding-top:20px;text-align:center;">
                <img
                  src="${LOGO_MAROON}"
                  alt="EBCI"
                  width="80"
                  style="display:inline-block;height:auto;max-width:80px;opacity:0.7;margin-bottom:10px;"
                />
                <p style="margin:0;font-size:13px;font-weight:600;color:${TEXT_MUTED};">
                  Excellent Business Corporation International Co., Ltd.
                </p>
                <p style="margin:2px 0 0;font-size:12px;color:${TEXT_DIM};">
                  40 ปีแห่งความเป็นเลิศ ด้านโลจิสติกส์
                </p>
                <p style="margin:14px 0 0;font-size:11px;line-height:1.6;color:${TEXT_GHOST};">
                  อีเมลอัตโนมัติ โปรดอย่าตอบกลับ<br>
                  หากต้องการสอบถาม กรุณาติดต่อ
                  <a href="mailto:${HR_NOTIFY_EMAIL}" style="color:${MAROON};text-decoration:none;">${HR_NOTIFY_EMAIL}</a>
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

// Reference-code callout — the single most important thing in every mail
function referenceBlock(code: string, tone: 'maroon' | 'green' | 'red' = 'maroon'): string {
    const palette = {
        maroon: { border: `${MAROON}`,   tint: 'rgba(136,33,54,0.04)',  text: MAROON },
        green:  { border: '#10b981',     tint: 'rgba(16,185,129,0.06)', text: '#047857' },
        red:    { border: '#b91c1c',     tint: 'rgba(185,28,28,0.05)',  text: '#991b1b' },
    }[tone]
    return `
    <div style="background:${palette.tint};border:1.5px solid ${palette.border};border-radius:10px;padding:16px 20px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:10px;letter-spacing:0.25em;color:${TEXT_DIM};text-transform:uppercase;font-weight:600;">
        รหัสใบสมัคร
      </p>
      <p style="margin:6px 0 0;font-family:${FONT_STACK};font-size:24px;font-weight:700;letter-spacing:0.05em;color:${palette.text};">
        ${escapeHtml(code)}
      </p>
    </div>
  `
}

function summaryRows(rows: Array<[string, string]>): string {
    return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:16px 0;font-size:14px;">
      ${rows.map(([k, v]) => `
        <tr>
          <td style="padding:8px 0;color:${TEXT_DIM};width:140px;vertical-align:top;font-size:13px;">${escapeHtml(k)}</td>
          <td style="padding:8px 0;color:${TEXT_PRIMARY};">${v}</td>
        </tr>
      `).join('')}
    </table>
  `
}

function button(href: string, label: string, tone: 'maroon' | 'green' = 'maroon'): string {
    const bg = tone === 'green' ? '#10b981' : MAROON
    return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0 8px;">
      <tr><td align="center">
        <a href="${href}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;font-family:${FONT_STACK};">
          ${escapeHtml(label)}
        </a>
      </td></tr>
    </table>
  `
}

function paragraph(text: string, opts: { small?: boolean; muted?: boolean } = {}): string {
    const size = opts.small ? '14px' : '16px'
    const color = opts.muted ? TEXT_DIM : TEXT_PRIMARY
    return `<p style="margin:0 0 14px;font-size:${size};line-height:1.65;color:${color};">${text}</p>`
}

function optionalHrNotes(notes: string | null | undefined): string {
    if (!notes || !notes.trim()) return ''
    return `
    <div style="background:rgba(136,33,54,0.06);border-left:3px solid ${MAROON};padding:12px 16px;margin-top:20px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.2em;color:${TEXT_DIM};text-transform:uppercase;font-weight:600;">
        หมายเหตุจาก HR
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT_PRIMARY};white-space:pre-wrap;">${escapeHtml(notes.trim())}</p>
    </div>
  `
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// ══════════════════════════════════════════════════════════════════════════
// Templates
// ══════════════════════════════════════════════════════════════════════════

// ── 1. Draft saved — sent after /start ──────────────────────────────────────
export async function sendDraftSavedEmail(args: {
    to: string
    referenceCode: string
    position?: string | null
}) {
    const resumeUrl = `${BASE_URL}/careers/apply?ref=${encodeURIComponent(args.referenceCode)}`
    const html = wrap({
        title: 'ใบสมัครงาน EBCI บันทึกเรียบร้อย',
        subhead: 'Careers · Draft Saved',
        bodyHtml: `
            ${paragraph('สวัสดีค่ะ / สวัสดีครับ')}
            ${paragraph(`เราได้รับใบสมัครของคุณ${args.position ? ` สำหรับตำแหน่ง <strong style="color:${TEXT_PRIMARY};">${escapeHtml(args.position)}</strong>` : ''} และบันทึกเป็นร่างไว้ให้เรียบร้อยแล้ว`)}
            ${referenceBlock(args.referenceCode)}
            ${paragraph('คุณสามารถกลับมากรอกใบสมัครต่อได้ตลอด ระบบจะบันทึกข้อมูลให้โดยอัตโนมัติทุก 3 วินาที ไม่ต้องกังวลว่าจะหายระหว่างกรอก', { small: true, muted: true })}
            ${button(resumeUrl, 'กรอกใบสมัครต่อ')}
        `,
    })
    return sendEmail({ to: args.to, subject: 'ใบสมัครงาน EBCI บันทึกเรียบร้อย', html })
}

// ── 2. Application submitted — sent to applicant ────────────────────────────
export async function sendApplicationSubmittedEmail(args: {
    to: string
    referenceCode: string
    applicantName?: string | null
    position?: string | null
}) {
    const html = wrap({
        title: 'ขอบคุณสำหรับการสมัครงาน',
        subhead: 'Careers · Application Received',
        bodyHtml: `
            ${paragraph(`สวัสดี${args.applicantName ? ` คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(args.applicantName)}</strong>` : ''}`)}
            ${paragraph(`เราได้รับใบสมัครของคุณ${args.position ? ` สำหรับตำแหน่ง <strong style="color:${TEXT_PRIMARY};">${escapeHtml(args.position)}</strong>` : ''} เรียบร้อยแล้ว`)}
            ${referenceBlock(args.referenceCode)}
            ${paragraph('ทีม HR จะพิจารณาใบสมัครและ<strong>ติดต่อกลับภายใน 7 วันทำการ</strong> โปรดเก็บรหัสใบสมัครไว้เพื่อใช้อ้างอิง', { muted: true })}
        `,
    })
    return sendEmail({
        to: args.to,
        subject: `ขอบคุณสำหรับการสมัครงาน EBCI [${args.referenceCode}]`,
        html,
    })
}

// ── 3. HR notification — sent to HR team ───────────────────────────────────
export async function sendHrNotificationEmail(args: {
    applicationId: string
    referenceCode: string
    applicantName: string | null
    email: string
    position: string | null
}) {
    const adminUrl = `${BASE_URL}/hradmin/applicants/${args.applicationId}`
    const html = wrap({
        title: `ใบสมัครใหม่: ${args.position ?? 'ไม่ระบุตำแหน่ง'}`,
        subhead: 'Careers · New Application',
        bodyHtml: `
            ${paragraph('มีใบสมัครใหม่เพิ่งส่งเข้าระบบ')}
            ${summaryRows([
                ['ตำแหน่ง', `<strong>${escapeHtml(args.position ?? '—')}</strong>`],
                ['ผู้สมัคร', escapeHtml(args.applicantName ?? '—')],
                ['Email',   `<a href="mailto:${escapeHtml(args.email)}" style="color:${MAROON};text-decoration:none;">${escapeHtml(args.email)}</a>`],
                ['รหัส',    `<span style="color:${MAROON};font-weight:600;font-family:${FONT_STACK};letter-spacing:0.04em;">${escapeHtml(args.referenceCode)}</span>`],
            ])}
            ${button(adminUrl, 'เปิดใบสมัคร')}
        `,
    })
    return sendEmail({
        to: HR_NOTIFY_EMAIL,
        subject: `ใบสมัครใหม่: ${args.position ?? 'ไม่ระบุตำแหน่ง'} — ${args.applicantName ?? args.email}`,
        html,
    })
}

// ── Status-change templates ────────────────────────────────────────────────
export interface StatusEmailContext {
    to: string
    referenceCode: string
    applicantName?: string | null
    position?: string | null
    notes?: string | null
}

function statusHeader(ctx: StatusEmailContext): string {
    return `
        ${paragraph(`สวัสดี${ctx.applicantName ? ` คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(ctx.applicantName)}</strong>` : ''}`)}
    `
}

function statusMeta(ctx: StatusEmailContext): string {
    return ctx.position
        ? `<p style="margin:0 0 14px;font-size:13px;color:${TEXT_DIM};">ตำแหน่ง: <span style="color:${TEXT_PRIMARY};">${escapeHtml(ctx.position)}</span></p>`
        : ''
}

// ── 4a. reviewing ──────────────────────────────────────────────────────────
export async function sendStatusReviewingEmail(ctx: StatusEmailContext) {
    const html = wrap({
        title: 'ใบสมัครของคุณกำลังถูกพิจารณา',
        subhead: 'Careers · Under Review',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph('ทีม HR ได้รับใบสมัครของคุณเรียบร้อย และ<strong>กำลังพิจารณา</strong>อยู่')}
            ${statusMeta(ctx)}
            ${referenceBlock(ctx.referenceCode)}
            ${paragraph('เราจะแจ้งผลให้ทราบอีกครั้งเมื่อมีความคืบหน้า ขอขอบคุณที่รอคอย', { small: true, muted: true })}
            ${optionalHrNotes(ctx.notes)}
        `,
    })
    return sendEmail({
        to: ctx.to,
        subject: `ใบสมัครของคุณกำลังถูกพิจารณา [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4b. shortlisted ────────────────────────────────────────────────────────
export async function sendStatusShortlistedEmail(ctx: StatusEmailContext) {
    const html = wrap({
        title: 'ใบสมัครของคุณผ่านรอบแรก',
        subhead: 'Careers · Shortlisted',
        accent: 'green',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph('<strong style="color:#047857;">ขอแสดงความยินดี!</strong> ใบสมัครของคุณผ่านการพิจารณารอบแรกเรียบร้อย')}
            ${statusMeta(ctx)}
            ${referenceBlock(ctx.referenceCode, 'green')}
            ${paragraph('ทีม HR จะติดต่อกลับภายในไม่กี่วันเพื่อนัดวัน-เวลาสัมภาษณ์ โปรดเตรียมเอกสารประกอบที่อาจต้องใช้ในวันสัมภาษณ์', { muted: true })}
            ${optionalHrNotes(ctx.notes)}
        `,
    })
    return sendEmail({
        to: ctx.to,
        subject: `ใบสมัครของคุณผ่านรอบแรก [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4c. interview ──────────────────────────────────────────────────────────
export async function sendStatusInterviewEmail(ctx: StatusEmailContext) {
    const html = wrap({
        title: 'นัดสัมภาษณ์',
        subhead: 'Careers · Interview Scheduled',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph('ขอเชิญคุณเข้าร่วม<strong>สัมภาษณ์งาน</strong>ในขั้นตอนถัดไป')}
            ${statusMeta(ctx)}
            ${referenceBlock(ctx.referenceCode)}
            ${paragraph('ทีม HR จะติดต่อทางโทรศัพท์หรืออีเมลเพื่อนัดวัน-เวลา-สถานที่สัมภาษณ์ โปรดเตรียมพร้อมและตอบกลับภายใน 2-3 วัน', { muted: true })}
            ${optionalHrNotes(ctx.notes)}
        `,
    })
    return sendEmail({
        to: ctx.to,
        subject: `นัดสัมภาษณ์ [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4d. hired ──────────────────────────────────────────────────────────────
export async function sendStatusHiredEmail(ctx: StatusEmailContext) {
    const html = wrap({
        title: 'ยินดีต้อนรับสู่ EBCI!',
        subhead: 'Careers · Offer Extended',
        accent: 'green',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph('<strong style="color:#047857;font-size:18px;">ขอแสดงความยินดีอย่างยิ่ง!</strong>')}
            ${paragraph('เรายินดีเสนอให้คุณเข้าร่วมงานกับทีม EBCI')}
            ${statusMeta(ctx)}
            ${referenceBlock(ctx.referenceCode, 'green')}
            ${paragraph('ทีม HR จะติดต่อเพื่อแจ้งรายละเอียดของสัญญาจ้าง วันเริ่มงาน และเอกสารที่ต้องเตรียมในลำดับถัดไป', { muted: true })}
            ${optionalHrNotes(ctx.notes)}
        `,
    })
    return sendEmail({
        to: ctx.to,
        subject: `ยินดีต้อนรับสู่ EBCI! [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4e. rejected — softer maroon, no accent band ───────────────────────────
export async function sendStatusRejectedEmail(ctx: StatusEmailContext) {
    const html = wrap({
        title: 'ผลการพิจารณาใบสมัคร',
        subhead: 'Careers · Application Update',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph('ขอบคุณที่ให้ความสนใจร่วมงานกับ EBCI และสละเวลากรอกใบสมัครให้เรา')}
            ${statusMeta(ctx)}
            ${referenceBlock(ctx.referenceCode)}
            ${paragraph('หลังจากพิจารณาอย่างถี่ถ้วนแล้ว เราเสียใจที่ต้องแจ้งให้ทราบว่า<strong>ใบสมัครของคุณยังไม่ตรงกับที่เรามองหาในรอบนี้</strong>', { muted: true })}
            ${paragraph('อย่างไรก็ดี เราจะเก็บข้อมูลของคุณไว้สำหรับโอกาสในอนาคต หากมีตำแหน่งที่เหมาะสมเราจะรีบติดต่อกลับ', { small: true, muted: true })}
            ${paragraph('ขอให้คุณพบโอกาสดี ๆ ในเส้นทางอาชีพข้างหน้า', { small: true, muted: true })}
            ${optionalHrNotes(ctx.notes)}
        `,
    })
    return sendEmail({
        to: ctx.to,
        subject: `ผลการพิจารณาใบสมัคร [${ctx.referenceCode}]`,
        html,
    })
}

/**
 * Dispatcher — picks the right template by the destination status.
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

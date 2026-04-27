import 'server-only'
import { sendEmail } from '@/lib/email'

/**
 * Thin wrapper that pins every leave email to the 'hr' sender
 * identity — employee-facing mail about leave should come from
 * hr@ebcinext.com, not the careers address.
 */
function sendLeaveEmail(args: { to: string | string[]; subject: string; html: string }) {
    return sendEmail({ ...args, sender: 'hr' })
}

/**
 * Leave-system email templates.
 * Light-canvas layout mirroring careers-emails.ts so every
 * transactional mail in the app shares one brand voice.
 */

const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://ebci-nexus.vercel.app'

const HR_NOTIFY_EMAIL = process.env.HR_NOTIFY_EMAIL ?? 'hr@ebcitrade.com'

const LOGO_SILVER = `${BASE_URL}/brand/ebci-logo-silver.png`
const LOGO_MAROON = `${BASE_URL}/brand/ebci-logo-maroon.png`

// ── Shared style tokens (inline — email clients strip <style> blocks) ──────
const FONT_STACK = `Inter, 'Helvetica Neue', Helvetica, Arial, 'Sukhumvit Set', 'Prompt', sans-serif`
const TEXT_PRIMARY = '#1a1a1a'
const TEXT_MUTED = '#4b5563'
const TEXT_DIM = '#6b7280'
const TEXT_GHOST = '#9ca3af'
const BORDER_LIGHT = '#e5e7eb'
const MAROON = '#882136'
const MAROON_DEEP = '#561e23'

// ── Date helpers ───────────────────────────────────────────────────────────
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDateRange(start: string, end: string): string {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const sStr = `${s.getDate()} ${TH_MONTHS[s.getMonth()]} ${s.getFullYear() + 543}`
    const eStr = `${e.getDate()} ${TH_MONTHS[e.getMonth()]} ${e.getFullYear() + 543}`
    return start === end ? sStr : `${sStr} — ${eStr}`
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

// ── Layout helpers ─────────────────────────────────────────────────────────
interface WrapOptions {
    title: string
    accent?: 'maroon' | 'green' | 'red' | 'amber'
    subhead?: string | null
    bodyHtml: string
}

function wrap({ title, accent = 'maroon', subhead = null, bodyHtml }: WrapOptions): string {
    const gradients: Record<NonNullable<WrapOptions['accent']>, string> = {
        maroon: `linear-gradient(135deg, ${MAROON_DEEP} 0%, ${MAROON} 60%, #ad5f6c 100%)`,
        green:  'linear-gradient(135deg, #065f46 0%, #0e7c5a 60%, #34d399 100%)',
        red:    'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 60%, #f87171 100%)',
        amber:  'linear-gradient(135deg, #78350f 0%, #b45309 60%, #fbbf24 100%)',
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
              <img src="${LOGO_SILVER}" alt="EBCI" width="180" style="display:inline-block;height:auto;max-width:180px;" />
              ${subhead ? `<p style="margin:12px 0 0;font-size:11px;letter-spacing:0.28em;color:rgba(255,255,255,0.65);text-transform:uppercase;">${escapeHtml(subhead)}</p>` : ''}
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:28px 32px 0;">
              <h1 style="margin:0;font-family:${FONT_STACK};font-size:22px;line-height:1.35;font-weight:600;color:${TEXT_PRIMARY};">${escapeHtml(title)}</h1>
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
                <img src="${LOGO_MAROON}" alt="EBCI" width="80" style="display:inline-block;height:auto;max-width:80px;opacity:0.7;margin-bottom:10px;" />
                <p style="margin:0;font-size:13px;font-weight:600;color:${TEXT_MUTED};">
                  Excellent Business Corporation International Co., Ltd.
                </p>
                <p style="margin:2px 0 0;font-size:12px;color:${TEXT_DIM};">40 ปีแห่งความเป็นเลิศ ด้านโลจิสติกส์</p>
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

function referenceBlock(code: string, tone: 'maroon' | 'green' | 'red' | 'amber' = 'maroon'): string {
    const palette = {
        maroon: { border: MAROON,     tint: 'rgba(136,33,54,0.04)',  text: MAROON },
        green:  { border: '#10b981',  tint: 'rgba(16,185,129,0.06)', text: '#047857' },
        red:    { border: '#b91c1c',  tint: 'rgba(185,28,28,0.05)',  text: '#991b1b' },
        amber:  { border: '#b45309',  tint: 'rgba(180,83,9,0.05)',   text: '#92400e' },
    }[tone]
    return `
    <div style="background:${palette.tint};border:1.5px solid ${palette.border};border-radius:10px;padding:16px 20px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:10px;letter-spacing:0.25em;color:${TEXT_DIM};text-transform:uppercase;font-weight:600;">รหัสใบลา</p>
      <p style="margin:6px 0 0;font-family:${FONT_STACK};font-size:24px;font-weight:700;letter-spacing:0.05em;color:${palette.text};">${escapeHtml(code)}</p>
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

function button(href: string, label: string, tone: 'maroon' | 'green' | 'amber' = 'maroon'): string {
    const bg = tone === 'green' ? '#10b981' : tone === 'amber' ? '#b45309' : MAROON
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

function calloutNote(label: string, text: string, tone: 'maroon' | 'green' | 'red' = 'maroon'): string {
    const color = tone === 'green' ? '#10b981' : tone === 'red' ? '#b91c1c' : MAROON
    const bg = tone === 'green' ? 'rgba(16,185,129,0.06)' : tone === 'red' ? 'rgba(185,28,28,0.05)' : 'rgba(136,33,54,0.06)'
    return `
    <div style="background:${bg};border-left:3px solid ${color};padding:12px 16px;margin-top:20px;border-radius:0 8px 8px 0;">
      <p style="margin:0 0 6px;font-size:10px;letter-spacing:0.2em;color:${TEXT_DIM};text-transform:uppercase;font-weight:600;">${escapeHtml(label)}</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:${TEXT_PRIMARY};white-space:pre-wrap;">${escapeHtml(text)}</p>
    </div>
  `
}

// ── Shared context ────────────────────────────────────────────────────────
export interface LeaveEmailContext {
    referenceCode: string
    employeeName: string
    employeeEmail: string
    approverName: string | null
    approverEmail: string | null
    /**
     * Absolute or relative URL to the approver's inbox. Pass the result of
     * `resolveApproverInboxUrl(approverUserId)` so hr_admin recipients land
     * inside `/hradmin/leave/inbox` instead of the employee shell. Falls
     * back to `/portal/leave/inbox` when omitted (works for every role).
     */
    approverInboxUrl?: string | null
    leaveTypeTh: string
    startDate: string
    endDate: string
    totalDays: number
    reason: string
}

// ══════════════════════════════════════════════════════════════════════════
// Templates
// ══════════════════════════════════════════════════════════════════════════

/** 1 / 5 — to the employee immediately after submit */
export async function sendLeaveSubmittedToEmployee(c: LeaveEmailContext) {
    const portalUrl = `${BASE_URL}/portal/leave`
    const html = wrap({
        title: 'ใบลาของคุณถูกบันทึกแล้ว',
        subhead: 'Leave · Submitted',
        bodyHtml: `
            ${paragraph(`สวัสดี${c.employeeName ? ` คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.employeeName)}</strong>` : ''}`)}
            ${paragraph('เราได้รับใบลาของคุณและส่งให้ผู้อนุมัติแล้ว')}
            ${referenceBlock(c.referenceCode)}
            ${summaryRows([
                ['ประเภท',    `<strong>${escapeHtml(c.leaveTypeTh)}</strong>`],
                ['วันที่ลา',  escapeHtml(formatThaiDateRange(c.startDate, c.endDate))],
                ['จำนวนวัน',  `${c.totalDays} วัน`],
                ['ผู้อนุมัติ', escapeHtml(c.approverName ?? 'รอ HR กำหนด')],
            ])}
            ${paragraph('ผู้อนุมัติจะพิจารณาใบลาและแจ้งผลกลับมาทางอีเมลนี้', { small: true, muted: true })}
            ${button(portalUrl, 'ดูใบลาของฉัน')}
        `,
    })
    return sendLeaveEmail({
        to: c.employeeEmail,
        subject: `ใบลาของคุณถูกบันทึกแล้ว [${c.referenceCode}]`,
        html,
    })
}

/** 2 / 5 — to the approver when a new request lands in their inbox */
export async function sendLeaveSubmittedToApprover(c: LeaveEmailContext) {
    if (!c.approverEmail) return { success: false }
    // Role-aware: hr_admin recipients should land in /hradmin/leave/inbox so
    // their approve/reject click doesn't flip the UI into employee shell.
    // Caller passes the resolved URL via approverInboxUrl; default is the
    // portal path which works for every role.
    const inboxPath = c.approverInboxUrl ?? '/portal/leave/inbox'
    const inboxUrl = inboxPath.startsWith('http') ? inboxPath : `${BASE_URL}${inboxPath}`
    const html = wrap({
        title: 'มีใบลารอการอนุมัติ',
        subhead: 'Leave · Awaiting Your Approval',
        accent: 'amber',
        bodyHtml: `
            ${paragraph(`สวัสดี${c.approverName ? ` คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.approverName)}</strong>` : ''}`)}
            ${paragraph(`<strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.employeeName)}</strong> ได้ยื่นใบลาและกำลังรอการอนุมัติจากคุณ`)}
            ${referenceBlock(c.referenceCode, 'amber')}
            ${summaryRows([
                ['ประเภท',   `<strong>${escapeHtml(c.leaveTypeTh)}</strong>`],
                ['วันที่ลา', escapeHtml(formatThaiDateRange(c.startDate, c.endDate))],
                ['จำนวนวัน', `${c.totalDays} วัน`],
                ['เหตุผล',   `<span style="white-space:pre-wrap;">${escapeHtml(c.reason)}</span>`],
            ])}
            ${button(inboxUrl, 'ไปที่กล่องอนุมัติ', 'amber')}
            ${paragraph('กดปุ่มเพื่อเปิดรายละเอียดและอนุมัติ / ปฏิเสธได้ทันที', { small: true, muted: true })}
        `,
    })
    return sendLeaveEmail({
        to: c.approverEmail,
        subject: `มีใบลารออนุมัติ: ${c.employeeName} — ${c.leaveTypeTh}`,
        html,
    })
}

/** 3 / 5 — to the employee when approved */
export async function sendLeaveApproved(c: LeaveEmailContext & { approvalNotes?: string | null }) {
    const portalUrl = `${BASE_URL}/portal/leave`
    const html = wrap({
        title: 'ใบลาของคุณได้รับการอนุมัติ',
        subhead: 'Leave · Approved',
        accent: 'green',
        bodyHtml: `
            ${paragraph(`สวัสดี${c.employeeName ? ` คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.employeeName)}</strong>` : ''}`)}
            ${paragraph(`<strong style="color:#047857;">ใบลาของคุณได้รับการอนุมัติแล้ว</strong> โดย <strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.approverName ?? 'ผู้บริหาร')}</strong>`)}
            ${referenceBlock(c.referenceCode, 'green')}
            ${summaryRows([
                ['ประเภท',   `<strong>${escapeHtml(c.leaveTypeTh)}</strong>`],
                ['วันที่ลา', escapeHtml(formatThaiDateRange(c.startDate, c.endDate))],
                ['จำนวนวัน', `${c.totalDays} วัน`],
            ])}
            ${c.approvalNotes ? calloutNote('หมายเหตุจากผู้อนุมัติ', c.approvalNotes, 'green') : ''}
            ${button(portalUrl, 'ดูใบลาของฉัน', 'green')}
        `,
    })
    return sendLeaveEmail({
        to: c.employeeEmail,
        subject: `ใบลา [${c.referenceCode}] ได้รับการอนุมัติแล้ว`,
        html,
    })
}

/** 4 / 5 — to the employee when rejected */
export async function sendLeaveRejected(c: LeaveEmailContext & { rejectionReason: string }) {
    const portalUrl = `${BASE_URL}/portal/leave`
    const html = wrap({
        title: 'ใบลาของคุณถูกปฏิเสธ',
        subhead: 'Leave · Not Approved',
        accent: 'red',
        bodyHtml: `
            ${paragraph(`สวัสดี${c.employeeName ? ` คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.employeeName)}</strong>` : ''}`)}
            ${paragraph(`ขออภัย ใบลาของคุณไม่ได้รับการอนุมัติโดย <strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.approverName ?? 'ผู้บริหาร')}</strong>`)}
            ${referenceBlock(c.referenceCode, 'red')}
            ${summaryRows([
                ['ประเภท',   `<strong>${escapeHtml(c.leaveTypeTh)}</strong>`],
                ['วันที่ลา', escapeHtml(formatThaiDateRange(c.startDate, c.endDate))],
                ['จำนวนวัน', `${c.totalDays} วัน`],
            ])}
            ${calloutNote('เหตุผลการปฏิเสธ', c.rejectionReason, 'red')}
            ${paragraph('หากมีคำถาม กรุณาติดต่อหัวหน้าโดยตรง คุณสามารถยื่นใบลาใหม่ได้ตลอด', { small: true, muted: true })}
            ${button(portalUrl, 'ยื่นใบลาใหม่')}
        `,
    })
    return sendLeaveEmail({
        to: c.employeeEmail,
        subject: `ใบลา [${c.referenceCode}] ถูกปฏิเสธ`,
        html,
    })
}

/** 5 / 5 — sent to both sides when a pending request is cancelled */
export async function sendLeaveCancelled(
    c: LeaveEmailContext & { cancelledBy: 'employee' | 'approver' },
) {
    const html = wrap({
        title: 'ใบลาถูกยกเลิก',
        subhead: 'Leave · Cancelled',
        bodyHtml: `
            ${paragraph(`ใบลานี้ถูกยกเลิก${c.cancelledBy === 'employee' ? 'โดยผู้ยื่น' : 'โดยผู้อนุมัติ'}`)}
            ${referenceBlock(c.referenceCode)}
            ${summaryRows([
                ['ประเภท',   `<strong>${escapeHtml(c.leaveTypeTh)}</strong>`],
                ['วันที่ลา', escapeHtml(formatThaiDateRange(c.startDate, c.endDate))],
                ['จำนวนวัน', `${c.totalDays} วัน`],
                ['ผู้ยื่น', escapeHtml(c.employeeName)],
            ])}
            ${paragraph('ยอดวันลาที่จองไว้ได้รับการคืนเข้ายอดคงเหลือแล้ว', { small: true, muted: true })}
        `,
    })
    const recipients = [c.employeeEmail, c.approverEmail].filter(Boolean) as string[]
    if (!recipients.length) return { success: false }
    return sendLeaveEmail({
        to: recipients,
        subject: `ใบลา [${c.referenceCode}] ถูกยกเลิก`,
        html,
    })
}

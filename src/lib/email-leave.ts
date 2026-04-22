import 'server-only'
import { sendEmail } from '@/lib/email'

/**
 * Leave-system email templates.
 *
 * Session 1 only wires the "submitted to employee" mail. The other
 * four are defined here so Session 2 can plug them into approve /
 * reject / cancel flows without refactoring the templates.
 */

const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://nexus.ebcitrade.com'

// ── Small formatting helpers ───────────────────────────────────────────────
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function formatThaiDateRange(start: string, end: string): string {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const sStr = `${s.getDate()} ${TH_MONTHS[s.getMonth()]} ${s.getFullYear() + 543}`
    const eStr = `${e.getDate()} ${TH_MONTHS[e.getMonth()]} ${e.getFullYear() + 543}`
    return start === end ? sStr : `${sStr} — ${eStr}`
}

function wrap(title: string, accent: 'maroon' | 'green' | 'red' | 'amber', bodyHtml: string): string {
    const colours = {
        maroon: 'linear-gradient(145deg,#561e23 0%,#882136 100%)',
        green:  'linear-gradient(145deg,#0e6646 0%,#158760 100%)',
        red:    'linear-gradient(145deg,#8a1f1f 0%,#b42525 100%)',
        amber:  'linear-gradient(145deg,#8c5a00 0%,#b97700 100%)',
    } as const
    return `<!doctype html>
<html lang="th">
  <body style="margin:0;padding:0;background:#1a0609;font-family:'Prompt','Kanit','Helvetica Neue',sans-serif;color:#fff;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="background:${colours[accent]};padding:20px 28px;border-radius:16px 16px 0 0;">
        <p style="margin:0;font-size:12px;letter-spacing:0.3em;color:rgba(255,255,255,0.6);text-transform:uppercase;">EBCI Leave</p>
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

function summaryTable(rows: Array<[string, string]>): string {
    return `<table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;color:rgba(255,255,255,0.85);">${rows.map(([k, v]) => `
        <tr>
            <td style="padding:6px 0;color:rgba(255,255,255,0.5);width:140px;vertical-align:top;">${k}</td>
            <td style="padding:6px 0;">${v}</td>
        </tr>`).join('')}</table>`
}

function button(href: string, label: string): string {
    return `<a href="${href}" style="display:inline-block;background:#ad5f6c;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">${label}</a>`
}

// ── Shared context shape ───────────────────────────────────────────────────
export interface LeaveEmailContext {
    referenceCode: string
    employeeName: string
    employeeEmail: string
    approverName: string | null
    approverEmail: string | null
    leaveTypeTh: string
    startDate: string
    endDate: string
    totalDays: number
    reason: string
}

// ── Templates ──────────────────────────────────────────────────────────────

/** 1 / 5 — to the employee immediately after submit */
export async function sendLeaveSubmittedToEmployee(c: LeaveEmailContext) {
    const portalUrl = `${BASE_URL}/portal/leave`
    const html = wrap(
        'ใบลาของคุณถูกบันทึกแล้ว',
        'maroon',
        `
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
            เราได้รับใบลาของคุณและส่งให้ผู้อนุมัติแล้ว
        </p>
        ${summaryTable([
            ['รหัสใบลา', `<span style="color:#ffb4be;font-weight:600;font-family:monospace;">${c.referenceCode}</span>`],
            ['ประเภท', c.leaveTypeTh],
            ['วันที่ลา', formatThaiDateRange(c.startDate, c.endDate)],
            ['จำนวนวัน', `${c.totalDays} วัน`],
            ['ผู้อนุมัติ', c.approverName ?? 'รอ HR กำหนด'],
        ])}
        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.75);">
            ผู้อนุมัติจะพิจารณาใบลาและแจ้งผลกลับมาผ่านอีเมลนี้
        </p>
        ${button(portalUrl, 'ดูใบลาของฉัน')}
        `,
    )
    return sendEmail({
        to: c.employeeEmail,
        subject: `ใบลาของคุณถูกบันทึกแล้ว [${c.referenceCode}]`,
        html,
    })
}

/** 2 / 5 — to the approver when a new request lands in their inbox */
export async function sendLeaveSubmittedToApprover(c: LeaveEmailContext) {
    if (!c.approverEmail) return { success: false }
    const inboxUrl = `${BASE_URL}/portal/leave/inbox`
    const html = wrap(
        `มีใบลารออนุมัติ — ${c.leaveTypeTh}`,
        'amber',
        `
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
            <strong>${c.employeeName}</strong> ได้ยื่นใบลาและกำลังรอการอนุมัติจากคุณ
        </p>
        ${summaryTable([
            ['รหัสใบลา', `<span style="color:#ffd084;font-weight:600;font-family:monospace;">${c.referenceCode}</span>`],
            ['ประเภท', c.leaveTypeTh],
            ['วันที่ลา', formatThaiDateRange(c.startDate, c.endDate)],
            ['จำนวนวัน', `${c.totalDays} วัน`],
            ['เหตุผล', `<span style="white-space:pre-wrap;">${escapeHtml(c.reason)}</span>`],
        ])}
        ${button(inboxUrl, 'ไปที่กล่องอนุมัติ')}
        `,
    )
    return sendEmail({
        to: c.approverEmail,
        subject: `มีใบลารออนุมัติ: ${c.employeeName} — ${c.leaveTypeTh}`,
        html,
    })
}

/** 3 / 5 — to the employee when approved */
export async function sendLeaveApproved(c: LeaveEmailContext & { approvalNotes?: string | null }) {
    const portalUrl = `${BASE_URL}/portal/leave`
    const html = wrap(
        'ใบลาได้รับการอนุมัติ',
        'green',
        `
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
            ใบลาของคุณได้รับการอนุมัติจาก <strong>${c.approverName ?? 'ผู้บริหาร'}</strong> แล้ว
        </p>
        ${summaryTable([
            ['รหัสใบลา', `<span style="color:#7fe3a8;font-weight:600;font-family:monospace;">${c.referenceCode}</span>`],
            ['ประเภท', c.leaveTypeTh],
            ['วันที่ลา', formatThaiDateRange(c.startDate, c.endDate)],
            ['จำนวนวัน', `${c.totalDays} วัน`],
            ...(c.approvalNotes ? [['หมายเหตุจากผู้อนุมัติ', `<span style="white-space:pre-wrap;">${escapeHtml(c.approvalNotes)}</span>`] as [string, string]] : []),
        ])}
        ${button(portalUrl, 'ดูใบลาของฉัน')}
        `,
    )
    return sendEmail({
        to: c.employeeEmail,
        subject: `ใบลา [${c.referenceCode}] ได้รับการอนุมัติแล้ว`,
        html,
    })
}

/** 4 / 5 — to the employee when rejected */
export async function sendLeaveRejected(c: LeaveEmailContext & { rejectionReason: string }) {
    const portalUrl = `${BASE_URL}/portal/leave`
    const html = wrap(
        'ใบลาถูกปฏิเสธ',
        'red',
        `
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
            ขออภัย ใบลาของคุณไม่ได้รับการอนุมัติจาก <strong>${c.approverName ?? 'ผู้บริหาร'}</strong>
        </p>
        ${summaryTable([
            ['รหัสใบลา', `<span style="color:#ffb4be;font-weight:600;font-family:monospace;">${c.referenceCode}</span>`],
            ['ประเภท', c.leaveTypeTh],
            ['วันที่ลา', formatThaiDateRange(c.startDate, c.endDate)],
            ['จำนวนวัน', `${c.totalDays} วัน`],
            ['เหตุผลที่ปฏิเสธ', `<span style="white-space:pre-wrap;">${escapeHtml(c.rejectionReason)}</span>`],
        ])}
        ${button(portalUrl, 'ยื่นใบลาใหม่')}
        `,
    )
    return sendEmail({
        to: c.employeeEmail,
        subject: `ใบลา [${c.referenceCode}] ถูกปฏิเสธ`,
        html,
    })
}

/** 5 / 5 — sent to both sides when a pending request is cancelled */
export async function sendLeaveCancelled(
    c: LeaveEmailContext & { cancelledBy: 'employee' | 'approver' },
) {
    const body = `
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
            ใบลานี้ถูกยกเลิก${c.cancelledBy === 'employee' ? 'โดยผู้ยื่น' : 'โดยผู้อนุมัติ'}
        </p>
        ${summaryTable([
            ['รหัสใบลา', `<span style="color:#fff;font-weight:600;font-family:monospace;">${c.referenceCode}</span>`],
            ['ประเภท', c.leaveTypeTh],
            ['วันที่ลา', formatThaiDateRange(c.startDate, c.endDate)],
            ['จำนวนวัน', `${c.totalDays} วัน`],
        ])}
    `
    const html = wrap('ใบลาถูกยกเลิก', 'maroon', body)
    const recipients = [c.employeeEmail, c.approverEmail].filter(Boolean) as string[]
    if (!recipients.length) return { success: false }
    return sendEmail({
        to: recipients,
        subject: `ใบลา [${c.referenceCode}] ถูกยกเลิก`,
        html,
    })
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

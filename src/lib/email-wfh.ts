import 'server-only'
import { sendEmail } from '@/lib/email'

/**
 * WFH-system email templates. Same brand voice + light-canvas layout
 * as email-leave.ts (kept separate so future template tweaks to one
 * surface don't accidentally affect the other).
 *
 * 4 templates:
 *   1. sendWfhSubmittedToEmployee — confirmation to the requester
 *   2. sendWfhSubmittedToApprover — heads-up to the manager
 *   3. sendWfhSubmittedToHrFyi    — "รับทราบ" copy to HR (no action)
 *   4. sendWfhDecidedToEmployee   — approve/reject result back
 */

const BASE_URL =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://ebci-nexus.vercel.app'

const FONT_STACK = `Inter, 'Helvetica Neue', Helvetica, Arial, 'Sukhumvit Set', 'Prompt', sans-serif`
const TEXT_PRIMARY = '#1a1a1a'
const TEXT_MUTED = '#4b5563'
const TEXT_DIM = '#6b7280'
const BORDER_LIGHT = '#e5e7eb'
const MAROON = '#882136'
const MAROON_DEEP = '#561e23'
const BLUE = '#2563eb'
const AMBER = '#d97706'
const GREEN = '#15803d'
const RED = '#b91c1c'

const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function fmtRange(start: string, end: string): string {
    const s = new Date(start + 'T00:00:00')
    const e = new Date(end + 'T00:00:00')
    const sStr = `${s.getDate()} ${TH_MONTHS[s.getMonth()]} ${s.getFullYear() + 543}`
    const eStr = `${e.getDate()} ${TH_MONTHS[e.getMonth()]} ${e.getFullYear() + 543}`
    return start === end ? sStr : `${sStr} — ${eStr}`
}
function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function send(args: { to: string | string[]; subject: string; html: string }) {
    return sendEmail({ ...args, sender: 'hr' })
}

function wrap({
    title, subhead, accent, bodyHtml,
}: { title: string; subhead: string; accent?: 'maroon' | 'amber' | 'green' | 'red'; bodyHtml: string }): string {
    const accentColor = accent === 'amber' ? AMBER
        : accent === 'green' ? GREEN
        : accent === 'red' ? RED
        : MAROON
    return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT_STACK};color:${TEXT_PRIMARY};">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#ffffff;border:1px solid ${BORDER_LIGHT};border-radius:16px;overflow:hidden;">
      <div style="padding:24px 28px 16px;border-bottom:1px solid ${BORDER_LIGHT};">
        <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${accentColor};font-weight:700;">${escapeHtml(subhead)}</p>
        <h1 style="margin:6px 0 0 0;font-size:22px;color:${TEXT_PRIMARY};font-weight:700;line-height:1.3;">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:24px 28px;">${bodyHtml}</div>
      <div style="padding:18px 28px;border-top:1px solid ${BORDER_LIGHT};background:#fafafa;">
        <p style="margin:0;font-size:11px;color:${TEXT_DIM};">EBCI Nexus · ระบบส่งอัตโนมัติ — กรุณาอย่าตอบกลับอีเมลนี้</p>
      </div>
    </div>
  </div>
</body></html>`
}

function paragraph(text: string, opts: { small?: boolean; muted?: boolean } = {}): string {
    const fs = opts.small ? '13px' : '15px'
    const c = opts.muted ? TEXT_MUTED : TEXT_PRIMARY
    return `<p style="margin:0 0 12px 0;font-size:${fs};line-height:1.6;color:${c};">${text}</p>`
}

function ref(code: string, accent: 'maroon' | 'amber' | 'green' | 'red' = 'maroon'): string {
    const c = accent === 'amber' ? AMBER : accent === 'green' ? GREEN : accent === 'red' ? RED : MAROON_DEEP
    return `<div style="margin:8px 0 16px 0;padding:8px 12px;background:${c}10;border:1px solid ${c}30;border-radius:8px;font-size:13px;color:${c};font-family:'SF Mono',Monaco,monospace;font-weight:600;">${escapeHtml(code)}</div>`
}

function summary(rows: Array<[string, string]>): string {
    return `<table style="width:100%;border-collapse:collapse;margin:0 0 16px 0;">
${rows.map(([k, v]) => `<tr><td style="padding:6px 0;font-size:13px;color:${TEXT_DIM};width:38%;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:6px 0;font-size:14px;color:${TEXT_PRIMARY};vertical-align:top;">${v}</td></tr>`).join('')}
</table>`
}

function button(href: string, label: string, accent: 'maroon' | 'amber' | 'green' | 'red' | 'blue' = 'maroon'): string {
    const c = accent === 'amber' ? AMBER : accent === 'green' ? GREEN : accent === 'red' ? RED : accent === 'blue' ? BLUE : MAROON
    return `<div style="margin:18px 0 4px 0;"><a href="${href}" style="display:inline-block;padding:11px 20px;background:${c};color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">${escapeHtml(label)} →</a></div>`
}

// ─── Template context ──────────────────────────────────────────────────────

export interface WfhEmailContext {
    referenceCode: string
    employeeName: string
    employeeEmail: string
    approverName?: string | null
    approverEmail?: string | null
    startDate: string
    endDate: string
    totalDays: number
    reason: string
    contactDuringWfh?: string | null
}

// ─── 1. Confirmation to applicant ──────────────────────────────────────────

export async function sendWfhSubmittedToEmployee(c: WfhEmailContext) {
    const portalUrl = `${BASE_URL}/portal/wfh`
    const html = wrap({
        title: 'คำขอ WFH ของคุณถูกบันทึกแล้ว',
        subhead: 'WFH · Submitted',
        accent: 'maroon',
        bodyHtml: `
            ${paragraph(`สวัสดี${c.employeeName ? ` คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.employeeName)}</strong>` : ''}`)}
            ${paragraph('เราได้รับคำขอ WFH ของคุณและส่งให้ผู้อนุมัติแล้ว — เมื่ออนุมัติแล้ว คุณจะได้รับอีเมลแจ้งผล และสามารถเช็คอิน WFH ผ่านแอปได้ในวันที่กำหนด')}
            ${ref(c.referenceCode)}
            ${summary([
                ['วันที่',     escapeHtml(fmtRange(c.startDate, c.endDate))],
                ['จำนวนวัน',   `${c.totalDays} วัน`],
                ['เหตุผล',     `<span style="white-space:pre-wrap;">${escapeHtml(c.reason)}</span>`],
                ['ผู้อนุมัติ',  escapeHtml(c.approverName ?? 'รอ HR กำหนด')],
            ])}
            ${button(portalUrl, 'ดูคำขอของฉัน')}
        `,
    })
    return send({ to: c.employeeEmail, subject: `คำขอ WFH ของคุณถูกบันทึกแล้ว [${c.referenceCode}]`, html })
}

// ─── 2. Heads-up to approver ───────────────────────────────────────────────

export async function sendWfhSubmittedToApprover(c: WfhEmailContext) {
    if (!c.approverEmail) return { success: false }
    const inboxUrl = `${BASE_URL}/portal/wfh/inbox?ref=${encodeURIComponent(c.referenceCode)}`
    const html = wrap({
        title: 'มีคำขอ WFH รออนุมัติ',
        subhead: 'WFH · Awaiting Your Approval',
        accent: 'amber',
        bodyHtml: `
            ${paragraph(`สวัสดี${c.approverName ? ` คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.approverName)}</strong>` : ''}`)}
            ${paragraph(`<strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.employeeName)}</strong> ส่งคำขอ WFH และรอการอนุมัติจากคุณ`)}
            ${ref(c.referenceCode, 'amber')}
            ${summary([
                ['วันที่',     escapeHtml(fmtRange(c.startDate, c.endDate))],
                ['จำนวนวัน',   `${c.totalDays} วัน`],
                ['เหตุผล',     `<span style="white-space:pre-wrap;">${escapeHtml(c.reason)}</span>`],
                ...(c.contactDuringWfh ? [['ติดต่อช่วง WFH', escapeHtml(c.contactDuringWfh)] as [string, string]] : []),
            ])}
            ${button(inboxUrl, 'เปิดหน้าอนุมัติ WFH', 'amber')}
            ${paragraph('อีเมลนี้เป็นการแจ้งเตือนเท่านั้น ปุ่มอนุมัติ / ปฏิเสธอยู่ใน Nexus — กดปุ่มด้านบนแล้วระบบจะไฮไลต์รายการนี้ให้จากเลขอ้างอิง', { small: true, muted: true })}
        `,
    })
    return send({ to: c.approverEmail, subject: `มีคำขอ WFH รออนุมัติ: ${c.employeeName}`, html })
}

// ─── 3. FYI to HR (รับทราบ — no action) ────────────────────────────────────

export async function sendWfhSubmittedToHrFyi(
    c: WfhEmailContext,
    hrTo: string | string[],
) {
    const html = wrap({
        title: 'แจ้งเพื่อทราบ: คำขอ WFH ใหม่',
        subhead: 'WFH · For HR Awareness',
        accent: 'maroon',
        bodyHtml: `
            ${paragraph('แจ้งเพื่อทราบ — ไม่ต้องดำเนินการ คำขอนี้ถูกส่งให้ผู้บังคับบัญชาสายงานโดยตรง')}
            ${ref(c.referenceCode)}
            ${summary([
                ['ผู้ขอ',       `<strong>${escapeHtml(c.employeeName)}</strong>`],
                ['วันที่',     escapeHtml(fmtRange(c.startDate, c.endDate))],
                ['จำนวนวัน',   `${c.totalDays} วัน`],
                ['เหตุผล',     `<span style="white-space:pre-wrap;">${escapeHtml(c.reason)}</span>`],
                ['ผู้อนุมัติ',  escapeHtml(c.approverName ?? '—')],
            ])}
            ${paragraph('คุณได้รับเมลฉบับนี้เพราะอยู่ในฝ่ายบุคคล และมีหน้าที่รับทราบความเคลื่อนไหวการลา/WFH', { small: true, muted: true })}
        `,
    })
    return send({ to: hrTo, subject: `[FYI] คำขอ WFH: ${c.employeeName} — ${fmtRange(c.startDate, c.endDate)}`, html })
}

// ─── 4. Decision back to applicant (approve / reject) ──────────────────────

export async function sendWfhDecidedToEmployee(
    c: WfhEmailContext & { decision: 'approve' | 'reject'; note?: string | null },
) {
    const portalUrl = `${BASE_URL}/portal/wfh`
    const isApproved = c.decision === 'approve'
    const html = wrap({
        title: isApproved ? 'คำขอ WFH ของคุณได้รับการอนุมัติ' : 'คำขอ WFH ของคุณถูกปฏิเสธ',
        subhead: isApproved ? 'WFH · Approved' : 'WFH · Rejected',
        accent: isApproved ? 'green' : 'red',
        bodyHtml: `
            ${paragraph(`สวัสดี${c.employeeName ? ` คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(c.employeeName)}</strong>` : ''}`)}
            ${isApproved
                ? paragraph(`<strong style="color:${GREEN};">อนุมัติแล้ว</strong> — สามารถเช็คอิน WFH ผ่านแอปได้ในวันที่กำหนด`)
                : paragraph(`<strong style="color:${RED};">ถูกปฏิเสธ</strong> — ดูเหตุผลในกล่องด้านล่าง`)
            }
            ${ref(c.referenceCode, isApproved ? 'green' : 'red')}
            ${summary([
                ['วันที่',     escapeHtml(fmtRange(c.startDate, c.endDate))],
                ['จำนวนวัน',   `${c.totalDays} วัน`],
                ...(c.note ? [[isApproved ? 'หมายเหตุ' : 'เหตุผลปฏิเสธ', `<span style="white-space:pre-wrap;">${escapeHtml(c.note)}</span>`] as [string, string]] : []),
            ])}
            ${button(portalUrl, 'ดูคำขอของฉัน', isApproved ? 'green' : 'red')}
        `,
    })
    return send({
        to: c.employeeEmail,
        subject: isApproved
            ? `อนุมัติแล้ว: คำขอ WFH ของคุณ [${c.referenceCode}]`
            : `ถูกปฏิเสธ: คำขอ WFH ของคุณ [${c.referenceCode}]`,
        html,
    })
}

import 'server-only'
import { sendEmail } from '@/lib/email'

/**
 * Thin wrapper that pins every careers email to the 'careers' sender
 * identity — applicant-facing mail should come from
 * careers@ebcinext.com, not the generic HR address.
 */
function sendCareersEmail(args: { to: string | string[]; subject: string; html: string }) {
    return sendEmail({
        to: args.to,
        subject: args.subject,
        html: args.html,
        sender: 'careers',
    })
}

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

/**
 * Closing block — every applicant-facing email signs off the same way
 * so the tone reads as one consistent person (HR woman) writing rather
 * than a templated bot. The `closing` line is the literal phrase that
 * sits above the signature ("ขอแสดงความยินดี" vs "ขอแสดงความนับถือ"
 * etc.); pick whichever fits the email's emotional register.
 */
function signOff(closing: string): string {
    return `
    <div style="margin-top:28px;padding-top:18px;border-top:1px solid ${BORDER_LIGHT};">
      <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:${TEXT_PRIMARY};">${escapeHtml(closing)}</p>
      <p style="margin:0;font-size:14px;line-height:1.5;color:${TEXT_PRIMARY};font-weight:600;">ฝ่ายบุคคล · EBCI Careers</p>
      <p style="margin:2px 0 0;font-size:12px;line-height:1.5;color:${TEXT_DIM};">หากมีข้อสงสัย ติดต่อกลับได้ที่ <a href="mailto:${HR_NOTIFY_EMAIL}" style="color:${MAROON};text-decoration:none;">${HR_NOTIFY_EMAIL}</a></p>
    </div>
  `
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
    const positionLine = args.position
        ? ` สำหรับตำแหน่ง <strong style="color:${TEXT_PRIMARY};">${escapeHtml(args.position)}</strong>`
        : ''
    const html = wrap({
        title: 'บันทึกใบสมัครเป็นร่างไว้ให้เรียบร้อยแล้วค่ะ',
        subhead: 'Careers · Draft Saved',
        bodyHtml: `
            ${paragraph('สวัสดีค่ะ')}
            ${paragraph(`ดิฉันเขียนมาแจ้งให้ทราบว่า ระบบได้บันทึกข้อมูลที่คุณกรอกไว้ในใบสมัคร${positionLine} เรียบร้อยแล้วนะคะ ขณะนี้ใบสมัครของคุณยังอยู่ในสถานะ <strong style="color:${TEXT_PRIMARY};">"ร่าง"</strong> ซึ่งหมายความว่ายังไม่ได้ถูกส่งให้ฝ่ายบุคคลพิจารณา — คุณสามารถกลับมากรอกข้อมูลต่อให้ครบถ้วนก่อนกดส่งได้ตามสบายค่ะ`)}
            ${referenceBlock(args.referenceCode)}
            ${paragraph('เพื่อความสบายใจของคุณ ระบบจะบันทึกข้อมูลที่กรอกโดยอัตโนมัติทุก ๆ 3 วินาที ดังนั้นแม้ปิดเบราว์เซอร์ไประหว่างกรอก หรือไฟดับ ข้อมูลทั้งหมดก็จะยังอยู่ครบ ไม่ต้องเริ่มกรอกใหม่ตั้งแต่ต้นนะคะ')}
            ${paragraph('กรุณาเก็บ <strong>รหัสใบสมัคร</strong> ด้านบนไว้ให้ดี เพราะใช้สำหรับเปิดใบสมัครเดิมขึ้นมาแก้ไขในครั้งถัดไป รวมถึงใช้อ้างอิงเวลาสอบถามกับฝ่ายบุคคลด้วยค่ะ')}
            ${button(resumeUrl, 'กลับมากรอกใบสมัครต่อ')}
            ${paragraph('หากระหว่างกรอกพบปัญหา หรือมีคำถามใด ๆ สามารถตอบกลับอีเมลฉบับนี้ หรือติดต่อดิฉันได้โดยตรงตามอีเมลด้านล่างเลยค่ะ', { small: true, muted: true })}
            ${signOff('ขอบคุณที่ให้ความสนใจ EBCI นะคะ')}
        `,
    })
    return sendCareersEmail({ to: args.to, subject: 'บันทึกร่างใบสมัครงาน EBCI เรียบร้อย', html })
}

// ── 2. Application submitted — sent to applicant ────────────────────────────
export async function sendApplicationSubmittedEmail(args: {
    to: string
    referenceCode: string
    applicantName?: string | null
    position?: string | null
}) {
    const greeting = args.applicantName
        ? `สวัสดีค่ะ คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(args.applicantName)}</strong>`
        : 'สวัสดีค่ะ'
    const positionLine = args.position
        ? ` สำหรับตำแหน่ง <strong style="color:${TEXT_PRIMARY};">${escapeHtml(args.position)}</strong>`
        : ''
    const html = wrap({
        title: 'ขอบคุณสำหรับการสมัครงานกับ EBCI ค่ะ',
        subhead: 'Careers · Application Received',
        bodyHtml: `
            ${paragraph(greeting)}
            ${paragraph(`ขอบคุณมากที่ให้ความสนใจร่วมงานกับเรา และสละเวลากรอกใบสมัคร${positionLine} เข้ามาในระบบนะคะ ดิฉันได้รับใบสมัครของคุณเรียบร้อยแล้วเมื่อสักครู่ และจะนำเข้าสู่ขั้นตอนการพิจารณาทันที`)}
            ${referenceBlock(args.referenceCode)}
            ${paragraph(`<strong style="color:${TEXT_PRIMARY};">ขั้นตอนหลังจากนี้จะเป็นแบบนี้ค่ะ:</strong>`)}
            <ul style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.75;color:${TEXT_MUTED};">
              <li>ทีมฝ่ายบุคคลจะเริ่มพิจารณาใบสมัครภายใน <strong style="color:${TEXT_PRIMARY};">1–2 วันทำการ</strong></li>
              <li>หากใบสมัครผ่านการคัดกรองรอบแรก ดิฉันจะติดต่อกลับเพื่อ<strong style="color:${TEXT_PRIMARY};">นัดวัน-เวลาสัมภาษณ์</strong></li>
              <li>โดยรวม กระบวนการพิจารณาทั้งหมดจะใช้เวลา <strong style="color:${TEXT_PRIMARY};">ไม่เกิน 7 วันทำการ</strong></li>
            </ul>
            ${paragraph('ในระหว่างนี้ คุณจะได้รับอีเมลแจ้งสถานะทุกครั้งที่ใบสมัครมีความคืบหน้า ไม่ว่าจะเป็น "เริ่มพิจารณา" "ผ่านรอบแรก" หรือ "นัดสัมภาษณ์" ดังนั้นไม่ต้องกังวลว่าจะพลาดข้อมูลใดนะคะ — เพียงตรวจ inbox และโฟลเดอร์ junk/spam อย่างสม่ำเสมอก็พอค่ะ')}
            ${paragraph('กรุณาเก็บรหัสใบสมัครด้านบนไว้สำหรับอ้างอิงทุกครั้งที่ติดต่อกลับ', { small: true, muted: true })}
            ${signOff('ขอบคุณอีกครั้งที่ไว้วางใจส่งใบสมัครมาให้พิจารณาค่ะ')}
        `,
    })
    return sendCareersEmail({
        to: args.to,
        subject: `ได้รับใบสมัครของคุณแล้วค่ะ [${args.referenceCode}]`,
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
    return sendCareersEmail({
        to: ['c.arthit@ebcitrade.com', 'tumyen@gmail.com'],
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
    const greeting = ctx.applicantName
        ? `สวัสดีค่ะ คุณ<strong style="color:${TEXT_PRIMARY};">${escapeHtml(ctx.applicantName)}</strong>`
        : 'สวัสดีค่ะ'
    return paragraph(greeting)
}

function statusMeta(ctx: StatusEmailContext): string {
    return ctx.position
        ? `<p style="margin:0 0 14px;font-size:13px;color:${TEXT_DIM};">ตำแหน่ง: <span style="color:${TEXT_PRIMARY};">${escapeHtml(ctx.position)}</span></p>`
        : ''
}

// ── 4a. reviewing ──────────────────────────────────────────────────────────
export async function sendStatusReviewingEmail(ctx: StatusEmailContext) {
    const positionPhrase = ctx.position
        ? ` สำหรับตำแหน่ง <strong style="color:${TEXT_PRIMARY};">${escapeHtml(ctx.position)}</strong>`
        : ''
    const html = wrap({
        title: 'ใบสมัครของคุณเข้าสู่ขั้นตอนพิจารณาแล้วค่ะ',
        subhead: 'Careers · Under Review',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph(`ดิฉันเขียนมาแจ้งให้ทราบว่า ใบสมัครของคุณ${positionPhrase} ขณะนี้ได้เข้าสู่ขั้นตอน <strong style="color:${TEXT_PRIMARY};">"พิจารณาโดยฝ่ายบุคคล"</strong> เรียบร้อยแล้วนะคะ`)}
            ${paragraph('นั่นหมายความว่าทีมของเรากำลังตรวจสอบประวัติ ทักษะ และประสบการณ์ของคุณอย่างละเอียด เพื่อพิจารณาความเหมาะสมกับตำแหน่งงานและทีมที่คุณจะเข้าร่วม')}
            ${referenceBlock(ctx.referenceCode)}
            ${paragraph(`<strong style="color:${TEXT_PRIMARY};">กระบวนการในรอบนี้จะใช้เวลาประมาณ 3–5 วันทำการ</strong> หลังจากนั้น หากคุณผ่านการคัดเลือกรอบแรก ดิฉันจะส่งอีเมลฉบับใหม่มาแจ้งและนัดสัมภาษณ์ในลำดับต่อไป — แต่ถ้าใบสมัครของคุณยังไม่ตรงกับสิ่งที่เรามองหาในรอบนี้ ดิฉันก็จะเขียนมาแจ้งคุณตรง ๆ เช่นกันค่ะ ไม่ปล่อยเงียบแน่นอน`)}
            ${paragraph('ในระหว่างนี้ ขอให้คุณรอผลก่อนนะคะ ไม่ต้องส่งเอกสารเพิ่มเติม หรือสอบถามความคืบหน้าซ้ำ — ดิฉันจะติดต่อกลับทันทีที่มีข้อมูลใหม่ค่ะ', { small: true, muted: true })}
            ${optionalHrNotes(ctx.notes)}
            ${signOff('ขอบคุณที่อดทนรอ และขอให้ผ่านการพิจารณาด้วยดีนะคะ')}
        `,
    })
    return sendCareersEmail({
        to: ctx.to,
        subject: `ใบสมัครของคุณกำลังถูกพิจารณา [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4b. shortlisted ────────────────────────────────────────────────────────
export async function sendStatusShortlistedEmail(ctx: StatusEmailContext) {
    const html = wrap({
        title: 'ยินดีด้วยค่ะ — ผ่านการพิจารณารอบแรก',
        subhead: 'Careers · Shortlisted',
        accent: 'green',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph('<strong style="color:#047857;font-size:18px;">ดิฉันมีข่าวดีมาแจ้งค่ะ</strong>')}
            ${paragraph(`ใบสมัครของคุณได้ <strong style="color:#047857;">ผ่านการพิจารณารอบแรก</strong> เรียบร้อยแล้ว — ทีมของเราประทับใจในประวัติและคุณสมบัติของคุณ จึงอยากเชิญคุณเข้าสู่ขั้นตอนการสัมภาษณ์งานในลำดับต่อไป`)}
            ${statusMeta(ctx)}
            ${referenceBlock(ctx.referenceCode, 'green')}
            ${paragraph(`<strong style="color:${TEXT_PRIMARY};">ขั้นตอนถัดไปจะเป็นแบบนี้ค่ะ:</strong>`)}
            <ul style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.75;color:${TEXT_MUTED};">
              <li>ดิฉันจะติดต่อทางโทรศัพท์ภายใน <strong style="color:${TEXT_PRIMARY};">1–2 วันทำการ</strong> เพื่อยืนยันวัน-เวลาที่คุณสะดวก</li>
              <li>การสัมภาษณ์จะใช้เวลาประมาณ <strong style="color:${TEXT_PRIMARY};">30–60 นาที</strong> ขึ้นอยู่กับลักษณะของตำแหน่งงาน</li>
              <li>คุณจะได้พบกับ<strong style="color:${TEXT_PRIMARY};">หัวหน้าแผนก</strong>ที่คุณสมัคร และซักถามเกี่ยวกับงาน บริษัท และสวัสดิการได้ตามต้องการ</li>
            </ul>
            ${paragraph(`<strong style="color:${TEXT_PRIMARY};">เอกสารที่อยากให้เตรียมในวันสัมภาษณ์:</strong>`)}
            <ul style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.75;color:${TEXT_MUTED};">
              <li>บัตรประจำตัวประชาชน (ตัวจริง)</li>
              <li>สำเนาวุฒิการศึกษาล่าสุด</li>
              <li>Portfolio หรือผลงานที่อยากนำเสนอ (ถ้ามี)</li>
            </ul>
            ${paragraph('หากในวันที่ดิฉันโทรไป คุณไม่สะดวกรับสาย หรือยังตัดสินใจไม่ได้ทันที สามารถตอบกลับอีเมลฉบับนี้เพื่อให้ดิฉันโทรกลับในเวลาอื่นได้นะคะ — เราอยากให้กระบวนการนี้ราบรื่นและไม่กดดันคุณค่ะ', { small: true, muted: true })}
            ${optionalHrNotes(ctx.notes)}
            ${signOff('ขอแสดงความยินดีอีกครั้ง พบกันค่ะ')}
        `,
    })
    return sendCareersEmail({
        to: ctx.to,
        subject: `ยินดีด้วยค่ะ — ผ่านการพิจารณารอบแรก [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4c. interview ──────────────────────────────────────────────────────────
export async function sendStatusInterviewEmail(ctx: StatusEmailContext) {
    const positionPhrase = ctx.position
        ? `ตำแหน่ง <strong style="color:${TEXT_PRIMARY};">${escapeHtml(ctx.position)}</strong>`
        : 'ตำแหน่งที่คุณสมัคร'
    const html = wrap({
        title: 'เรียนเชิญสัมภาษณ์งานค่ะ',
        subhead: 'Careers · Interview Scheduled',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph(`ตามที่ใบสมัครของคุณผ่านการพิจารณามาแล้วก่อนหน้านี้ ดิฉันยินดีเรียนเชิญคุณเข้ามา <strong style="color:${TEXT_PRIMARY};">สัมภาษณ์งาน</strong> สำหรับ${positionPhrase} ค่ะ`)}
            ${referenceBlock(ctx.referenceCode)}
            ${paragraph(`<strong style="color:${TEXT_PRIMARY};">รายละเอียดวัน-เวลา-สถานที่</strong> ดิฉันจะส่งอีกครั้งทาง <strong>อีเมล</strong> หรือ <strong>โทรศัพท์</strong> ภายใน 1–2 วันนี้ — โปรดสังเกต inbox และเช็คโฟลเดอร์ junk/spam อย่างสม่ำเสมอด้วยนะคะ`)}
            ${paragraph(`<strong style="color:${TEXT_PRIMARY};">แนวทางการเตรียมตัวที่อยากแนะนำ:</strong>`)}
            <ul style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.75;color:${TEXT_MUTED};">
              <li>ศึกษาเกี่ยวกับ <strong style="color:${TEXT_PRIMARY};">EBCI</strong> และธุรกิจของเราเบื้องต้น เพื่อให้พูดคุยกับหัวหน้าแผนกได้ราบรื่น</li>
              <li>ทบทวนประสบการณ์การทำงานและผลงานเด่นที่อยากเล่าให้เราฟัง</li>
              <li>เตรียม<strong style="color:${TEXT_PRIMARY};">คำถามที่อยากถามเรา</strong> เช่น ลักษณะงานในแต่ละวัน, สวัสดิการ, วัฒนธรรมองค์กร, โอกาสเติบโต — สิ่งที่คุณอยากรู้ก่อนตัดสินใจ</li>
              <li>เตรียมเอกสาร: บัตรประชาชน, สำเนาวุฒิการศึกษา, Portfolio (ถ้ามี)</li>
            </ul>
            ${paragraph(`การสัมภาษณ์จะเป็นการสนทนาแบบ<strong style="color:${TEXT_PRIMARY};">เป็นกันเอง</strong> ไม่ต้องเครียดหรือเกร็งนะคะ — เป้าหมายของเราคือทำความรู้จักคุณให้มากขึ้น และให้คุณได้รู้จักเราเช่นกัน เพื่อจะตัดสินใจร่วมกันได้ว่าเหมาะสมหรือไม่`)}
            ${paragraph('หากต้องการเลื่อนวันสัมภาษณ์ หรือมีข้อสงสัยใด ๆ สามารถตอบกลับอีเมลนี้ได้เลย ดิฉันจะรีบประสานงานให้ค่ะ', { small: true, muted: true })}
            ${optionalHrNotes(ctx.notes)}
            ${signOff('พบกันในวันสัมภาษณ์นะคะ')}
        `,
    })
    return sendCareersEmail({
        to: ctx.to,
        subject: `เรียนเชิญสัมภาษณ์งาน [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4d. hired ──────────────────────────────────────────────────────────────
export async function sendStatusHiredEmail(ctx: StatusEmailContext) {
    const positionPhrase = ctx.position
        ? `ในตำแหน่ง <strong style="color:${TEXT_PRIMARY};">${escapeHtml(ctx.position)}</strong>`
        : 'ในตำแหน่งที่คุณสมัคร'
    const html = wrap({
        title: 'ยินดีต้อนรับสู่ครอบครัว EBCI ค่ะ',
        subhead: 'Careers · Offer Extended',
        accent: 'green',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph('<strong style="color:#047857;font-size:20px;line-height:1.5;">ขอแสดงความยินดีอย่างยิ่งค่ะ!</strong>')}
            ${paragraph(`หลังจากพิจารณาอย่างถี่ถ้วนทั้งจากใบสมัครและการสัมภาษณ์ ทีมและดิฉันมีความยินดีเป็นอย่างยิ่งที่จะ <strong style="color:#047857;">เสนอตำแหน่งงาน</strong> ${positionPhrase} ให้กับคุณ — เรามองเห็นถึงทักษะ ทัศนคติ และความตั้งใจของคุณที่จะร่วมเติบโตไปกับเรา`)}
            ${referenceBlock(ctx.referenceCode, 'green')}
            ${paragraph(`<strong style="color:${TEXT_PRIMARY};">ในไม่กี่วันข้างหน้า ดิฉันจะติดต่อกลับทางโทรศัพท์เพื่อ:</strong>`)}
            <ul style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.75;color:${TEXT_MUTED};">
              <li>พูดคุยรายละเอียด<strong style="color:${TEXT_PRIMARY};">เงื่อนไขการจ้าง</strong> — เงินเดือน สวัสดิการ ระยะทดลองงาน เวลาเข้า-ออก</li>
              <li>นัด<strong style="color:${TEXT_PRIMARY};">วันเริ่มงาน</strong> และวันที่สะดวกเข้ามาเซ็นสัญญาจ้าง</li>
              <li>แจ้ง<strong style="color:${TEXT_PRIMARY};">เอกสารที่ต้องเตรียม</strong>ในวันแรก เช่น สำเนาบัตรประชาชน สำเนาทะเบียนบ้าน รูปถ่าย เอกสารทางทหาร (สำหรับเพศชาย) เป็นต้น</li>
            </ul>
            ${paragraph('ในระหว่างนี้ หากคุณมีคำถามเรื่องเงื่อนไขการจ้าง อยากต่อรองรายละเอียดบางส่วน หรือมีข้อกังวลใด ๆ ขอให้ตอบกลับอีเมลฉบับนี้ หรือโทรเข้ามาคุยกับดิฉันได้โดยตรงเลยนะคะ — เราอยากให้คุณตัดสินใจอย่างสบายใจที่สุด ไม่กดดันให้ตอบรับโดยทันทีค่ะ')}
            ${paragraph(`ดิฉันและทีม <strong style="color:${TEXT_PRIMARY};">ตื่นเต้นและรอคอยที่จะได้ต้อนรับคุณ</strong>เข้าสู่ครอบครัว EBCI ในเร็ว ๆ นี้นะคะ`)}
            ${optionalHrNotes(ctx.notes)}
            ${signOff('ขอแสดงความยินดีอีกครั้ง และพบกันในวันแรกของงานค่ะ')}
        `,
    })
    return sendCareersEmail({
        to: ctx.to,
        subject: `ยินดีต้อนรับสู่ EBCI ค่ะ [${ctx.referenceCode}]`,
        html,
    })
}

// ── 4e. rejected — softer maroon, no accent band ───────────────────────────
export async function sendStatusRejectedEmail(ctx: StatusEmailContext) {
    const positionPhrase = ctx.position
        ? `ในตำแหน่ง <strong style="color:${TEXT_PRIMARY};">${escapeHtml(ctx.position)}</strong>`
        : 'ในตำแหน่งที่คุณสมัคร'
    const html = wrap({
        title: 'ผลการพิจารณาใบสมัครงาน',
        subhead: 'Careers · Application Update',
        bodyHtml: `
            ${statusHeader(ctx)}
            ${paragraph(`ก่อนอื่น ดิฉันต้องขอบคุณคุณมากที่ให้ความสนใจสมัครงาน${positionPhrase}กับ EBCI และสละเวลากรอกใบสมัคร เตรียมเอกสาร รวมถึงเข้าสู่ขั้นตอนการพิจารณาร่วมกับเราอย่างตั้งใจค่ะ`)}
            ${referenceBlock(ctx.referenceCode)}
            ${paragraph(`ดิฉันต้องเรียนแจ้งคุณตรง ๆ ว่า — หลังจากพิจารณาใบสมัครของผู้สมัครหลายท่านอย่างละเอียดแล้ว เราจำเป็นต้องเลือกผู้ที่มีคุณสมบัติตรงกับสิ่งที่ทีมมองหาในรอบนี้มากที่สุด ดังนั้น <strong style="color:${TEXT_PRIMARY};">ใบสมัครของคุณจึงยังไม่ผ่านการพิจารณาในรอบนี้ค่ะ</strong>`)}
            ${paragraph('การตัดสินใจนี้<strong>ไม่ได้สะท้อนถึงความสามารถหรือคุณค่าของคุณ</strong>เลยนะคะ — ผู้สมัครแต่ละท่านมีจุดเด่นที่แตกต่างกัน และบ่อยครั้งความเหมาะสมระหว่างผู้สมัครกับตำแหน่งงานก็เป็นเรื่องของจังหวะ ทิศทางทีม และบริบทเฉพาะหน้าของบริษัทในช่วงเวลานั้น ๆ มากกว่าตัวคุณค่ะ')}
            ${paragraph(`อย่างไรก็ดี ดิฉันจะ<strong>เก็บข้อมูลใบสมัครของคุณไว้ในระบบ</strong> หากในอนาคต EBCI มีตำแหน่งใหม่ที่คุณสมบัติของคุณตรงกัน ดิฉันจะรีบติดต่อกลับโดยตรงนะคะ — และหากคุณยังสนใจร่วมงานกับเราในตำแหน่งอื่น ๆ ก็ยินดีให้สมัครเข้ามาใหม่ได้ตลอดค่ะ`)}
            ${paragraph('ขอเป็นกำลังใจให้คุณในเส้นทางอาชีพที่กำลังจะเดินต่อไป ขอให้พบกับโอกาสที่ดีและทีมที่ใช่นะคะ')}
            ${optionalHrNotes(ctx.notes)}
            ${signOff('ขอบคุณอีกครั้งที่ให้ความสนใจ EBCI ค่ะ')}
        `,
    })
    return sendCareersEmail({
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

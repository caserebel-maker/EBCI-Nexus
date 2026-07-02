import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const FEEDBACK_TO = 'tumyen@gmail.com'
const VALID_CATEGORIES = new Set([
    'ข้อเสนอแนะ',
    'แจ้งปัญหา',
    'ติชม',
    'ปรับปรุงระบบ',
    'อื่น ๆ',
])

type EmployeeRow = {
    id: string
    first_name_th: string | null
    last_name_th: string | null
    nickname: string | null
    employee_code: string | null
    email: string | null
    department: string | null
    position: string | null
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function displayName(emp: EmployeeRow): string {
    const fullName = [emp.first_name_th, emp.last_name_th].filter(Boolean).join(' ').trim()
    if (!fullName) return emp.employee_code ? `พนักงาน ${emp.employee_code}` : 'พนักงาน'
    return emp.nickname ? `${fullName} (${emp.nickname})` : fullName
}

function formatBangkokNow(): string {
    return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date())
}

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ ok: false, error: 'กรุณาเข้าสู่ระบบใหม่' }, { status: 401 })
    }

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ ok: false, error: 'ไม่พบข้อมูลพนักงานของบัญชีนี้' }, { status: 403 })
    }

    const body = await req.json().catch(() => null) as { category?: unknown; message?: unknown } | null
    const category = typeof body?.category === 'string' && VALID_CATEGORIES.has(body.category)
        ? body.category
        : 'ข้อเสนอแนะ'
    const message = typeof body?.message === 'string' ? body.message.trim() : ''

    if (message.length < 10) {
        return NextResponse.json({ ok: false, error: 'กรุณากรอกรายละเอียดอย่างน้อย 10 ตัวอักษร' }, { status: 400 })
    }
    if (message.length > 2000) {
        return NextResponse.json({ ok: false, error: 'ข้อความยาวเกิน 2,000 ตัวอักษร' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
        .from('employees')
        .select('id, first_name_th, last_name_th, nickname, employee_code, email, department, position')
        .eq('id', employeeId)
        .maybeSingle()

    if (error || !data) {
        console.error('[feedback] employee lookup failed', { employeeId, error })
        return NextResponse.json({ ok: false, error: 'ไม่พบข้อมูลพนักงานของผู้ส่ง' }, { status: 500 })
    }

    const emp = data as EmployeeRow
    const name = displayName(emp)
    const submittedAt = formatBangkokNow()
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')
    const subject = `[EBCI Nexus] ${category} จาก ${name}`

    const html = `<!doctype html>
<html lang="th">
<head><meta charset="utf-8"></head>
<body style="margin:0;background:#f5f5f5;font-family:Arial,'Sarabun',sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 12px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:linear-gradient(135deg,#561e23,#8b2434);padding:24px 28px;color:#ffffff;">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;opacity:.72;">EBCI Nexus Feedback</div>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.35;">${escapeHtml(category)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 28px;">
            <h2 style="margin:0 0 10px;font-size:18px;color:#111827;">ข้อความจากพนักงาน</h2>
            <div style="border-left:4px solid #facc15;background:#fffbeb;border-radius:10px;padding:16px 18px;font-size:15px;line-height:1.8;color:#111827;">${safeMessage}</div>
            <h2 style="margin:28px 0 12px;font-size:18px;color:#111827;">ข้อมูลผู้ส่ง</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.8;">
              <tr><td style="width:150px;color:#6b7280;padding:4px 0;">ชื่อ</td><td style="font-weight:700;color:#111827;">${escapeHtml(name)}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0;">รหัสพนักงาน</td><td>${escapeHtml(emp.employee_code ?? '-')}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0;">อีเมล</td><td>${escapeHtml(emp.email ?? '-')}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0;">แผนก</td><td>${escapeHtml(emp.department ?? '-')}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0;">ตำแหน่ง</td><td>${escapeHtml(emp.position ?? '-')}</td></tr>
              <tr><td style="color:#6b7280;padding:4px 0;">เวลาที่ส่ง</td><td>${escapeHtml(submittedAt)}</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    const text = [
        `ประเภท: ${category}`,
        `จาก: ${name}`,
        `รหัสพนักงาน: ${emp.employee_code ?? '-'}`,
        `อีเมล: ${emp.email ?? '-'}`,
        `แผนก: ${emp.department ?? '-'}`,
        `ตำแหน่ง: ${emp.position ?? '-'}`,
        `เวลาที่ส่ง: ${submittedAt}`,
        '',
        message,
    ].join('\n')

    const result = await sendEmail({
        to: FEEDBACK_TO,
        subject,
        html,
        text,
        sender: 'system',
        audit: {
            category: 'feedback',
            entityType: 'employee_feedback',
            entityId: emp.id,
            template: 'employee_feedback_to_owner',
            metadata: {
                employee_code: emp.employee_code,
                feedback_category: category,
            },
        },
    })

    if (!result.success) {
        return NextResponse.json({ ok: false, error: 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, mock: 'mock' in result ? result.mock : false })
}

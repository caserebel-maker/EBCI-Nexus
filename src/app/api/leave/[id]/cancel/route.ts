import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { adjustPendingDays } from '@/lib/leave-balance'
import { sendTelegram, escapeTelegramHtml } from '@/lib/telegram'
import { formatEmployeeName } from '@/lib/format-employee-name'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leave/[id]/cancel
 * Body (optional JSON): { reason?: string }
 *
 * Employee-initiated cancel. Only allowed when status='pending' and
 * the caller owns the request. Reverses the pending_days reservation
 * made at submit time.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const employeeId = await resolveSessionEmployeeId(session)
    if (!employeeId) {
        return NextResponse.json({ error: 'ไม่พบพนักงานที่เชื่อมโยงบัญชี' }, { status: 400 })
    }

    const { id } = await context.params
    const body = await req.json().catch(() => ({}))
    const reason: string | null = body?.reason ? String(body.reason).trim() : null

    // Ownership + state check
    const { data: row, error: readErr } = await supabaseAdmin
        .from('leave_requests')
        .select('id, employee_id, status, approver_id, leave_type_id, total_days, start_date, end_date, reason')
        .eq('id', id)
        .maybeSingle()
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'ไม่พบใบลา' }, { status: 404 })
    if (row.employee_id !== employeeId) {
        return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ยกเลิกใบลานี้' }, { status: 403 })
    }
    if (row.status !== 'pending') {
        return NextResponse.json(
            { error: 'ยกเลิกได้เฉพาะใบลาที่อยู่ในสถานะรออนุมัติ' },
            { status: 409 },
        )
    }

    const nowIso = new Date().toISOString()
    const { error: updErr } = await supabaseAdmin
        .from('leave_requests')
        .update({
            status: 'cancelled',
            cancelled_at: nowIso,
            cancellation_reason: reason,
            updated_at: nowIso,
        })
        .eq('id', id)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Release the pending reservation on the balance row
    const year = new Date(row.start_date as string).getFullYear()
    const balanceRes = await adjustPendingDays({
        employeeId,
        leaveTypeId: row.leave_type_id as string,
        year,
        delta: -Number(row.total_days ?? 0),
    })
    if (!balanceRes.ok) {
        console.error('[leave/cancel] balance rollback failed:', balanceRes.error)
        // Row is cancelled already; pending rollback is best-effort.
    }

    // Notify only the actual approver that the pending item was withdrawn.
    // HR Telegram stays quiet until an approver decision exists.
    try {
        const [{ data: employee }, { data: approver }, { data: leaveType }] = await Promise.all([
            supabaseAdmin
                .from('employees')
                .select('first_name_th, last_name_th, nickname')
                .eq('id', row.employee_id as string)
                .maybeSingle(),
            row.approver_id
                ? supabaseAdmin
                    .from('employees')
                    .select('telegram_chat_id')
                    .eq('id', row.approver_id as string)
                    .maybeSingle()
                : Promise.resolve({ data: null }),
            supabaseAdmin
                .from('leave_types')
                .select('name_th')
                .eq('id', row.leave_type_id as string)
                .maybeSingle(),
        ])
        const approverChatId = (approver as { telegram_chat_id?: string | null } | null)?.telegram_chat_id
        if (approverChatId) {
            const applicantName = formatEmployeeName(employee, 'พนักงาน')
            const dateLabel = row.start_date === row.end_date
                ? row.start_date as string
                : `${row.start_date as string} → ${row.end_date as string}`
            const leaveTypeTh = (leaveType as { name_th?: string | null } | null)?.name_th ?? 'ลา'
            const originalReason = (row.reason as string | null)?.trim()
            const text = [
                `🗑️ <b>ใบลาถูกยกเลิกแล้ว</b>`,
                `👤 ${escapeTelegramHtml(applicantName)}`,
                `🌴 ${escapeTelegramHtml(leaveTypeTh)}`,
                `📅 ${escapeTelegramHtml(dateLabel)} (${Number(row.total_days)} วัน)`,
                reason ? `📝 เหตุผลที่ยกเลิก: ${escapeTelegramHtml(reason.slice(0, 200))}` : '',
                originalReason ? `เหตุผลเดิม: ${escapeTelegramHtml(originalReason.slice(0, 200))}` : '',
                `<a href="https://ebci-nexus.vercel.app/portal/leave/inbox">เปิดกล่องอนุมัติใน Nexus →</a>`,
            ].filter(Boolean).join('\n')
            sendTelegram({ chatId: approverChatId, text })
                .catch(err => console.error('[leave/cancel] approver telegram failed:', err))
        }
    } catch (err) {
        console.error('[leave/cancel] approver notify failed:', err)
    }

    return NextResponse.json({ success: true, id, cancelled_at: nowIso })
}

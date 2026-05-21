import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import {
    markEmailIssueAlerted,
    recordResendWebhookEvent,
    type EmailDeliveryLogSummary,
    type ResendWebhookEvent,
} from '@/lib/email-audit'
import { createNotification } from '@/lib/notifications'
import { findHrNotifyTargets } from '@/lib/hr-notify'
import { escapeTelegramHtml, sendTelegram } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
    delivery_delayed: 'ส่งล่าช้า',
    bounced: 'ตีกลับ',
    complained: 'ถูกรายงานว่าเป็นสแปม',
    failed: 'ส่งไม่สำเร็จ',
    suppressed: 'ถูก Resend ระงับ',
}

function trimSubject(subject: string): string {
    return subject.length > 90 ? `${subject.slice(0, 87)}...` : subject
}

async function alertHr(log: EmailDeliveryLogSummary, status: string) {
    const label = STATUS_LABEL[status] ?? status
    const recipients = log.to_addresses.join(', ') || 'ไม่ทราบผู้รับ'
    const body = `${label}: ${recipients} — ${trimSubject(log.subject)}`

    const targets = await findHrNotifyTargets()
    await Promise.allSettled(targets.map(async target => {
        if (target.userId) {
            await createNotification({
                recipient_user_id: target.userId,
                type: 'email_delivery_problem',
                title: 'อีเมลระบบมีปัญหา',
                body,
                action_url: '/hradmin/settings/email',
                action_label: 'ดู Email Audit',
                entity_type: log.entity_type ?? 'email_delivery',
                entity_id: log.entity_id ?? log.id,
                reference_code: log.reference_code ?? log.resend_email_id ?? log.id,
                icon: 'MailWarning',
                color: status === 'delivery_delayed' ? 'amber' : 'red',
                sender_name: 'EBCI Nexus',
                metadata: {
                    email_log_id: log.id,
                    status,
                    recipients: log.to_addresses,
                    subject: log.subject,
                },
            })
        }

        if (target.telegramChatId) {
            const lines = [
                `⚠️ <b>Email ${escapeTelegramHtml(label)}</b>`,
                `To: ${escapeTelegramHtml(recipients)}`,
                `Subject: ${escapeTelegramHtml(trimSubject(log.subject))}`,
                `<a href="https://ebci-nexus.vercel.app/hradmin/settings/email">เปิด Email Audit →</a>`,
            ]
            await sendTelegram({ chatId: target.telegramChatId, text: lines.join('\n') })
        }
    }))

    await markEmailIssueAlerted(log.id)
}

export async function GET() {
    return NextResponse.json({
        ok: true,
        service: 'resend-webhook',
        configured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    })
}

export async function POST(req: NextRequest) {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (!webhookSecret) {
        return NextResponse.json(
            { error: 'RESEND_WEBHOOK_SECRET is not configured' },
            { status: 503 },
        )
    }

    const payload = await req.text()
    const svixId = req.headers.get('svix-id') ?? ''
    const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
    const svixSignature = req.headers.get('svix-signature') ?? ''

    if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 })
    }

    let event: ResendWebhookEvent
    try {
        const resend = new Resend(process.env.RESEND_API_KEY ?? 're_webhook_verify_only')
        event = resend.webhooks.verify({
            payload,
            headers: {
                id: svixId,
                timestamp: svixTimestamp,
                signature: svixSignature,
            },
            webhookSecret,
        }) as unknown as ResendWebhookEvent
    } catch (err) {
        console.error('[resend-webhook] invalid signature:', err)
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    const result = await recordResendWebhookEvent(event, svixId)
    if (result.shouldAlert && result.log) {
        await alertHr(result.log, result.status)
    }

    return NextResponse.json({
        ok: true,
        duplicate: result.duplicate,
        type: result.eventType,
        status: result.status,
    })
}

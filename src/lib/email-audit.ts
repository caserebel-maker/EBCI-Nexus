import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type EmailAuditStatus =
    | 'mock'
    | 'queued'
    | 'sending'
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'delivery_delayed'
    | 'bounced'
    | 'complained'
    | 'failed'
    | 'suppressed'
    | 'unknown'

export interface EmailAuditContext {
    category?: string | null
    entityType?: string | null
    entityId?: string | null
    referenceCode?: string | null
    template?: string | null
    metadata?: Record<string, unknown> | null
}

export interface EmailAttemptInput {
    senderKey: string
    fromAddress: string
    toAddresses: string[]
    subject: string
    audit?: EmailAuditContext | null
}

export interface EmailDeliveryLogSummary {
    id: string
    resend_email_id: string | null
    status: EmailAuditStatus
    to_addresses: string[]
    subject: string
    category: string | null
    entity_type: string | null
    entity_id: string | null
    reference_code: string | null
    alerted_at: string | null
}

export interface ResendWebhookEvent {
    type: string
    created_at?: string | null
    data?: {
        email_id?: string | null
        from?: string | null
        to?: string[] | string | null
        subject?: string | null
        [key: string]: unknown
    } | null
}

export interface RecordedWebhookResult {
    duplicate: boolean
    status: EmailAuditStatus
    eventType: string
    log: EmailDeliveryLogSummary | null
    shouldAlert: boolean
}

const EVENT_STATUS: Record<string, EmailAuditStatus> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.delivery_delayed': 'delivery_delayed',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.failed': 'failed',
    'email.suppressed': 'suppressed',
}

const PROBLEM_STATUSES = new Set<EmailAuditStatus>([
    'delivery_delayed',
    'bounced',
    'complained',
    'failed',
    'suppressed',
])

function asJsonObject(value: unknown): Record<string, unknown> | null {
    if (value == null) return null
    if (value instanceof Error) {
        return { name: value.name, message: value.message, stack: value.stack }
    }
    try {
        const serialized = JSON.parse(JSON.stringify(value)) as unknown
        if (serialized && typeof serialized === 'object' && !Array.isArray(serialized)) {
            return serialized as Record<string, unknown>
        }
        return { value: serialized }
    } catch {
        return { value: String(value) }
    }
}

function auditInsert(input: EmailAttemptInput, status: EmailAuditStatus): Record<string, unknown> {
    return {
        provider: 'resend',
        status,
        sender_key: input.senderKey,
        from_address: input.fromAddress,
        to_addresses: input.toAddresses,
        subject: input.subject,
        category: input.audit?.category ?? null,
        entity_type: input.audit?.entityType ?? null,
        entity_id: input.audit?.entityId ?? null,
        reference_code: input.audit?.referenceCode ?? null,
        template: input.audit?.template ?? null,
        metadata: input.audit?.metadata ?? {},
        last_event_type: status === 'mock' ? 'mock' : 'api.sending',
        last_event_at: new Date().toISOString(),
    }
}

export async function createEmailAttempt(input: EmailAttemptInput): Promise<string | null> {
    try {
        const { data, error } = await supabaseAdmin
            .from('email_delivery_logs')
            .insert(auditInsert(input, 'sending'))
            .select('id')
            .single()
        if (error) {
            console.error('[email-audit] create attempt failed:', error)
            return null
        }
        return String((data as { id: string }).id)
    } catch (err) {
        console.error('[email-audit] create attempt threw:', err)
        return null
    }
}

export async function recordMockEmail(input: EmailAttemptInput): Promise<void> {
    try {
        const { error } = await supabaseAdmin
            .from('email_delivery_logs')
            .insert(auditInsert(input, 'mock'))
        if (error) console.error('[email-audit] record mock failed:', error)
    } catch (err) {
        console.error('[email-audit] record mock threw:', err)
    }
}

export async function markEmailSent(
    auditId: string | null,
    resendEmailId: string | undefined,
    providerResponse: unknown,
): Promise<void> {
    if (!auditId) return
    const now = new Date().toISOString()
    try {
        const { error } = await supabaseAdmin
            .from('email_delivery_logs')
            .update({
                status: 'sent',
                resend_email_id: resendEmailId ?? null,
                provider_response: asJsonObject(providerResponse),
                last_error: null,
                last_event_type: 'api.sent',
                last_event_at: now,
                sent_at: now,
            })
            .eq('id', auditId)
        if (error) console.error('[email-audit] mark sent failed:', error)
    } catch (err) {
        console.error('[email-audit] mark sent threw:', err)
    }
}

export async function markEmailFailed(
    auditId: string | null,
    errorValue: unknown,
): Promise<void> {
    if (!auditId) return
    const now = new Date().toISOString()
    try {
        const { error } = await supabaseAdmin
            .from('email_delivery_logs')
            .update({
                status: 'failed',
                last_error: asJsonObject(errorValue),
                last_event_type: 'api.failed',
                last_event_at: now,
                failed_at: now,
            })
            .eq('id', auditId)
        if (error) console.error('[email-audit] mark failed failed:', error)
    } catch (err) {
        console.error('[email-audit] mark failed threw:', err)
    }
}

function normalizeRecipients(to: string | string[] | null | undefined): string[] {
    if (Array.isArray(to)) return to.filter((v): v is string => typeof v === 'string')
    if (typeof to === 'string') return [to]
    return []
}

function eventTimestamp(event: ResendWebhookEvent): string {
    const parsed = event.created_at ? new Date(event.created_at) : null
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toISOString()
    return new Date().toISOString()
}

function statusPatch(status: EmailAuditStatus, event: ResendWebhookEvent): Record<string, unknown> {
    const at = eventTimestamp(event)
    const patch: Record<string, unknown> = {
        status,
        last_event_type: event.type,
        last_event_at: at,
    }
    switch (status) {
        case 'sent':
            patch.sent_at = at
            break
        case 'delivered':
            patch.delivered_at = at
            break
        case 'opened':
            patch.opened_at = at
            break
        case 'clicked':
            patch.clicked_at = at
            break
        case 'delivery_delayed':
            patch.delayed_at = at
            patch.last_error = asJsonObject(event.data)
            break
        case 'bounced':
            patch.bounced_at = at
            patch.last_error = asJsonObject(event.data)
            break
        case 'complained':
            patch.complained_at = at
            patch.last_error = asJsonObject(event.data)
            break
        case 'failed':
            patch.failed_at = at
            patch.last_error = asJsonObject(event.data)
            break
        case 'suppressed':
            patch.suppressed_at = at
            patch.last_error = asJsonObject(event.data)
            break
        default:
            break
    }
    return patch
}

function toLogSummary(row: Record<string, unknown>): EmailDeliveryLogSummary {
    return {
        id: String(row.id),
        resend_email_id: row.resend_email_id ? String(row.resend_email_id) : null,
        status: (row.status as EmailAuditStatus) ?? 'unknown',
        to_addresses: Array.isArray(row.to_addresses)
            ? row.to_addresses.filter((v): v is string => typeof v === 'string')
            : [],
        subject: String(row.subject ?? ''),
        category: row.category ? String(row.category) : null,
        entity_type: row.entity_type ? String(row.entity_type) : null,
        entity_id: row.entity_id ? String(row.entity_id) : null,
        reference_code: row.reference_code ? String(row.reference_code) : null,
        alerted_at: row.alerted_at ? String(row.alerted_at) : null,
    }
}

async function findOrCreateLogForWebhook(
    event: ResendWebhookEvent,
    status: EmailAuditStatus,
): Promise<EmailDeliveryLogSummary | null> {
    const emailId = event.data?.email_id ?? null
    if (!emailId) return null

    const { data: existing, error: lookupErr } = await supabaseAdmin
        .from('email_delivery_logs')
        .select('id, resend_email_id, status, to_addresses, subject, category, entity_type, entity_id, reference_code, alerted_at')
        .eq('resend_email_id', emailId)
        .maybeSingle()
    if (lookupErr) {
        console.error('[email-audit] webhook lookup failed:', lookupErr)
    }
    if (existing) return toLogSummary(existing as Record<string, unknown>)

    const createdAt = eventTimestamp(event)
    const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('email_delivery_logs')
        .insert({
            provider: 'resend',
            resend_email_id: emailId,
            status,
            from_address: event.data?.from ?? 'unknown',
            to_addresses: normalizeRecipients(event.data?.to),
            subject: event.data?.subject ?? '(no subject)',
            metadata: { source: 'webhook-first' },
            last_event_type: event.type,
            last_event_at: createdAt,
        })
        .select('id, resend_email_id, status, to_addresses, subject, category, entity_type, entity_id, reference_code, alerted_at')
        .single()
    if (insertErr || !inserted) {
        console.error('[email-audit] webhook create log failed:', insertErr)
        return null
    }
    return toLogSummary(inserted as Record<string, unknown>)
}

export async function recordResendWebhookEvent(
    event: ResendWebhookEvent,
    svixId: string,
): Promise<RecordedWebhookResult> {
    const status = EVENT_STATUS[event.type] ?? 'unknown'
    const log = await findOrCreateLogForWebhook(event, status)

    if (log) {
        const { error: updateErr } = await supabaseAdmin
            .from('email_delivery_logs')
            .update(statusPatch(status, event))
            .eq('id', log.id)
        if (updateErr) console.error('[email-audit] webhook log update failed:', updateErr)
    }

    const { error: eventErr } = await supabaseAdmin
        .from('email_delivery_events')
        .insert({
            email_log_id: log?.id ?? null,
            resend_email_id: event.data?.email_id ?? null,
            svix_id: svixId,
            event_type: event.type,
            event_at: eventTimestamp(event),
            payload: asJsonObject(event) ?? {},
        })

    const duplicate = eventErr?.code === '23505'
    if (eventErr && !duplicate) {
        console.error('[email-audit] webhook event insert failed:', eventErr)
    }

    return {
        duplicate,
        status,
        eventType: event.type,
        log,
        shouldAlert: !duplicate && !!log && !log.alerted_at && PROBLEM_STATUSES.has(status),
    }
}

export async function markEmailIssueAlerted(logId: string): Promise<void> {
    try {
        const { error } = await supabaseAdmin
            .from('email_delivery_logs')
            .update({ alerted_at: new Date().toISOString() })
            .eq('id', logId)
        if (error) console.error('[email-audit] mark alerted failed:', error)
    } catch (err) {
        console.error('[email-audit] mark alerted threw:', err)
    }
}

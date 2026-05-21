-- 20260521_create_email_delivery_audit.sql
--
-- Email delivery reliability layer.
--
-- `email_delivery_logs` tracks every outbound email attempt that goes
-- through lib/email.ts. `email_delivery_events` stores Resend webhook
-- callbacks keyed by svix-id for idempotency. RLS is enabled with no
-- browser policies; server-side service_role code is the only writer.

CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL DEFAULT 'resend',
    resend_email_id text,
    status text NOT NULL DEFAULT 'queued',
    sender_key text,
    from_address text NOT NULL,
    to_addresses text[] NOT NULL DEFAULT '{}',
    subject text NOT NULL,
    category text,
    entity_type text,
    entity_id text,
    reference_code text,
    template text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    provider_response jsonb,
    last_error jsonb,
    last_event_type text,
    last_event_at timestamptz,
    sent_at timestamptz,
    delivered_at timestamptz,
    delayed_at timestamptz,
    failed_at timestamptz,
    bounced_at timestamptz,
    complained_at timestamptz,
    suppressed_at timestamptz,
    opened_at timestamptz,
    clicked_at timestamptz,
    alerted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT email_delivery_logs_status_check CHECK (
        status IN (
            'mock',
            'queued',
            'sending',
            'sent',
            'delivered',
            'opened',
            'clicked',
            'delivery_delayed',
            'bounced',
            'complained',
            'failed',
            'suppressed',
            'unknown'
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS email_delivery_logs_resend_email_id_uidx
    ON public.email_delivery_logs (resend_email_id)
    WHERE resend_email_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_delivery_logs_created_idx
    ON public.email_delivery_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS email_delivery_logs_status_idx
    ON public.email_delivery_logs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS email_delivery_logs_reference_idx
    ON public.email_delivery_logs (reference_code)
    WHERE reference_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.email_delivery_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email_log_id uuid REFERENCES public.email_delivery_logs(id) ON DELETE SET NULL,
    resend_email_id text,
    svix_id text NOT NULL,
    event_type text NOT NULL,
    event_at timestamptz NOT NULL DEFAULT now(),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_delivery_events_svix_id_uidx
    ON public.email_delivery_events (svix_id);

CREATE INDEX IF NOT EXISTS email_delivery_events_email_log_idx
    ON public.email_delivery_events (email_log_id, event_at DESC);

CREATE INDEX IF NOT EXISTS email_delivery_events_resend_email_id_idx
    ON public.email_delivery_events (resend_email_id, event_at DESC);

CREATE OR REPLACE FUNCTION public.touch_email_delivery_logs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_email_delivery_logs_updated_at
    ON public.email_delivery_logs;

CREATE TRIGGER trg_touch_email_delivery_logs_updated_at
    BEFORE UPDATE ON public.email_delivery_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_email_delivery_logs_updated_at();

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;

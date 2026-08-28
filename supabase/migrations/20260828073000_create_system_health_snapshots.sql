-- Store the latest health telemetry posted by the office HIP sync machine.
-- The web app reads this through a protected HR-admin API route using the
-- service-role key; clients do not query this table directly.

CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
    host_key text PRIMARY KEY,
    host_name text,
    temperature_c numeric(5,2),
    temperature_source text,
    cpu_load_percent numeric(5,2),
    memory_used_percent numeric(5,2),
    uptime_seconds bigint,
    hip_running boolean,
    sync_loop_running boolean,
    power_status text,
    raw_data jsonb DEFAULT '{}'::jsonb,
    reported_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.system_health_snapshots IS
    'Latest system telemetry from the office HIP sync machine for HR admin monitoring.';

COMMENT ON COLUMN public.system_health_snapshots.temperature_c IS
    'Temperature in Celsius, when Windows exposes a usable thermal sensor.';


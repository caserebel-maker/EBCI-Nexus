-- Login-attempt log feeding the rate limiter in /api/auth/login.
-- Each row is one attempt (success or failure). The login handler
-- COUNT(*)-windows the recent failed rows for (email, ip) and rejects
-- when either counter trips its threshold.
--
-- Why a Postgres table instead of Upstash / Redis:
--   - We already pay for Supabase; one more table is free.
--   - Postgres gives us atomicity for "insert + read window count" in
--     a single round-trip, no extra service to monitor.
--   - Beta scale is small enough that a table scan with the right
--     indexes finishes in <2ms; once we hit ~1k logins/min we'd move
--     to a sliding-window structure but that's not today's problem.
--
-- RLS on with no policies → service role bypass is the only access
-- path, matching the rest of the schema (see 20260428_enable_rls_*).

CREATE TABLE IF NOT EXISTS login_attempts (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email_lower  text NOT NULL,
    ip_address   inet NULL,
    success      boolean NOT NULL,
    attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Lookups always filter by email or IP and join with success = false +
-- a recency window. Partial indexes on success=false keep the index
-- small; success rows are written once and never queried for the
-- limiter (we keep them for audit / "last login" reads).
CREATE INDEX IF NOT EXISTS login_attempts_lookup_idx
    ON login_attempts (email_lower, attempted_at DESC)
    WHERE success = false;

CREATE INDEX IF NOT EXISTS login_attempts_ip_idx
    ON login_attempts (ip_address, attempted_at DESC)
    WHERE success = false;

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

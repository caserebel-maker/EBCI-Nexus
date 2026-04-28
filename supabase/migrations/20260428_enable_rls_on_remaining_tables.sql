-- Enable RLS on every public table that was still wide-open. Audit run
-- 2026-04-28 found 14 tables with rls_enabled=false, including User,
-- checkins, leave_*, notifications, and the audit log — all reachable
-- via the anon key shipped to every browser. RLS-off + anon key =
-- "anyone with curl can dump the entire HR DB."
--
-- Strategy: default deny. No policies attached, so the only thing that
-- can read/write these tables is a connection authenticated as the
-- service_role (which bypasses RLS). The app only touches these tables
-- through supabaseAdmin on the server or through API routes that gate
-- on getAuth() first, so this change shouldn't break any user flow.
--
-- If we ever want a browser client to read e.g. holidays directly, the
-- right fix is to add an explicit "USING (true)" SELECT policy at that
-- point — not to flip RLS back off.

ALTER TABLE "User"                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records                ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies               ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_scans                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_locations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_audit_log    ENABLE ROW LEVEL SECURITY;

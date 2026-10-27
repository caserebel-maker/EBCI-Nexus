-- Enable RLS on cctv_cameras table
-- Supabase security scan alert on 25-27 Oct 2026 flagged rls_disabled_in_public for cctv_cameras.
-- Strategy: Default deny for anon/authenticated roles.
-- Server-side routes and components use supabaseAdmin (service_role), which bypasses RLS.

ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;

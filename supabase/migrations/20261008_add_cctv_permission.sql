-- Migration: Add can_view_cctv permission flag to User table
ALTER TABLE public."User"
ADD COLUMN IF NOT EXISTS can_view_cctv boolean NOT NULL DEFAULT false;

-- Grant CCTV viewing access to Sunny (MD)
UPDATE public."User"
SET can_view_cctv = true,
    "updatedAt" = NOW()
WHERE id = 'd3751894-c161-44db-840c-cd02650109f9'
   OR username = 'sayan@ebcitrade.com';

-- Grant CCTV viewing access to HR Admins / Super Admin
UPDATE public."User"
SET can_view_cctv = true,
    "updatedAt" = NOW()
WHERE role = 'hr_admin' OR can_manage_system = true;

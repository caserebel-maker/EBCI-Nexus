-- Enable Row Level Security (RLS)
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicant_educations ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicant_experiences ENABLE ROW LEVEL SECURITY;

-- 1. Announcements Policies
-- Public: Read only 'published' announcements
CREATE POLICY "Public announcements are viewable by everyone" 
ON announcements FOR SELECT 
USING (publishStatus = 'published');

-- Admin (Service Role): Full access (implicit by bypassing RLS with service key, but good to be explicit for authenticated users if we sync users)
-- For this architecture using Custom Auth + Service Role Pattern, 
-- we mainly rely on the Service Key for edits, so additional policies for 'authenticated' Supabase users aren't strictly needed 
-- unless we migrate fully to Supabase Auth.
-- But we'll add a 'deny all' for others just in case.

-- 2. Applicants Policies
-- Public: Can insert new applications (Anonymous submission)
CREATE POLICY "Anyone can submit an application" 
ON applicants FOR INSERT 
WITH CHECK (true);

-- Public: Can Upload Photos/Resumes (Storage Buckets)
-- (Note: Storage policies are handled separately in Storage UI, but logically they align here)

-- Admin: Full access via Service Role (Bypasses RLS)
-- No explicit policy needed for Service Role, but we block SELECT/UPDATE/DELETE for anon
CREATE POLICY "Applicants are private" 
ON applicants FOR SELECT 
USING (false); -- Deny everyone (Service role bypasses this)

-- 3. Employees Policies
-- Admin: Full access via Service Role
CREATE POLICY "Employees are private" 
ON employees FOR ALL 
USING (false); -- Deny everyone

-- 4. Education & Experience (Child tables)
CREATE POLICY "Applicant details are private" ON applicant_educations FOR ALL USING (false);
CREATE POLICY "Experience details are private" ON applicant_experiences FOR ALL USING (false);

-- Allow inserts for child tables linked to new applicants? 
-- This is tricky with separate transactions. 
-- Best practice: Service Role handles the entire transaction (Header + Lines) which is what we do in route.ts now.

-- FORCE REPLICA IDENTITY (Good practice for Realtime)
ALTER TABLE announcements REPLICA IDENTITY FULL;

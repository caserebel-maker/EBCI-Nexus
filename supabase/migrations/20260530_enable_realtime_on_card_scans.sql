-- Enable Supabase Realtime replication on the card_scans table
ALTER PUBLICATION supabase_realtime ADD TABLE card_scans;

-- Drop policies if they already exist (to make the migration re-runnable)
DROP POLICY IF EXISTS select_recent_card_scans ON card_scans;
DROP POLICY IF EXISTS select_recent_swiped_employees ON employees;

-- Allow anonymous read access to card scans that occurred in the last 1 minute based on server import time (for real-time welcome TV display)
CREATE POLICY select_recent_card_scans ON card_scans
    FOR SELECT
    TO anon, authenticated
    USING (imported_at >= (now() - interval '1 minute'));

-- Allow anonymous read access to employee profiles only if they swiped in the last 1 minute based on server import time (for welcome TV display)
CREATE POLICY select_recent_swiped_employees ON employees
    FOR SELECT
    TO anon, authenticated
    USING (
        id IN (
            SELECT employee_id 
            FROM card_scans 
            WHERE imported_at >= (now() - interval '1 minute')
        )
    );

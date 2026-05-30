-- Enable Supabase Realtime replication on the card_scans table
ALTER PUBLICATION supabase_realtime ADD TABLE card_scans;

-- Drop policies if they already exist (to make the migration re-runnable)
DROP POLICY IF EXISTS select_recent_card_scans ON card_scans;
DROP POLICY IF EXISTS select_recent_swiped_employees ON employees;

-- Allow anonymous read access to card scans that occurred in the last 15 seconds (for real-time welcome TV display)
CREATE POLICY select_recent_card_scans ON card_scans
    FOR SELECT
    TO anon, authenticated
    USING (scan_time >= (now() AT TIME ZONE 'Asia/Bangkok' - interval '15 seconds'));

-- Allow anonymous read access to employee profiles only if they swiped in the last 15 seconds (for welcome TV display)
CREATE POLICY select_recent_swiped_employees ON employees
    FOR SELECT
    TO anon, authenticated
    USING (
        id IN (
            SELECT employee_id 
            FROM card_scans 
            WHERE scan_time >= (now() AT TIME ZONE 'Asia/Bangkok' - interval '15 seconds')
        )
    );

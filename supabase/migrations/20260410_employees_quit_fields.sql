-- Add quit_date and quit_reason columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS quit_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS quit_reason TEXT;
-- quit_reason values: 'resigned' | 'retired' | 'contract_ended' | 'other'

-- Add nickname column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname TEXT;

-- 20260424_add_review_notes_metadata_to_job_applications.sql
--
-- Track who/when last edited the free-form HR review_notes column on
-- job_applications. Used by the admin detail page's autosave textarea
-- (`ReviewNotes.tsx`) to render a "บันทึกแล้ว Xs ago" indicator and
-- (in future) attribute the last edit to a specific HR account.

ALTER TABLE public.job_applications
    ADD COLUMN IF NOT EXISTS review_notes_updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS review_notes_updated_by text;

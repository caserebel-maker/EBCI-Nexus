-- Stable storage paths for applicant uploads.
--
-- Why: the existing *_url columns store full Supabase signed URLs
-- (with `?token=...&exp=...` baked in by createSignedUrl at upload
-- time). The token has a 7-day TTL, so the URL silently 403s after
-- a week and the photo / CV silently disappears from the UI.
-- Concrete fallout: testt testy + สรยุทธ สุทัศ photos uploaded
-- 22 Apr disappeared on 29 Apr. Mod hit it on 3 May.
--
-- The fix is to canonical the underlying STORAGE PATH (e.g.
-- `photo/{id}/photo-1776846582751.jpg`) and re-sign on every read.
-- Path columns added alongside the URL columns so we can roll out
-- the read-side switch without breaking anything; the URL columns
-- can be dropped later once every consumer reads from path.
ALTER TABLE public.job_applications
    ADD COLUMN IF NOT EXISTS photo_path             TEXT,
    ADD COLUMN IF NOT EXISTS cv_path                TEXT,
    ADD COLUMN IF NOT EXISTS transcript_path        TEXT,
    ADD COLUMN IF NOT EXISTS id_card_copy_path      TEXT,
    ADD COLUMN IF NOT EXISTS house_registration_path TEXT;

COMMENT ON COLUMN public.job_applications.photo_path IS
    'Canonical storage path inside the applicant-assets bucket (no token, no expiry). Source of truth for the read side; photo_url is kept for backward compat and will be removed in a follow-up.';

-- Back-fill: parse the path out of the legacy *_url for every row
-- where the path column is still null. The URL pattern Supabase
-- emits is `/storage/v1/object/sign/<bucket>/<path>?token=...`, so
-- we slice between the bucket name and the query string.
--
-- IMPORTANT: don't decode here — paths are ASCII-safe in our naming
-- convention (uuid + epoch ms + extension) so the raw URL slice is
-- the same string we'd store at upload time.
WITH src AS (
    SELECT id,
        photo_url, cv_url, transcript_url,
        id_card_copy_url, house_registration_url
    FROM public.job_applications
)
UPDATE public.job_applications j
SET
    photo_path = COALESCE(j.photo_path,
        substring(s.photo_url FROM '/storage/v1/object/(?:sign|public)/applicant-assets/([^?#]+)')),
    cv_path = COALESCE(j.cv_path,
        substring(s.cv_url FROM '/storage/v1/object/(?:sign|public)/applicant-assets/([^?#]+)')),
    transcript_path = COALESCE(j.transcript_path,
        substring(s.transcript_url FROM '/storage/v1/object/(?:sign|public)/applicant-assets/([^?#]+)')),
    id_card_copy_path = COALESCE(j.id_card_copy_path,
        substring(s.id_card_copy_url FROM '/storage/v1/object/(?:sign|public)/applicant-assets/([^?#]+)')),
    house_registration_path = COALESCE(j.house_registration_path,
        substring(s.house_registration_url FROM '/storage/v1/object/(?:sign|public)/applicant-assets/([^?#]+)'))
FROM src s
WHERE s.id = j.id
  AND (
       (j.photo_path IS NULL AND s.photo_url IS NOT NULL)
    OR (j.cv_path IS NULL AND s.cv_url IS NOT NULL)
    OR (j.transcript_path IS NULL AND s.transcript_url IS NOT NULL)
    OR (j.id_card_copy_path IS NULL AND s.id_card_copy_url IS NOT NULL)
    OR (j.house_registration_path IS NULL AND s.house_registration_url IS NOT NULL)
  );

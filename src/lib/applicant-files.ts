import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Applicant-asset URL plumbing.
 *
 * Bucket is private — every read path needs a fresh signed URL because
 * Supabase tokens have a 7-day TTL. We learned the hard way (testt
 * testy + สรยุทธ photos disappeared after a week, Mod hit it on
 * 3 May 2026).
 *
 * Canonical source of truth: the *_path columns on job_applications
 * (e.g. `photo_path` = `photo/{id}/photo-{epochMs}.jpg`). The legacy
 * *_url columns will be removed once nothing reads them; until then
 * `signApplicantAsset()` accepts EITHER a path OR a stored URL and
 * does the right thing.
 *
 * Always call this on every read (server-side, in the page/route),
 * never trust the URL from the DB.
 */

const BUCKET = 'applicant-assets'
const SIGN_SECONDS = 60 * 60 // 1 hour. Each page render re-signs, so
                             // the only way to get a stale URL is to
                             // leave a tab open past the hour mark.

/**
 * Generate a fresh signed URL from a canonical storage path.
 * Returns null when path is null/empty so callers can compose with
 * Promise.all without juggling undefineds.
 */
export async function signApplicantPath(
    path: string | null | undefined,
): Promise<string | null> {
    if (!path) return null
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(BUCKET)
            .createSignedUrl(path, SIGN_SECONDS)
        if (error) {
            console.warn('[applicant-files] sign failed for', path, error.message)
            return null
        }
        return data?.signedUrl ?? null
    } catch (err) {
        console.warn('[applicant-files] sign threw:', err)
        return null
    }
}

/**
 * Hybrid: prefer the path (canonical), fall back to extracting it
 * from a legacy *_url. Use this in read sites during the
 * path-migration rollout — once every job_application row has its
 * *_path columns populated and the upload route writes paths, we can
 * switch direct callers to `signApplicantPath()` and delete this.
 */
export async function signApplicantAsset(
    path: string | null | undefined,
    legacyUrl: string | null | undefined,
): Promise<string | null> {
    // Path wins — even if the legacy URL is still present, the path is
    // the version that won't 403 in a week.
    if (path) return signApplicantPath(path)
    if (!legacyUrl) return null
    const extracted = extractStoragePath(legacyUrl)
    return extracted ? signApplicantPath(extracted) : null
}

/**
 * Legacy: pre-path-column callers passed the stored URL straight in.
 * Same behaviour as the original implementation — extract the path
 * from the URL, re-sign, hand back. Kept around so any older site
 * we haven't migrated yet keeps rendering. Prefer signApplicantAsset
 * (or signApplicantPath when the path column is filled) for new code.
 *
 * @deprecated Use signApplicantAsset(path, legacyUrl) instead.
 */
export async function refreshSignedUrl(
    storedUrl: string | null | undefined,
): Promise<string | null> {
    if (!storedUrl) return null
    const path = extractStoragePath(storedUrl)
    if (!path) return storedUrl
    const signed = await signApplicantPath(path)
    return signed ?? storedUrl
}

/** Match `/storage/v1/object/(sign|public)/<bucket>/<path>[?...]` */
function extractStoragePath(url: string): string | null {
    const m = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?#]+)/)
    if (!m) return null
    if (m[1] !== BUCKET) return null
    try { return decodeURIComponent(m[2]) } catch { return m[2] }
}

import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * The storage URLs saved on job_applications.{photo,cv,transcript,
 * id_card_copy,house_registration}_url were signed at upload time
 * with a 7-day expiry. For the admin detail view, which is revisited
 * over weeks / months, re-sign them from the underlying path so they
 * don't 403. Works by parsing the path out of the stored URL.
 */
const BUCKET = 'applicant-assets'
const SIGN_SECONDS = 60 * 60 // 1 hour per spec

export async function refreshSignedUrl(
    storedUrl: string | null | undefined,
): Promise<string | null> {
    if (!storedUrl) return null
    const path = extractStoragePath(storedUrl)
    if (!path) return storedUrl // can't re-sign; hand back whatever we had
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(BUCKET)
            .createSignedUrl(path, SIGN_SECONDS)
        if (error) {
            console.warn('[applicant-files] re-sign failed for', path, error.message)
            return storedUrl
        }
        return data?.signedUrl ?? storedUrl
    } catch (err) {
        console.warn('[applicant-files] re-sign threw:', err)
        return storedUrl
    }
}

/** Match `/storage/v1/object/(sign|public)/<bucket>/<path>[?...]` */
function extractStoragePath(url: string): string | null {
    const m = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?#]+)/)
    if (!m) return null
    if (m[1] !== BUCKET) return null
    try { return decodeURIComponent(m[2]) } catch { return m[2] }
}

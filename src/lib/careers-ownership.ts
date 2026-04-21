import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Public endpoints don't have a session. Ownership is proven by the
 * pair (id, reference_code) returned on /start and preserved in the
 * apply URL. verifyOwnership returns the row on match, or null.
 */
export async function verifyOwnership(
    id: string,
    referenceCode: string,
): Promise<{ ok: boolean; status?: string; reason?: string }> {
    if (!id || !referenceCode) return { ok: false, reason: 'missing_credentials' }

    const { data, error } = await supabaseAdmin
        .from('job_applications')
        .select('id, reference_code, application_status')
        .eq('id', id)
        .maybeSingle()

    if (error) return { ok: false, reason: error.message }
    if (!data) return { ok: false, reason: 'not_found' }
    if (data.reference_code !== referenceCode) return { ok: false, reason: 'bad_reference' }

    return { ok: true, status: data.application_status as string }
}

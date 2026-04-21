import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { PriorityAlert } from '@/components/dashboard/priority-alerts'

/**
 * Fetch active priority alerts (emergency + urgent, max 5) for the
 * dashboard alert bar. Emergency always sorted above urgent.
 * Returns [] on any failure so layouts never crash.
 */
export async function fetchPriorityAlerts(): Promise<PriorityAlert[]> {
    try {
        const nowIso = new Date().toISOString()
        const { data } = await supabaseAdmin
            .from('announcements')
            .select('id, headline, content, priority, publish_date, expires_at, image_path')
            .in('priority', ['emergency', 'urgent'])
            .eq('publish_status', 'published')
            .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
            .order('publish_date', { ascending: false })
            .limit(10)

        const sorted = (data ?? []).slice().sort((a, b) => {
            if (a.priority === b.priority) {
                return String(b.publish_date ?? '').localeCompare(String(a.publish_date ?? ''))
            }
            return a.priority === 'emergency' ? -1 : 1
        })
        return sorted.slice(0, 5) as PriorityAlert[]
    } catch (err) {
        console.error('[fetchPriorityAlerts] failed:', err)
        return []
    }
}

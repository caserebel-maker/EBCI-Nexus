import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Map of creator id → display name.
 *
 * Tries employees.id first (new rows store session.employeeId), then
 * falls back to employees.user_id for any rows whose created_by is the
 * auth user id. Legacy rows store literals like "HR Admin" — those
 * never match and get passed through as the fallback display value.
 */
export async function resolveCreators(
    ids: Array<string | null | undefined>,
): Promise<Record<string, string>> {
    const unique = Array.from(new Set(ids.filter((x): x is string => !!x)))
    if (!unique.length) return {}

    const map: Record<string, string> = {}
    const format = (first?: string | null, last?: string | null, nick?: string | null) => {
        const name = `${first ?? ''} ${last ?? ''}`.trim()
        const suffix = nick ? ` (${nick})` : ''
        return (name + suffix).trim() || (nick ?? '')
    }

    try {
        const { data: byId } = await supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname')
            .in('id', unique)
        for (const e of byId ?? []) {
            map[e.id as string] = format(
                e.first_name_th as string | null,
                e.last_name_th as string | null,
                e.nickname as string | null,
            )
        }

        const remaining = unique.filter(id => !(id in map))
        if (remaining.length) {
            const { data: byUserId } = await supabaseAdmin
                .from('employees')
                .select('user_id, first_name_th, last_name_th, nickname')
                .in('user_id', remaining)
            for (const e of byUserId ?? []) {
                const userId = e.user_id as string | null
                if (!userId) continue
                map[userId] = format(
                    e.first_name_th as string | null,
                    e.last_name_th as string | null,
                    e.nickname as string | null,
                )
            }
        }
    } catch (err) {
        console.error('[resolveCreators] lookup failed:', err)
    }

    return map
}

/** Resolve a single raw created_by value to display text. */
export function displayCreator(
    rawCreatedBy: string | null | undefined,
    map: Record<string, string>,
): string {
    if (!rawCreatedBy) return 'ระบบ'
    return map[rawCreatedBy] ?? rawCreatedBy
}

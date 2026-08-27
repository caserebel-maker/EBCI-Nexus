import { redirect } from 'next/navigation'
import { getAuth, canManageSystem } from '@/lib/route-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PasswordRequestsClient, type PasswordRequestRow } from './password-requests-client'

export const dynamic = 'force-dynamic'

export default async function PasswordRequestsPage() {
    const auth = await getAuth()
    if (!auth) redirect('/login')
    if (!canManageSystem(auth)) redirect('/hradmin/dashboard')

    const { data: requests } = await supabaseAdmin
        .from('password_change_requests')
        .select('id,user_id,email,source,status,requested_at,reviewed_at,review_note,requested_ip,requested_user_agent')
        .order('requested_at', { ascending: false })
        .limit(100)
    const userIds = [...new Set((requests ?? []).map((row) => String(row.user_id)))]
    const { data: users } = userIds.length > 0
        ? await supabaseAdmin.from('User').select('id,name,username').in('id', userIds)
        : { data: [] }
    const nameById = new Map((users ?? []).map((user) => [String(user.id), String(user.name ?? user.username ?? 'ผู้ใช้งาน')]))

    const rows: PasswordRequestRow[] = (requests ?? []).map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        name: nameById.get(String(row.user_id)) ?? 'ผู้ใช้งาน',
        email: String(row.email),
        source: row.source === 'in_app' ? 'in_app' : 'forgot_password',
        status: row.status as PasswordRequestRow['status'],
        requestedAt: String(row.requested_at),
        reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
        reviewNote: row.review_note ? String(row.review_note) : null,
        requestedIp: (row as any).requested_ip ?? null,
        requestedUserAgent: (row as any).requested_user_agent ?? null,
    }))
    return <PasswordRequestsClient rows={rows} />
}

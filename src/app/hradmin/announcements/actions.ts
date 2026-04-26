'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { revalidatePath } from 'next/cache'

/**
 * Soft-ish delete: removes the announcement row entirely. Only HR Admin
 * may call this. Image assets in storage are left in place (cleanup is
 * handled by a separate GC job).
 */
export async function deleteAnnouncement(id: string): Promise<{ success: true } | { error: string }> {
    const auth = await getAuth()
    if (!auth || !isHrStaff(auth)) {
        return { error: 'ไม่มีสิทธิ์เข้าถึง — เฉพาะ HR เท่านั้น' }
    }
    if (!id) return { error: 'ไม่พบรหัสประกาศ' }

    const { error } = await supabaseAdmin
        .from('announcements')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('[deleteAnnouncement] failed:', error)
        return { error: error.message }
    }

    revalidatePath('/hradmin/announcements')
    revalidatePath('/portal/announcements')
    revalidatePath('/portal/dashboard')
    revalidatePath('/hradmin/dashboard')
    return { success: true }
}

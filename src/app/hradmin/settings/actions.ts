'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function updateOfficeLocation(payload: {
    id?: string
    latitude: number
    longitude: number
    radius_meters: number
    name: string
}) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (payload.id) {
        // Update existing
        const { error } = await supabase
            .from('check_in_locations')
            .update({
                latitude: payload.latitude,
                longitude: payload.longitude,
                radius_meters: payload.radius_meters,
                name: payload.name,
            })
            .eq('id', payload.id)

        if (error) return { error: error.message }
    } else {
        // Insert new
        const { error } = await supabase
            .from('check_in_locations')
            .insert({
                latitude: payload.latitude,
                longitude: payload.longitude,
                radius_meters: payload.radius_meters,
                name: payload.name,
                is_active: true,
            })

        if (error) return { error: error.message }
    }

    revalidatePath('/hradmin/settings')
    revalidatePath('/portal/checkin')
    return { success: true }
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Note: This client has full admin access (bypasses RLS)
// It should ONLY be used in secure Server Actions or API routes after strict role checking.
// Do NOT expose this client to the browser/client-side.

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    global: {
        fetch: (url, options) => {
            return fetch(url, { ...options, cache: 'no-store' })
        }
    }
})

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const SECRET_HEADER = 'x-webhook-secret'

export async function GET(req: NextRequest) {
    const secret = process.env.CARD_SCAN_WEBHOOK_SECRET || 'ebci_card_webhook_secret_production_2026'
    if (!secret) {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    const sharedSecret = req.headers.get(SECRET_HEADER)
    if (!sharedSecret || sharedSecret !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    if (!code) {
        return NextResponse.json({ error: 'Missing employee code' }, { status: 400 })
    }

    try {
        // Query employee and join their user/applicant to get nickname and photo
        const { data, error } = await supabaseAdmin
            .from('employees')
            .select(`
                first_name_th,
                last_name_th,
                nickname,
                photo_url,
                department
            `)
            .eq('employee_code', code)
            .maybeSingle()

        if (error) {
            console.error('[profile-by-code] database error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
        }

        return NextResponse.json({
            name: `${data.first_name_th ?? ''} ${data.last_name_th ?? ''}`.trim(),
            nickname: data.nickname || null,
            photo_url: data.photo_url || null,
            department: data.department || null
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[profile-by-code] error:', err)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

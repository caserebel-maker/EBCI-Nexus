'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'

export interface CardScanWithEmployee {
    id: string
    employee_code: string
    employee_id: string
    scan_time: string
    scan_type: string | null
    device_id: string | null
    raw_data: any
    created_at: string
    employee: {
        first_name_th: string
        last_name_th: string
        nickname: string | null
        department: string
        position: string
    } | null
}

export async function getCardScans(params: {
    search?: string
    startDate?: string
    endDate?: string
    scanType?: string
    page?: number
    limit?: number
}) {
    const search = params.search?.trim() ?? ''
    const startDate = params.startDate?.trim() ?? ''
    const endDate = params.endDate?.trim() ?? ''
    const scanType = params.scanType?.trim() ?? 'all'
    const page = params.page ?? 1
    const limit = params.limit ?? 50
    const offset = (page - 1) * limit

    try {
        let query = supabaseAdmin
            .from('card_scans')
            .select(`
                *,
                employee:employees(first_name_th, last_name_th, nickname, department, position)
            `, { count: 'exact' })

        // Apply date range filters
        if (startDate) {
            query = query.gte('scan_time', `${startDate}T00:00:00`)
        }
        if (endDate) {
            query = query.lte('scan_time', `${endDate}T23:59:59.999`)
        }
        if (scanType && scanType !== 'all') {
            if (scanType === 'null') {
                query = query.is('scan_type', null)
            } else {
                query = query.eq('scan_type', scanType)
            }
        }

        // Apply employee search filtering
        if (search) {
            const { data: emps, error: empErr } = await supabaseAdmin
                .from('employees')
                .select('id')
                .or(`first_name_th.ilike.%${search}%,last_name_th.ilike.%${search}%,nickname.ilike.%${search}%,employee_code.ilike.%${search}%`)

            if (empErr) {
                console.error('getCardScans search employees error:', empErr)
                return { success: false, error: empErr.message }
            }

            const empIds = (emps ?? []).map(e => e.id)
            if (empIds.length > 0) {
                query = query.in('employee_id', empIds)
            } else {
                return {
                    success: true,
                    scans: [],
                    totalCount: 0,
                    page,
                    totalPages: 0,
                    fetchedAt: new Date().toISOString()
                }
            }
        }

        // Execute query
        const { data, count, error } = await query
            .order('scan_time', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('getCardScans query error:', error)
            return { success: false, error: error.message }
        }

        const totalCount = count ?? 0
        const totalPages = Math.ceil(totalCount / limit)

        const formattedScans: CardScanWithEmployee[] = (data ?? []).map((s: any) => {
            const timePart = (s.scan_time?.split('T')[1] || '').trim()
            const isAfter1630 = timePart >= '16:30:00'
            const effectiveType = (s.scan_type === 'out' || isAfter1630) ? 'out' : (s.scan_type === 'in' ? 'in' : (isAfter1630 ? 'out' : 'in'))
            return {
                ...s,
                scan_type: effectiveType,
            }
        })

        return {
            success: true,
            scans: formattedScans,
            totalCount,
            page,
            totalPages,
            fetchedAt: new Date().toISOString()
        }
    } catch (err: any) {
        console.error('getCardScans error:', err)
        return { success: false, error: err.message ?? 'เกิดข้อผิดพลาดในการดึงข้อมูล' }
    }
}

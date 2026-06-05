import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { formatBangkokTime, todayBangkokKey } from '@/lib/datetime'
import { isWorkdaySaturday } from '@/lib/saturday-rules'

const WORK_LOCATION_LABELS: Record<string, string> = {
    johnson: 'จอห์นสัน',
    saraburi: 'ทำงานที่บ้าน (สระบุรี)',
}

const STATUS_LABELS: Record<string, string> = {
    matched: 'ตรงกัน',
    discrepancy: 'ต่างกัน',
    card_only: 'เฉพาะบัตร',
    mobile_only: 'เฉพาะมือถือ',
    on_leave: 'ลา',
    absent: 'ขาดเช็คอิน',
}

const SOURCE_LABELS: Record<string, string> = {
    card: 'แสกนบัตร',
    mobile: 'มือถือ',
}

function getDatesInRange(startStr: string, endStr: string): string[] {
    const dates: string[] = []
    const [sYr, sMon, sDay] = startStr.split('-').map(Number)
    const [eYr, eMon, eDay] = endStr.split('-').map(Number)
    
    const start = new Date(sYr, sMon - 1, sDay)
    const end = new Date(eYr, eMon - 1, eDay)
    
    const cur = new Date(start)
    while (cur <= end) {
        const y = cur.getFullYear()
        const m = String(cur.getMonth() + 1).padStart(2, '0')
        const d = String(cur.getDate()).padStart(2, '0')
        dates.push(`${y}-${m}-${d}`)
        cur.setDate(cur.getDate() + 1)
    }
    return dates
}

export async function GET(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)' }, { status: 400 })
    }

    try {
        // 1. Fetch active employees
        const { data: employees, error: empError } = await supabaseAdmin
            .from('employees')
            .select('id, employee_code, first_name_th, last_name_th, nickname, department, position, work_location')
            .eq('status', 'active')
            .neq('is_advisor', true)
            .order('employee_code', { ascending: true })

        if (empError) throw new Error(empError.message)

        // 2. Fetch attendance logs in range
        const { data: logs, error: logError } = await supabaseAdmin
            .from('attendance_logs')
            .select('*')
            .gte('date', `${from}T00:00:00`)
            .lte('date', `${to}T23:59:59.999`)

        if (logError) throw new Error(logError.message)

        // Group logs by date_employeeId
        const logMap = new Map<string, any>()
        for (const log of logs ?? []) {
            const datePart = log.date.split('T')[0]
            logMap.set(`${datePart}_${log.employee_id}`, log)
        }

        // 2b. Fetch checkins, card scans, and approved leave requests in the range for fallback
        const startOfDay = new Date(`${from}T00:00:00+07:00`)
        const endOfDay = new Date(`${to}T23:59:59.999+07:00`)

        const [checkinsResult, cardScansResult, leavesResult] = await Promise.all([
            supabaseAdmin
                .from('checkins')
                .select('*')
                .gte('checked_in_at', startOfDay.toISOString())
                .lte('checked_in_at', endOfDay.toISOString()),
            supabaseAdmin
                .from('card_scans')
                .select('id, employee_id, scan_time')
                .gte('scan_time', `${from}T00:00:00`)
                .lte('scan_time', `${to}T23:59:59.999`)
                .order('scan_time', { ascending: true }),
            supabaseAdmin
                .from('leave_requests')
                .select('employee_id, leave_type_id, start_date, end_date, is_half_day, half_day_period')
                .eq('status', 'approved')
                .lte('start_date', to)
                .gte('end_date', from),
        ])

        // Parse leaves into name names map
        const leaves = leavesResult.data ?? []
        const leaveTypeIds = Array.from(new Set(leaves.map(l => l.leave_type_id)))
        const { data: leaveTypes } = leaveTypeIds.length
            ? await supabaseAdmin.from('leave_types').select('id, name_th').in('id', leaveTypeIds)
            : { data: [] }
        const leaveTypeNames = new Map((leaveTypes ?? []).map(t => [t.id, t.name_th ?? 'ลา']))

        const leaveMap = new Map<string, { typeName: string; isHalfDay: boolean; halfDayPeriod: string | null }>()
        for (const l of leaves) {
            const start = new Date(l.start_date)
            const end = new Date(l.end_date)
            const cur = new Date(start)
            while (cur <= end) {
                const y = cur.getFullYear()
                const m = String(cur.getMonth() + 1).padStart(2, '0')
                const d = String(cur.getDate()).padStart(2, '0')
                const dateStr = `${y}-${m}-${d}`
                leaveMap.set(`${dateStr}_${l.employee_id}`, {
                    typeName: leaveTypeNames.get(l.leave_type_id) ?? 'ลา',
                    isHalfDay: Boolean(l.is_half_day),
                    halfDayPeriod: l.half_day_period ? String(l.half_day_period) : null,
                })
                cur.setDate(cur.getDate() + 1)
            }
        }

        // Group checkins by date and employee
        const checkinMap = new Map<string, any[]>()
        for (const c of checkinsResult.data ?? []) {
            const datePart = new Date(new Date(c.checked_in_at).getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0]
            const key = `${datePart}_${c.employee_id}`
            if (!checkinMap.has(key)) checkinMap.set(key, [])
            checkinMap.get(key)!.push(c)
        }

        // Group scans by date and employee
        const scanMap = new Map<string, any[]>()
        for (const s of cardScansResult.data ?? []) {
            const datePart = s.scan_time.split('T')[0]
            const key = `${datePart}_${s.employee_id}`
            if (!scanMap.has(key)) scanMap.set(key, [])
            scanMap.get(key)!.push(s)
        }

        // 3. Generate date sequence in range
        const dateRange = getDatesInRange(from, to)

        // 4. Construct CSV rows
        const headers = [
            'วันที่',
            'รหัสพนักงาน',
            'ชื่อ-นามสกุล',
            'ชื่อเล่น',
            'แผนก',
            'ตำแหน่ง',
            'สถานที่ทำงานหลัก',
            'เวลาเข้างาน',
            'เวลาออกงาน',
            'สถานะการเช็คอิน',
            'แหล่งข้อมูล',
        ]

        const csvRows = [headers.map(h => `"${h}"`).join(',')]

        for (const dateStr of dateRange) {
            const [yr, mon, day] = dateStr.split('-').map(Number)
            const dObj = new Date(yr, mon - 1, day)
            const isWeekend = dObj.getDay() === 0 || (dObj.getDay() === 6 && !isWorkdaySaturday(dateStr))
            const formattedDateTh = dObj.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })

            for (const emp of employees ?? []) {
                const log = logMap.get(`${dateStr}_${emp.id}`)
                
                const fullName = `${emp.first_name_th ?? ''} ${emp.last_name_th ?? ''}`.trim()
                const workLoc = emp.work_location ? WORK_LOCATION_LABELS[emp.work_location] ?? emp.work_location : 'สำนักงาน EBCI (ปกติ)'
                
                let clockIn = '—'
                let clockOut = '—'
                let statusLabel = isWeekend ? 'วันหยุด' : 'ยังไม่เช็คอิน'
                let sourceLabel = '—'

                if (log) {
                    const inSource = log.card_scan_time ? 'bangkok' : 'utc'
                    const outSource = log.card_checkout_time ? 'bangkok' : 'utc'
                    clockIn = formatBangkokTime(log.official_clock_in, inSource)
                    clockOut = formatBangkokTime(log.official_clock_out, outSource)
                    statusLabel = STATUS_LABELS[log.reconciliation_status] ?? log.reconciliation_status
                    sourceLabel = SOURCE_LABELS[log.source] ?? log.source ?? '—'
                } else {
                    const key = `${dateStr}_${emp.id}`
                    const dayCheckins = checkinMap.get(key) ?? []
                    const dayScans = scanMap.get(key) ?? []
                    const dayLeave = leaveMap.get(key)

                    let earliestMobile: any = null
                    let latestMobileCheckout: string | null = null
                    for (const c of dayCheckins) {
                        if (c.source === 'card') continue
                        if (!earliestMobile || new Date(c.checked_in_at) < new Date(earliestMobile.checked_in_at)) {
                            earliestMobile = c
                        }
                        if (c.checked_out_at) {
                            if (!latestMobileCheckout || new Date(c.checked_out_at) > new Date(latestMobileCheckout)) {
                                latestMobileCheckout = c.checked_out_at
                            }
                        }
                    }

                    const earliestCardScan = dayScans.length > 0 ? dayScans[0].scan_time : null
                    const latestCardScan = dayScans.length > 1 ? dayScans[dayScans.length - 1].scan_time : null

                    if (earliestCardScan || earliestMobile) {
                        if (earliestCardScan && earliestMobile) {
                            const cardTime = new Date(earliestCardScan.replace(' ', 'T') + '+07:00')
                            const mobTime = new Date(earliestMobile.checked_in_at)
                            if (cardTime < mobTime) {
                                clockIn = formatBangkokTime(`${earliestCardScan}+07:00`)
                                sourceLabel = 'แสกนบัตร'
                            } else {
                                clockIn = formatBangkokTime(earliestMobile.checked_in_at)
                                sourceLabel = 'มือถือ'
                            }
                            statusLabel = 'ตรงกัน'
                        } else if (earliestCardScan) {
                            clockIn = formatBangkokTime(`${earliestCardScan}+07:00`)
                            sourceLabel = 'แสกนบัตร'
                            statusLabel = 'เฉพาะบัตร'
                        } else {
                            clockIn = formatBangkokTime(earliestMobile.checked_in_at)
                            sourceLabel = 'มือถือ'
                            statusLabel = 'เฉพาะมือถือ'
                        }

                        let finalCheckout: string | null = null
                        if (latestCardScan && latestMobileCheckout) {
                            const cardTime = new Date(latestCardScan.replace(' ', 'T') + '+07:00')
                            const mobTime = new Date(latestMobileCheckout)
                            finalCheckout = cardTime > mobTime ? `${latestCardScan}+07:00` : latestMobileCheckout
                        } else if (latestCardScan) {
                            finalCheckout = `${latestCardScan}+07:00`
                        } else if (latestMobileCheckout) {
                            finalCheckout = latestMobileCheckout
                        }
                        if (finalCheckout) {
                            clockOut = formatBangkokTime(finalCheckout)
                        }
                    } else if (dayLeave) {
                        statusLabel = dayLeave.isHalfDay 
                            ? `ลาครึ่งวัน (${dayLeave.halfDayPeriod === 'morning' ? 'เช้า' : 'บ่าย'})`
                            : dayLeave.typeName
                    } else if (isWeekend) {
                        statusLabel = 'วันหยุด'
                    } else {
                        const todayStr = todayBangkokKey()
                        if (dateStr < todayStr) {
                            statusLabel = 'ขาดเช็คอิน'
                        } else {
                            statusLabel = 'ยังไม่เช็คอิน'
                        }
                    }
                }

                const columns = [
                    formattedDateTh,
                    emp.employee_code ?? '—',
                    fullName || '—',
                    emp.nickname ?? '—',
                    emp.department ?? '—',
                    emp.position ?? '—',
                    workLoc,
                    clockIn,
                    clockOut,
                    statusLabel,
                    sourceLabel,
                ]

                csvRows.push(columns.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
            }
        }

        // Return CSV with UTF-8 BOM for Thai Excel compatibility
        const csvContent = '\uFEFF' + csvRows.join('\n')
        const filename = `attendance_report_${from}_to_${to}.csv`

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })

    } catch (err: any) {
        console.error('Attendance export error:', err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' }, { status: 500 })
    }
}

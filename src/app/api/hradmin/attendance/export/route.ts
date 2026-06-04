import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuth, isHrStaff } from '@/lib/route-auth'
import { formatBangkokTime } from '@/lib/datetime'

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
            const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6
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

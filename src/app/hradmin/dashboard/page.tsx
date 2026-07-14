import { supabaseAdmin } from '@/lib/supabase-admin'
import { HRDashboard } from './hr-dashboard'
import { getCurrentPermissions } from '@/lib/permissions-server'

export const dynamic = 'force-dynamic'

function startOf(date: Date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
}
function endOf(date: Date) {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
}

export default async function AdminDashboard() {
    const now = new Date()
    const todayStart = startOf(now).toISOString()
    const todayEnd = endOf(now).toISOString()
    const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const yearStart = `${year}-01-01`
    const nextYearStart = `${year + 1}-01-01`

    // 12 months ago for leave stats
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    // 30 days ago for weekly attendance
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
        permissions,
        { data: employees },
        { data: leavesToday },
        { data: leavesPending },
        { data: contractsExpiring },
        { data: leaveHistory },
        { data: pendingLeaves },
        { data: announcements },
        { data: newsAnnouncements },
    ] = await Promise.all([
        getCurrentPermissions(),
        // All employees (include date_of_birth for birthday section)
        supabaseAdmin.from('employees').select('id, employee_code, first_name_th, last_name_th, nickname, department, start_date, status, end_date, title, date_of_birth, is_advisor, photo_url'),

        // Leaves today (approved)
        supabaseAdmin.from('leave_requests')
            .select('id, employee_id, leave_type:leave_type_id')
            .eq('status', 'approved')
            .lte('start_date', todayEnd)
            .gte('end_date', todayStart),

        // Pending leaves count
        supabaseAdmin.from('leave_requests')
            .select('id')
            .in('status', ['pending', 'cancellation_requested'])
            .gte('start_date', yearStart)
            .lt('start_date', nextYearStart),

        // Contracts expiring in 30 days
        supabaseAdmin.from('employees')
            .select('id, first_name_th, last_name_th, nickname, position, department, end_date')
            .gte('end_date', now.toISOString())
            .lte('end_date', in30days)
            .eq('status', 'active'),

        // Leave history 12 months for chart
        supabaseAdmin.from('leave_requests')
            .select('leave_type:leave_type_id, start_date, status')
            .gte('start_date', twelveMonthsAgo.toISOString())
            .eq('status', 'approved'),

        // Pending leaves detail (5 latest)
        supabaseAdmin.from('leave_requests')
            .select('id, employee_id, leave_type:leave_type_id, start_date, end_date, total_days, reason, status, created_at')
            .in('status', ['pending', 'cancellation_requested'])
            .gte('start_date', yearStart)
            .lt('start_date', nextYearStart)
            .order('created_at', { ascending: false })
            .limit(5),

        // Announcements for urgent banners
        supabaseAdmin.from('announcements').select('*')
            .in('priority', ['urgent', 'emergency']).eq('publishStatus', 'published')
            .order('publish_date', { ascending: false }).limit(10),

        // Latest news announcements for right-column section
        supabaseAdmin.from('announcements').select('id, headline, publish_date, priority, content, image_path')
            .eq('publishStatus', 'published')
            .order('publish_date', { ascending: false }).limit(5),
    ])

    // ─── Generate signed URLs for announcement images ───
    const newsWithImages = await Promise.all(
        (newsAnnouncements ?? []).map(async (a: any) => {
            if (!a.image_path) return a
            const { data } = await supabaseAdmin.storage
                .from('announcement-images')
                .createSignedUrl(a.image_path, 3600)
            return { ...a, image_url: data?.signedUrl ?? null }
        })
    )

    // ─── Build dept distribution for donut chart ───
    // Active employees only — the donut answers "ตอนนี้ใครอยู่แผนกไหน",
    // so counting people who have already left would inflate departments
    // that had high turnover. Matches the headline metric card which now
    // also uses the active count as its main number.
    const deptMap: Record<string, {
        value: number
        employees: Array<{
            id: string
            employee_code: string | null
            first_name_th: string | null
            last_name_th: string | null
            nickname: string | null
            title: string | null
            start_date: string | null
        }>
    }> = {}
    for (const e of employees ?? []) {
        if (!e.department) continue
        if (e.status !== 'active' || e.is_advisor) continue
        if (!deptMap[e.department]) deptMap[e.department] = { value: 0, employees: [] }
        deptMap[e.department].value += 1
        deptMap[e.department].employees.push({
            id: e.id,
            employee_code: e.employee_code,
            first_name_th: e.first_name_th,
            last_name_th: e.last_name_th,
            nickname: e.nickname,
            title: e.title,
            start_date: e.start_date,
        })
    }
    const deptData = Object.entries(deptMap)
        .sort((a, b) => b[1].value - a[1].value)
        .map(([name, data]) => ({
            name,
            value: data.value,
            employees: data.employees.sort((a, b) => {
                const codeA = a.employee_code ?? ''
                const codeB = b.employee_code ?? ''
                return codeA.localeCompare(codeB, 'th') || `${a.first_name_th ?? ''}${a.last_name_th ?? ''}`.localeCompare(`${b.first_name_th ?? ''}${b.last_name_th ?? ''}`, 'th')
            }),
        }))

    // ─── Build monthly leave bar chart ───
    const monthlyLeave: Record<string, Record<string, number>> = {}
    const leaveTypes = ['sick', 'personal', 'annual', 'maternity', 'ordination']
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now)
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthlyLeave[key] = { sick: 0, personal: 0, annual: 0, maternity: 0, ordination: 0 }
    }
    for (const lr of leaveHistory ?? []) {
        const d = new Date(lr.start_date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (monthlyLeave[key] && leaveTypes.includes(lr.leave_type)) {
            monthlyLeave[key][lr.leave_type] = (monthlyLeave[key][lr.leave_type] ?? 0) + 1
        }
    }
    const leaveChartData = Object.entries(monthlyLeave).map(([month, counts]) => {
        const [y, m] = month.split('-')
        const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('th-TH', { month: 'short' })
        return { month: label, ...counts }
    })

    // ─── Weekly attendance line chart (30 days) ───
    const weeklyMap: Record<string, { present: number; absent: number; week: string }> = {}
    const totalActiveEmployees = (employees ?? []).filter(e => e.status === 'active' && !e.is_advisor).length
    for (let i = 0; i < 5; i++) {
        const weekStart = new Date(thirtyDaysAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000)
        const key = `สัปดาห์ที่ ${i + 1}`
        weeklyMap[key] = { week: key, present: totalActiveEmployees, absent: 0 }
    }
    // count approved leaves per week to estimate absences
    for (const lr of leaveHistory ?? []) {
        const d = new Date(lr.start_date)
        const diff = Math.floor((d.getTime() - thirtyDaysAgo.getTime()) / (7 * 24 * 60 * 60 * 1000))
        if (diff >= 0 && diff < 5) {
            const key = `สัปดาห์ที่ ${diff + 1}`
            if (weeklyMap[key]) {
                weeklyMap[key].absent += 1
                weeklyMap[key].present = Math.max(0, totalActiveEmployees - weeklyMap[key].absent)
            }
        }
    }
    const attendanceData = Object.values(weeklyMap)

    // ─── Work anniversaries this month ───
    const anniversaries = (employees ?? []).filter(e => {
        if (e.status !== 'active' || e.is_advisor) return false
        if (!e.start_date) return false
        const start = new Date(e.start_date)
        return start.getMonth() + 1 === month && start.getDate() >= now.getDate()
    }).map(e => ({
        ...e,
        years: year - new Date(e.start_date!).getFullYear()
    })).filter(e => e.years > 0).sort((a, b) => {
        const da = new Date(a.start_date!).getDate()
        const db = new Date(b.start_date!).getDate()
        return da - db
    })

    // ─── Birthdays this month ───
    const birthdays = (employees ?? [])
        .filter(e => {
            if (!e.date_of_birth) return false
            const dob = new Date(e.date_of_birth)
            return dob.getMonth() + 1 === month
        })
        .map(e => {
            const dob = new Date(e.date_of_birth!)
            return {
                ...e,
                age: year - dob.getFullYear(),
                dobDay: dob.getDate(),
                dobMonth: dob.getMonth() + 1,
            }
        })
        .sort((a, b) => a.dobDay - b.dobDay)

    // ─── Enrich pending leaves with employee names ───
    const empMap = Object.fromEntries((employees ?? []).map(e => [e.id, e]))
    const pendingEnriched = (pendingLeaves ?? []).map(lr => ({
        ...lr,
        employee: empMap[lr.employee_id] ?? null,
    }))

    const leavesTodayEnriched = (leavesToday ?? []).map(lr => ({
        ...lr,
        employees: empMap[lr.employee_id] ?? null,
    }))

    // ─── Week calendar (Mon–Sun this week) ───
    const monday = new Date(now)
    const day = monday.getDay()
    monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(d.getDate() + i)
        return d
    })

    // HIP card scans use Bangkok wall-clock timestamps, while mobile
    // checkins use UTC. Read both sources so the live dashboard reflects
    // employees who physically tapped their card without waiting for the
    // attendance reconciliation batch.
    const bangkokDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now)
    const mobileDayStart = new Date(`${bangkokDate}T00:00:00+07:00`).toISOString()
    const mobileDayEnd = new Date(`${bangkokDate}T23:59:59.999+07:00`).toISOString()
    const [todayCheckinsResult, todayCardScansResult] = await Promise.all([
        supabaseAdmin
            .from('checkins')
            .select('employee_id, type, checked_in_at')
            .gte('checked_in_at', mobileDayStart)
            .lte('checked_in_at', mobileDayEnd)
            .order('checked_in_at', { ascending: true }),
        supabaseAdmin
            .from('card_scans')
            .select('employee_id')
            .gte('scan_time', `${bangkokDate}T00:00:00`)
            .lte('scan_time', `${bangkokDate}T23:59:59.999`),
    ])

    const activeEmployeeIds = new Set(
        (employees ?? []).filter(e => e.status === 'active' && !e.is_advisor).map(e => e.id),
    )
    const checkinMap = new Map<string, string>()
    for (const c of todayCheckinsResult.data ?? []) {
        if (activeEmployeeIds.has(c.employee_id)) {
            checkinMap.set(c.employee_id, c.type as string)
        }
    }
    const officeEmployeeIds = new Set(
        (todayCardScansResult.data ?? [])
            .map(scan => scan.employee_id)
            .filter(employeeId => activeEmployeeIds.has(employeeId)),
    )
    for (const [employeeId, type] of checkinMap) {
        if (type === 'office') officeEmployeeIds.add(employeeId)
    }
    const wfhEmployeeIds = new Set(
        Array.from(checkinMap)
            .filter(([employeeId, type]) => type === 'wfh' && !officeEmployeeIds.has(employeeId))
            .map(([employeeId]) => employeeId),
    )
    const checkedInEmployeeIds = new Set([
        ...officeEmployeeIds,
        ...checkinMap.keys(),
    ])
    const attendanceStats = {
        officeCount: officeEmployeeIds.size,
        wfhCount: wfhEmployeeIds.size,
        checkedInCount: checkedInEmployeeIds.size,
        totalActive: activeEmployeeIds.size,
    }

    return (
        <HRDashboard
            metrics={{
                totalEmployees: (employees ?? []).filter(e => !e.is_advisor).length,
                activeEmployees: (employees ?? []).filter(e => e.status === 'active' && !e.is_advisor).length,
                leavingToday: (leavesToday ?? []).length,
                pendingLeaves: (leavesPending ?? []).length,
                expiringContracts: (contractsExpiring ?? []).length,
            }}
            attendanceStats={attendanceStats}
            leaveChartData={leaveChartData}
            deptData={deptData}
            attendanceData={attendanceData}
            pendingLeaves={pendingEnriched}
            contractsExpiring={contractsExpiring ?? []}
            anniversaries={anniversaries}
            weekDays={weekDays.map(d => d.toISOString())}
            leavesToday={leavesTodayEnriched}
            urgentBanners={announcements ?? []}
            newsAnnouncements={newsWithImages}
            birthdays={birthdays}
            canViewAttendanceInsights={permissions.can_view_attendance_insights}
        />
    )
}

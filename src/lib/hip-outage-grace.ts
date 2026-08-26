const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const HIP_OUTAGE_GRACE_START = '2026-08-20'
export const HIP_OUTAGE_GRACE_CHECKIN_TIME = '07:45'
export const HIP_OUTAGE_GRACE_NOTE =
    'ช่วงคอม/เครื่อง HIP แตะบัตรมีปัญหา บริษัทจึงยกประโยชน์เรื่องเช็คอินและมาสายให้พนักงาน โดยนับเวลาเข้าอัตโนมัติ 07:45 เมื่อไม่มีข้อมูลเช็คอินจริง'

export function getHipOutageGraceEnd(): string | null {
    const value = process.env.HIP_OUTAGE_GRACE_END?.trim()
    return value && DATE_KEY_PATTERN.test(value) ? value : null
}

export function isHipOutageGraceDate(dateKey: string) {
    if (!DATE_KEY_PATTERN.test(dateKey)) return false
    const end = getHipOutageGraceEnd()
    return dateKey >= HIP_OUTAGE_GRACE_START && (!end || dateKey <= end)
}

export function shouldApplyHipOutageGrace(params: {
    dateKey: string
    isWorkday: boolean
    hasAttendance: boolean
    hasApprovedLeave: boolean
    hasApprovedWfh: boolean
    isCompanyWfh: boolean
}) {
    return (
        isHipOutageGraceDate(params.dateKey)
        && params.isWorkday
        && !params.hasAttendance
        && !params.hasApprovedLeave
        && !params.hasApprovedWfh
        && !params.isCompanyWfh
    )
}

export function dateKeysInclusive(from: string, to: string) {
    if (!DATE_KEY_PATTERN.test(from) || !DATE_KEY_PATTERN.test(to) || from > to) return []
    const dates: string[] = []
    const [fy, fm, fd] = from.split('-').map(Number)
    const [ty, tm, td] = to.split('-').map(Number)
    const cur = new Date(Date.UTC(fy, fm - 1, fd))
    const end = new Date(Date.UTC(ty, tm - 1, td))

    while (cur <= end) {
        dates.push(
            `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`,
        )
        cur.setUTCDate(cur.getUTCDate() + 1)
    }

    return dates
}

export function getHipOutageGraceDates(from: string, to: string) {
    return dateKeysInclusive(from, to).filter(isHipOutageGraceDate)
}

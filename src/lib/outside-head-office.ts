export const OUTSIDE_HEAD_OFFICE_CHECKIN_TYPE = 'outside_head_office' as const

export const OUTSIDE_HEAD_OFFICE_EMPLOYEES = [
    {
        employeeCode: '021-42',
        name: 'ศุภดล แสนทวีสุข',
        department: 'ฝ่ายประสานงานเอกสาร-ส่งออก',
        remark: 'Sign Contract',
    },
    {
        employeeCode: '161-51',
        name: 'ราเชนทร์ เข้มกลม',
        department: 'ฝ่ายประสานงานเอกสาร-ส่งออก',
        remark: 'ปฏิบัติงานนอกสถานที่',
    },
    {
        employeeCode: '344-57',
        name: 'ยวนใจ บุตรสำราญ',
        department: 'ฝ่ายประสานงานเอกสาร-ส่งออก',
        remark: 'Sign Contract',
    },
    {
        employeeCode: '445-62',
        name: 'สุกัญญา โคตรสาลี',
        department: 'ฝ่ายประสานงานเอกสาร-ส่งออก',
        remark: 'Sign Contract',
    },
    {
        employeeCode: '009-35',
        name: 'ชรินทร์ทิพย์ ชมชูเวช',
        department: 'ฝ่ายประสานงานเอกสาร-นำเข้า',
        remark: 'ปฏิบัติงานนอกสถานที่',
    },
    {
        employeeCode: '042-45',
        name: 'อุพาพร ลลิตวิภาส',
        department: 'ฝ่ายประสานงานเอกสาร-นำเข้า',
        remark: 'Sign Contract',
    },
    {
        employeeCode: '148-51',
        name: 'อินดา ศรีรักษา',
        department: 'ฝ่ายประสานงานเอกสาร-นำเข้า',
        remark: 'Sign Contract',
    },
    {
        employeeCode: '492-67',
        name: 'ณัฐธิกา ปักคำมา',
        department: 'ฝ่ายประสานงานเอกสาร-นำเข้า',
        remark: 'Sign Contract',
    },
    {
        employeeCode: '999-69',
        name: 'อนุทวย คงควรคอย',
        department: 'ฝ่ายทรัพยากรบุคคลและธุรการ',
        remark: 'บัญชีทดสอบสิทธิ์นอก Head Office',
    },
] as const

const OUTSIDE_HEAD_OFFICE_EMPLOYEE_CODES = new Set<string>(
    OUTSIDE_HEAD_OFFICE_EMPLOYEES.map((employee) => employee.employeeCode),
)

const OUTSIDE_HEAD_OFFICE_WORK_LOCATIONS = new Set([
    'outside_head_office',
    'outside-head-office',
    'remote_office',
])

export function isOutsideHeadOfficeEmployee(input: {
    employee_code?: string | null
    work_location?: string | null
} | null | undefined) {
    const employeeCode = input?.employee_code?.trim()
    const workLocation = input?.work_location?.trim()

    return (
        (!!employeeCode && OUTSIDE_HEAD_OFFICE_EMPLOYEE_CODES.has(employeeCode)) ||
        (!!workLocation && OUTSIDE_HEAD_OFFICE_WORK_LOCATIONS.has(workLocation))
    )
}

export function getCheckinTypeLabel(type: string) {
    if (type === 'office') return 'ออฟฟิศ'
    if (type === 'wfh') return 'WFH'
    if (type === 'field') return 'ภาคสนาม'
    if (type === OUTSIDE_HEAD_OFFICE_CHECKIN_TYPE) return 'นอก Head Office'
    return type
}

export function getCheckinTypeDisplay(type: string) {
    if (type === 'office') return '🏢 ออฟฟิศ'
    if (type === 'wfh') return '🏠 WFH'
    if (type === 'field') return '🚛 ภาคสนาม'
    if (type === OUTSIDE_HEAD_OFFICE_CHECKIN_TYPE) return '📍 นอก Head Office'
    return type
}

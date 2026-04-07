import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const LEAVE_TYPE_LABELS: Record<string, string> = {
    sick: 'ลาป่วย',
    personal: 'ลากิจ',
    annual: 'ลาพักร้อน',
    maternity: 'ลาคลอด',
    ordination: 'ลาบวช',
}

const STATUS_LABELS: Record<string, string> = {
    pending: 'รออนุมัติ',
    approved: 'อนุมัติ',
    rejected: 'ปฏิเสธ',
    cancelled: 'ยกเลิก',
}

function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
}

// GET /api/leave/export — export leave data as CSV (HR admin only)
export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'hr_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
    const department = searchParams.get('department')
    const leaveType = searchParams.get('leaveType')
    const status = searchParams.get('status')

    const startFilter = month
        ? new Date(`${year}-${String(month).padStart(2, '0')}-01`)
        : new Date(`${year}-01-01`)
    const endFilter = month ? new Date(year, month, 1) : new Date(`${year + 1}-01-01`)

    try {
        const requests = await prisma.leaveRequest.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(leaveType ? { leaveType } : {}),
                startDate: { gte: startFilter, lt: endFilter },
                ...(department ? { employee: { department } } : {}),
            },
            include: {
                employee: {
                    select: {
                        employeeCode: true,
                        firstNameTH: true,
                        lastNameTH: true,
                        department: true,
                        position: true,
                    },
                },
                approver: { select: { name: true } },
            },
            orderBy: [{ employee: { department: 'asc' } }, { startDate: 'asc' }],
        })

        // Build CSV
        const headers = [
            'รหัสพนักงาน',
            'ชื่อ-นามสกุล',
            'แผนก',
            'ตำแหน่ง',
            'ประเภทการลา',
            'วันที่เริ่ม',
            'วันที่สิ้นสุด',
            'จำนวนวัน',
            'เหตุผล',
            'สถานะ',
            'ผู้อนุมัติ',
            'วันที่อนุมัติ',
            'เหตุผลที่ปฏิเสธ',
        ]

        const rows = requests.map(r => [
            r.employee.employeeCode,
            `${r.employee.firstNameTH} ${r.employee.lastNameTH}`,
            r.employee.department,
            r.employee.position,
            LEAVE_TYPE_LABELS[r.leaveType] || r.leaveType,
            formatDate(r.startDate),
            formatDate(r.endDate),
            r.totalDays.toString(),
            `"${r.reason.replace(/"/g, '""')}"`,
            STATUS_LABELS[r.status] || r.status,
            r.approver?.name || '',
            r.approvedAt ? formatDate(r.approvedAt) : '',
            r.rejectionReason ? `"${r.rejectionReason.replace(/"/g, '""')}"` : '',
        ])

        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(',')),
        ].join('\n')

        const bom = '\uFEFF' // UTF-8 BOM for Thai characters in Excel
        return new NextResponse(bom + csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="leave_report_${year}${month ? `_${month}` : ''}.csv"`,
            },
        })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}

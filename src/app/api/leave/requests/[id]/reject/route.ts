import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendLeaveDecisionNotification } from '@/lib/leave-email'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession()
    if (!session || (session.role !== 'hr_admin' && session.role !== 'manager')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    try {
        const body = await req.json()
        const { rejectionReason } = body

        if (!rejectionReason?.trim()) {
            return NextResponse.json({ error: 'กรุณาระบุเหตุผลที่ปฏิเสธ' }, { status: 400 })
        }

        const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id },
            include: { employee: true },
        })

        if (!leaveRequest) {
            return NextResponse.json({ error: 'ไม่พบใบลา' }, { status: 404 })
        }
        if (leaveRequest.status !== 'pending') {
            return NextResponse.json({ error: 'ใบลานี้ได้รับการพิจารณาแล้ว' }, { status: 400 })
        }

        // For manager role: only allow rejecting subordinates' leaves
        if (session.role === 'manager') {
            const managerEmployee = await prisma.employee.findFirst({
                where: { userId: session.id },
            })
            if (!managerEmployee || leaveRequest.employee.managerId !== managerEmployee.id) {
                return NextResponse.json({ error: 'ไม่มีสิทธิ์ปฏิเสธใบลานี้' }, { status: 403 })
            }
        }

        const updated = await prisma.leaveRequest.update({
            where: { id },
            data: {
                status: 'rejected',
                approvedBy: session.id,
                approvedAt: new Date(),
                rejectionReason: rejectionReason.trim(),
            },
        })

        // Notify employee
        await sendLeaveDecisionNotification({
            employeeEmail: leaveRequest.employee.email,
            employeeName: `${leaveRequest.employee.firstNameTH} ${leaveRequest.employee.lastNameTH}`,
            leaveType: leaveRequest.leaveType,
            startDate: leaveRequest.startDate,
            endDate: leaveRequest.endDate,
            totalDays: leaveRequest.totalDays,
            status: 'rejected',
            rejectionReason: rejectionReason.trim(),
            approverName: session.name || 'ผู้อนุมัติ',
        }).catch(console.error)

        return NextResponse.json({ data: updated })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}

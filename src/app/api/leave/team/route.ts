import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET /api/leave/team — get all leave requests for the manager's subordinates
export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session || (session.role !== 'manager' && session.role !== 'hr_admin')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()

    try {
        let subordinateIds: string[] = []

        if (session.role === 'manager') {
            const managerEmployee = await prisma.employee.findFirst({
                where: { userId: session.id },
                include: { subordinates: { select: { id: true } } },
            })
            if (!managerEmployee) return NextResponse.json({ error: 'ไม่พบข้อมูลหัวหน้า' }, { status: 404 })
            subordinateIds = managerEmployee.subordinates.map(s => s.id)
        }

        const requests = await prisma.leaveRequest.findMany({
            where: {
                ...(session.role === 'manager' ? { employeeId: { in: subordinateIds } } : {}),
                ...(status ? { status } : {}),
                startDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        employeeCode: true,
                        firstNameTH: true,
                        lastNameTH: true,
                        department: true,
                        position: true,
                        email: true,
                        workLocation: true,
                    },
                },
                approver: { select: { name: true } },
            },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        })

        return NextResponse.json({ data: requests })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}

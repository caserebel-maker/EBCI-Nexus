import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendLeaveRequestNotification } from '@/lib/leave-email'

const VALID_LEAVE_TYPES = ['sick', 'personal', 'annual', 'maternity', 'ordination']

// Calculate working days between two dates (excluding weekends)
function calcWorkingDays(start: Date, end: Date): number {
    let count = 0
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(0, 0, 0, 0)
    while (cur <= endDay) {
        const dow = cur.getDay()
        if (dow !== 0 && dow !== 6) count++
        cur.setDate(cur.getDate() + 1)
    }
    return count
}

// GET /api/leave/requests — list leave requests for the current user
export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()

    try {
        // Employees and managers can only see their own leave unless they're HR
        if (session.role === 'employee' || session.role === 'manager') {
            const employee = await prisma.employee.findFirst({
                where: { userId: session.id },
            })
            if (!employee) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 404 })

            const requests = await prisma.leaveRequest.findMany({
                where: {
                    employeeId: employee.id,
                    ...(status ? { status } : {}),
                    startDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
                },
                include: {
                    approver: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            })
            return NextResponse.json({ data: requests })
        }

        // HR Admin — see all with optional filters
        const department = searchParams.get('department')
        const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
        const leaveType = searchParams.get('leaveType')
        const employeeId = searchParams.get('employeeId')

        const startFilter = month
            ? new Date(`${year}-${String(month).padStart(2, '0')}-01`)
            : new Date(`${year}-01-01`)
        const endFilter = month
            ? new Date(year, month, 1)
            : new Date(`${year + 1}-01-01`)

        const requests = await prisma.leaveRequest.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(leaveType ? { leaveType } : {}),
                ...(employeeId ? { employeeId } : {}),
                startDate: { gte: startFilter, lt: endFilter },
                ...(department
                    ? { employee: { department } }
                    : {}),
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
                    },
                },
                approver: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json({ data: requests })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}

// POST /api/leave/requests — create a new leave request
export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { leaveType, startDate, endDate, reason } = body

        if (!leaveType || !startDate || !endDate || !reason) {
            return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 })
        }
        if (!VALID_LEAVE_TYPES.includes(leaveType)) {
            return NextResponse.json({ error: 'ประเภทการลาไม่ถูกต้อง' }, { status: 400 })
        }

        const start = new Date(startDate)
        const end = new Date(endDate)
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ error: 'รูปแบบวันที่ไม่ถูกต้อง' }, { status: 400 })
        }
        if (end < start) {
            return NextResponse.json({ error: 'วันที่สิ้นสุดต้องอยู่หลังวันที่เริ่มต้น' }, { status: 400 })
        }

        const employee = await prisma.employee.findFirst({
            where: { userId: session.id },
            include: {
                manager: { include: { user: true } },
            },
        })
        if (!employee) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 404 })

        const totalDays = calcWorkingDays(start, end)

        // Check leave balance
        const year = start.getFullYear()
        const balance = await prisma.leaveBalance.findUnique({
            where: { employeeId_year_leaveType: { employeeId: employee.id, year, leaveType } },
        })
        if (balance) {
            const remaining = balance.entitledDays - balance.usedDays
            if (totalDays > remaining) {
                return NextResponse.json({
                    error: `โควตา${leaveType}คงเหลือไม่เพียงพอ (คงเหลือ ${remaining} วัน)`,
                }, { status: 400 })
            }
        }

        const leaveRequest = await prisma.leaveRequest.create({
            data: {
                employeeId: employee.id,
                leaveType,
                startDate: start,
                endDate: end,
                totalDays,
                reason,
                status: 'pending',
                notifiedAt: new Date(),
            },
        })

        // Notify manager via email
        const manager = employee.manager
        const managerUser = manager?.user
        if (managerUser?.name) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
            await sendLeaveRequestNotification({
                managerEmail: manager!.email,
                managerName: managerUser.name,
                employeeName: `${employee.firstNameTH} ${employee.lastNameTH}`,
                leaveType,
                startDate: start,
                endDate: end,
                totalDays,
                reason,
                approveUrl: `${appUrl}/dashboard/leave/approve`,
            }).catch(console.error)
        }

        return NextResponse.json({ data: leaveRequest }, { status: 201 })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}

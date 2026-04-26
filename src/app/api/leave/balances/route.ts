import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuth, isHrStaff } from '@/lib/route-auth'

// Default entitled days per leave type per year
const DEFAULT_ENTITLEMENTS: Record<string, number> = {
    sick: 30,
    personal: 3,
    annual: 6,
    maternity: 90,
    ordination: 15,
}

// GET /api/leave/balances — get leave balances for the current user
export async function GET(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = auth.session

    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear()
    const employeeId = searchParams.get('employeeId') // HR can query specific employee

    try {
        let targetEmployeeId: string

        // HR-staff override: query any employee's balance via ?employeeId=
        if (isHrStaff(auth) && employeeId) {
            targetEmployeeId = employeeId
        } else {
            const employee = await prisma.employee.findFirst({ where: { userId: session.id } })
            if (!employee) return NextResponse.json({ error: 'ไม่พบข้อมูลพนักงาน' }, { status: 404 })
            targetEmployeeId = employee.id
        }

        const storedBalances = await prisma.leaveBalance.findMany({
            where: { employeeId: targetEmployeeId, year },
        })

        // Build full balance list including types with no record yet
        const leaveTypes = Object.keys(DEFAULT_ENTITLEMENTS)
        const balances = leaveTypes.map(leaveType => {
            const stored = storedBalances.find(b => b.leaveType === leaveType)
            return {
                leaveType,
                year,
                entitledDays: stored?.entitledDays ?? DEFAULT_ENTITLEMENTS[leaveType],
                usedDays: stored?.usedDays ?? 0,
                remainingDays: (stored?.entitledDays ?? DEFAULT_ENTITLEMENTS[leaveType]) - (stored?.usedDays ?? 0),
            }
        })

        return NextResponse.json({ data: balances })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}

// PUT /api/leave/balances — HR update entitlement for an employee
export async function PUT(req: NextRequest) {
    const auth = await getAuth()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isHrStaff(auth)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { employeeId, year, leaveType, entitledDays } = body

        if (!employeeId || !year || !leaveType || entitledDays === undefined) {
            return NextResponse.json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 })
        }

        const balance = await prisma.leaveBalance.upsert({
            where: { employeeId_year_leaveType: { employeeId, year, leaveType } },
            create: { employeeId, year, leaveType, entitledDays, usedDays: 0 },
            update: { entitledDays },
        })

        return NextResponse.json({ data: balance })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 })
    }
}

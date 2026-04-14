import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import prisma from '@/lib/prisma'
import { CalendarClient } from './calendar-client'

export const dynamic = 'force-dynamic'

export interface Holiday {
    id: string
    date: string   // 'YYYY-MM-DD'
    name: string
    type: string
}

export interface LeaveDay {
    date: string   // 'YYYY-MM-DD'
    leaveType: string
    status: string
}

export default async function CalendarPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const year = new Date().getFullYear()
    let holidays: Holiday[] = []
    let leaveDays: LeaveDay[] = []

    // Fetch holidays for this year
    try {
        const { data } = await supabaseAdmin
            .from('holidays')
            .select('id, date, name, type')
            .eq('year', year)
            .order('date', { ascending: true })
        holidays = (data ?? []) as Holiday[]
    } catch (e) {
        console.error('[calendar] holidays fetch failed:', e)
    }

    // Fetch approved leave requests for the current employee
    try {
        const emp = await prisma.employee.findFirst({ where: { userId: session.id } })
        if (emp) {
            const reqs = await prisma.leaveRequest.findMany({
                where: {
                    employeeId: emp.id,
                    status: { in: ['approved', 'pending'] },
                },
                select: { leaveType: true, startDate: true, endDate: true, status: true },
            })

            // Expand each request into individual dates
            for (const req of reqs) {
                const start = new Date(req.startDate)
                const end = new Date(req.endDate)
                const cursor = new Date(start)
                while (cursor <= end) {
                    const dateStr = cursor.toISOString().slice(0, 10)
                    leaveDays.push({ date: dateStr, leaveType: req.leaveType, status: req.status })
                    cursor.setDate(cursor.getDate() + 1)
                }
            }
        }
    } catch (e) {
        console.error('[calendar] leave requests fetch failed:', e)
    }

    return <CalendarClient holidays={holidays} leaveDays={leaveDays} />
}

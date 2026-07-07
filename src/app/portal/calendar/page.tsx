import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import prisma from '@/lib/prisma'
import { LeaveWfhSubNav } from '@/components/layout/leave-wfh-sub-nav'
import { CalendarClient } from './calendar-client'

export const dynamic = 'force-dynamic'

import { mergeHolidays } from '@/lib/saturday-rules'

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

export interface CalendarBooking {
    id: string
    date: string   // 'YYYY-MM-DD' (in Bangkok local of starts_at)
    startsAt: string
    endsAt: string
    title: string
    bookedByName: string
}

export interface TeamLeaveDay {
    date: string   // 'YYYY-MM-DD'
    leaveType: string
    status: string
    employeeName: string
    employeeId: string
    photoUrl: string | null
}

export default async function CalendarPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const year = new Date().getFullYear()
    let holidays: Holiday[] = []
    let leaveDays: LeaveDay[] = []
    let bookings: CalendarBooking[] = []
    let teamLeaveDays: TeamLeaveDay[] = []

    // Fetch holidays for this year
    try {
        const { data } = await supabaseAdmin
            .from('holidays')
            .select('id, date, name, type')
            .eq('year', year)
            .order('date', { ascending: true })
        holidays = mergeHolidays((data ?? []) as Holiday[], year)
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

    let hasSubordinates = false
    // Fetch approved leave requests for subordinates (for managers)
    try {
        const emp = await prisma.employee.findFirst({
            where: { userId: session.id },
            include: { subordinates: { select: { id: true, firstNameTH: true, nickname: true } } }
        })
        if (emp && emp.subordinates.length > 0) {
            hasSubordinates = true
            const subordinateIds = emp.subordinates.map(s => s.id)
            const teamReqs = await prisma.leaveRequest.findMany({
                where: {
                    employeeId: { in: subordinateIds },
                    status: 'approved',
                },
                select: {
                    employeeId: true,
                    employee: { select: { firstNameTH: true, nickname: true, photoUrl: true } },
                    leaveType: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                },
            })

            for (const req of teamReqs) {
                const start = new Date(req.startDate)
                const end = new Date(req.endDate)
                const cursor = new Date(start)
                const name = req.employee.nickname || req.employee.firstNameTH || 'พนักงาน'
                while (cursor <= end) {
                    const dateStr = cursor.toISOString().slice(0, 10)
                    teamLeaveDays.push({
                        date: dateStr,
                        leaveType: req.leaveType,
                        status: req.status,
                        employeeName: name,
                        employeeId: req.employeeId,
                        photoUrl: req.employee.photoUrl ?? null,
                    })
                    cursor.setDate(cursor.getDate() + 1)
                }
            }
        }
    } catch (e) {
        console.error('[calendar] team leave requests fetch failed:', e)
    }

    // Active room bookings within ±30 days of today. Booking horizon is 7
    // days so this window comfortably covers any active booking the user
    // could navigate to from the calendar.
    try {
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        const { data } = await supabaseAdmin
            .from('room_bookings')
            .select('id, starts_at, ends_at, title, booked_by_name')
            .is('cancelled_at', null)
            .gte('starts_at', from)
            .lte('starts_at', to)
            .order('starts_at', { ascending: true })
        bookings = (data ?? []).map(b => {
            // Bangkok-local YYYY-MM-DD without depending on process timezone.
            const bkk = new Date(new Date(b.starts_at).getTime() + 7 * 60 * 60 * 1000)
            const date = `${bkk.getUTCFullYear()}-${String(bkk.getUTCMonth() + 1).padStart(2, '0')}-${String(bkk.getUTCDate()).padStart(2, '0')}`
            return {
                id: b.id,
                date,
                startsAt: b.starts_at,
                endsAt: b.ends_at,
                title: b.title,
                bookedByName: b.booked_by_name,
            }
        })
    } catch (e) {
        console.error('[calendar] room bookings fetch failed:', e)
    }

    return (
        <>
            <div className="max-w-5xl mx-auto pb-3">
                <LeaveWfhSubNav />
            </div>
            <CalendarClient holidays={holidays} leaveDays={leaveDays} bookings={bookings} teamLeaveDays={teamLeaveDays} hasSubordinates={hasSubordinates} />
        </>
    )
}

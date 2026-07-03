import { NextResponse } from 'next/server'
import { getEmployeeAttendanceSummary } from '@/lib/attendance-summary'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const employeeId = '1853ad0b-51fd-4a0b-9b93-9da10f397652' // Pui
        const summary = await getEmployeeAttendanceSummary(employeeId)
        return NextResponse.json({ summary })
    } catch (e: any) {
        return NextResponse.json({ error: e.message })
    }
}

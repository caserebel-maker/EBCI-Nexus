import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { fetchEmployeeExpenses } from '@/lib/employee-expenses'
import { PortalExpensesView } from './portal-expenses-view'

export const dynamic = 'force-dynamic'

export default async function PortalExpensesPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const employeeId = await resolveSessionEmployeeId(session)
    const benefits = employeeId ? await fetchEmployeeExpenses(employeeId) : []

    return <PortalExpensesView benefits={benefits} hasEmployeeRow={!!employeeId} />
}

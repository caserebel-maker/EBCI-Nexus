import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { resolveSessionEmployeeId } from '@/lib/session-employee'
import { fetchEmployeeExpenses } from '@/lib/employee-expenses'
import { fetchClaimCategories, fetchEmployeeClaims } from '@/lib/expense-claims'
import { PortalExpensesView } from './portal-expenses-view'
import { PortalClaimsSection } from './portal-claims-section'

export const dynamic = 'force-dynamic'

export default async function PortalExpensesPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const employeeId = await resolveSessionEmployeeId(session)
    const [benefits, claimResult, categoryResult] = await Promise.all([
        employeeId ? fetchEmployeeExpenses(employeeId) : Promise.resolve([]),
        employeeId ? fetchEmployeeClaims(employeeId) : Promise.resolve({ claims: [], missing: false }),
        fetchClaimCategories(),
    ])

    return (
        <main className="mx-auto w-full max-w-5xl space-y-8 px-1 py-2 text-white sm:px-4 lg:px-6">
            {employeeId && (
                <PortalClaimsSection
                    claims={claimResult.claims}
                    categories={categoryResult.categories}
                    notReady={claimResult.missing || categoryResult.missing}
                />
            )}
            <PortalExpensesView benefits={benefits} hasEmployeeRow={!!employeeId} />
        </main>
    )
}

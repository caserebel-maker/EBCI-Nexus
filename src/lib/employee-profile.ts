import { supabaseAdmin } from './supabase-admin'

export interface EmployeeProfile {
    id: string
    fullName: string           // "อาทิตย์ จันทร์วิภาสวงศ์ (มด)"
    nickname: string | null
    email: string
    photoUrl: string | null
    roleLabel: string          // "HR Admin" / "Manager" / "Employee"
    position: string | null
    department: string | null
    startDate: string | null   // ISO date
    dateOfBirth: string | null // ISO date
}

const ROLE_LABELS: Record<string, string> = {
    hr_admin: 'HR Admin',
    manager: 'Manager',
    employee: 'Employee',
}

export async function getEmployeeProfile(
    employeeId: string | undefined,
    fallbackName: string,
    fallbackEmail: string,
    role: string,
    authUserId?: string,
): Promise<EmployeeProfile> {
    const roleLabel = ROLE_LABELS[role] ?? 'User'

    try {
        // Lookup order:
        //   1. employees.id = session.employeeId (set on newer users)
        //   2. employees.user_id = session.id (auth user id) — covers legacy
        //      users whose user_metadata never got employeeId seeded
        //   3. employees.email = fallbackEmail (final safety net)
        const cols = 'id, first_name_th, last_name_th, nickname, email, photo_url, position, department, start_date, date_of_birth'

        type EmployeeRow = {
            id: string
            first_name_th: string | null
            last_name_th: string | null
            nickname: string | null
            email: string | null
            photo_url: string | null
            position: string | null
            department: string | null
            start_date: string | null
            date_of_birth: string | null
        }
        let data: EmployeeRow | null = null

        if (employeeId) {
            const { data: byId } = await supabaseAdmin
                .from('employees')
                .select(cols)
                .eq('id', employeeId)
                .maybeSingle()
            data = byId as EmployeeRow | null
        }

        if (!data && authUserId) {
            const { data: byUserId } = await supabaseAdmin
                .from('employees')
                .select(cols)
                .eq('user_id', authUserId)
                .maybeSingle()
            data = byUserId as EmployeeRow | null
        }

        if (!data && fallbackEmail) {
            const { data: byEmail } = await supabaseAdmin
                .from('employees')
                .select(cols)
                .eq('email', fallbackEmail)
                .maybeSingle()
            data = byEmail as EmployeeRow | null
        }

        if (!data) {
            return {
                id: employeeId,
                fullName: fallbackName,
                nickname: null,
                email: fallbackEmail,
                photoUrl: null,
                roleLabel,
                position: null,
                department: null,
                startDate: null,
                dateOfBirth: null,
            }
        }

        // Build fullName: "FirstName LastName (Nickname)" or "FirstName LastName"
        const first = data.first_name_th ?? ''
        const last = data.last_name_th ?? ''
        const nick = data.nickname ? ` (${data.nickname})` : ''
        const fullName = `${first} ${last}${nick}`.trim() || fallbackName

        return {
            id: data.id,
            fullName,
            nickname: data.nickname ?? null,
            email: data.email ?? fallbackEmail,
            photoUrl: data.photo_url ?? null,
            roleLabel,
            position: data.position ?? null,
            department: data.department ?? null,
            startDate: data.start_date ?? null,
            dateOfBirth: data.date_of_birth ?? null,
        }
    } catch (err) {
        console.error('[getEmployeeProfile] error:', err)
        return {
            id: employeeId,
            fullName: fallbackName,
            nickname: null,
            email: fallbackEmail,
            photoUrl: null,
            roleLabel,
            position: null,
            department: null,
            startDate: null,
            dateOfBirth: null,
        }
    }
}

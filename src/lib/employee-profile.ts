import { supabaseAdmin } from './supabase-admin'

export interface EmployeeProfile {
    id: string
    fullName: string           // "อาทิตย์ จันทร์วิภาสวงศ์ (มด)"
    email: string
    photoUrl: string | null
    roleLabel: string          // "HR Admin" / "Manager" / "Employee"
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
    role: string
): Promise<EmployeeProfile> {
    const roleLabel = ROLE_LABELS[role] ?? 'User'

    try {
        // Try by employeeId first; fallback to email lookup for legacy users
        // whose auth.user_metadata doesn't contain employeeId
        const query = supabaseAdmin
            .from('employees')
            .select('id, first_name_th, last_name_th, nickname, email, photo_url')

        const { data } = employeeId
            ? await query.eq('id', employeeId).maybeSingle()
            : await query.eq('email', fallbackEmail).maybeSingle()

        if (!data) {
            return {
                id: employeeId,
                fullName: fallbackName,
                email: fallbackEmail,
                photoUrl: null,
                roleLabel,
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
            email: data.email ?? fallbackEmail,
            photoUrl: data.photo_url ?? null,
            roleLabel,
        }
    } catch (err) {
        console.error('[getEmployeeProfile] error:', err)
        return {
            id: employeeId,
            fullName: fallbackName,
            email: fallbackEmail,
            photoUrl: null,
            roleLabel,
        }
    }
}

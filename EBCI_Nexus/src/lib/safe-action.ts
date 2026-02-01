import { getSession, type SessionUser } from "./auth"
import { type UserRole } from "@/config/roles"

type ActionState = { error?: string; success?: boolean; data?: any }

/**
 * Wraps a Server Action with Role-Based Security.
 * 
 * @param allowedRoles List of roles allowed to execute this action
 * @param action The actual business logic function
 */
export function authenticatedAction(
    allowedRoles: UserRole[],
    action: (user: SessionUser, formData: FormData) => Promise<ActionState>
) {
    return async (formData: FormData): Promise<ActionState> => {
        const session = await getSession()

        // 1. Check Authentication
        if (!session) {
            return { error: 'Unauthorized: Please login first' }
        }

        // 2. Check Role Authorization
        if (!allowedRoles.includes(session.role)) {
            return { error: 'Forbidden: Insufficient permissions' }
        }

        // 3. Execute Action
        return action(session, formData)
    }
}

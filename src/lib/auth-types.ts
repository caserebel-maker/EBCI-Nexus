// Types shared between server and client.
// NOTE: do not import anything from 'next/headers' or server-only modules here.

export interface SessionUser {
    id: string
    role: 'hr_admin' | 'manager' | 'employee'
    name: string
    email?: string
    employeeId?: string // linked employee record id
}

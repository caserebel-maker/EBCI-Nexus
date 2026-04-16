'use client'

import { createContext, useContext } from 'react'

export type Role = 'hr_admin' | 'manager' | 'employee'

const RoleContext = createContext<Role>('employee')

export function RoleProvider({
    role,
    children,
}: {
    role: Role
    children: React.ReactNode
}) {
    return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRole(): Role {
    return useContext(RoleContext)
}

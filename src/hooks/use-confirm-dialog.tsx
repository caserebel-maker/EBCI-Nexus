'use client'

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type ConfirmOptions = {
    title: string
    body?: string
    summary?: React.ReactNode
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'destructive' | 'warning'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmDialogContext = createContext<ConfirmFn | null>(null)

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
    const resolverRef = useRef<((value: boolean) => void) | null>(null)
    const [options, setOptions] = useState<ConfirmOptions | null>(null)

    const settle = useCallback((value: boolean) => {
        const resolver = resolverRef.current
        resolverRef.current = null
        setOptions(null)
        resolver?.(value)
    }, [])

    const confirm = useCallback<ConfirmFn>((nextOptions) => {
        resolverRef.current?.(false)
        setOptions(nextOptions)
        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve
        })
    }, [])

    const value = useMemo(() => confirm, [confirm])

    return (
        <ConfirmDialogContext.Provider value={value}>
            {children}
            <ConfirmDialog
                open={!!options}
                title={options?.title ?? ''}
                body={options?.body}
                summary={options?.summary}
                confirmLabel={options?.confirmLabel}
                cancelLabel={options?.cancelLabel}
                variant={options?.variant}
                onClose={() => settle(false)}
                onConfirm={() => settle(true)}
            />
        </ConfirmDialogContext.Provider>
    )
}

export function useConfirmDialog(): ConfirmFn {
    const ctx = useContext(ConfirmDialogContext)
    if (!ctx) {
        throw new Error('useConfirmDialog must be used inside ConfirmDialogProvider')
    }
    return ctx
}

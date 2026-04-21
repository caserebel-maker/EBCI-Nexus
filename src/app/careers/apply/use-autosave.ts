'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveState =
    | { kind: 'idle' }
    | { kind: 'saving' }
    | { kind: 'saved'; at: Date }
    | { kind: 'error'; message: string }

/**
 * Debounced autosave.
 *
 * @param dirtyPayload        Current serializable snapshot of fields to
 *                             patch. `null` means "nothing to save yet".
 * @param save                 Async function that performs the PATCH.
 *                             Resolves on success, throws on failure.
 * @param debounceMs           Idle time before firing. Default 3s per spec.
 *
 * Returns { state, flush } — `flush()` forces an immediate save (used by
 * the "Next step" button so the latest keystrokes persist before
 * navigating).
 */
export function useAutosave<T>(
    dirtyPayload: T | null,
    save: (payload: T) => Promise<void>,
    debounceMs = 3000,
) {
    const [state, setState] = useState<SaveState>({ kind: 'idle' })
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const latestPayloadRef = useRef<T | null>(null)
    const inflightRef = useRef<Promise<void> | null>(null)

    latestPayloadRef.current = dirtyPayload

    const run = useCallback(async () => {
        const payload = latestPayloadRef.current
        if (payload === null) return
        // Block concurrent saves — a later keystroke may land while the
        // previous request is in flight. We wait for it to finish, then
        // send the most recent payload.
        if (inflightRef.current) {
            try { await inflightRef.current } catch { /* superseded */ }
        }
        const current = latestPayloadRef.current
        if (current === null) return

        setState({ kind: 'saving' })
        const p = save(current)
            .then(() => setState({ kind: 'saved', at: new Date() }))
            .catch((err: unknown) => {
                setState({
                    kind: 'error',
                    message: err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ',
                })
            })
        inflightRef.current = p
        await p
        inflightRef.current = null
    }, [save])

    // Schedule a run whenever the payload ref changes
    useEffect(() => {
        if (dirtyPayload === null) return
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => { void run() }, debounceMs)
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [dirtyPayload, debounceMs, run])

    const flush = useCallback(async () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }
        await run()
    }, [run])

    return { state, flush }
}

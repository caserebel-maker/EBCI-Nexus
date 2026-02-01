'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Dashboard Crash:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-background">
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong!</h2>
            <p className="text-white/60 mb-8 max-w-md">
                The dashboard encountered an unexpected error. This usually happens due to a rendering mismatch or an interrupted connection.
            </p>
            <div className="flex gap-4">
                <Button
                    onClick={() => reset()}
                    className="bg-primary hover:bg-primary/90"
                >
                    Try again
                </Button>
                <Button
                    variant="outline"
                    onClick={() => window.location.href = '/login'}
                >
                    Back to Login
                </Button>
            </div>
            {error.message && (
                <code className="mt-8 p-4 bg-black/20 rounded-lg text-xs text-red-400 block max-w-2xl overflow-auto">
                    {error.message}
                </code>
            )}
        </div>
    )
}

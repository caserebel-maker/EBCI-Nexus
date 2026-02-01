"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ModeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="h-9 w-9 bg-white/5 rounded-md animate-pulse" />
    }

    return (
        <button
            onClick={() => {
                const nextTheme = theme === "dark" ? "light" : "dark"
                console.log("Setting theme:", nextTheme)
                setTheme(nextTheme)
            }}
            className={cn(
                "relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer active:scale-95",
                className
            )}
            style={{ pointerEvents: 'auto' }}
            aria-label="Toggle theme"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>
    )
}

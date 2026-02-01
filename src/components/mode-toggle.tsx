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



    return (
        <button
            type="button"
            onClick={() => {
                const nextTheme = theme === "dark" ? "light" : "dark"
                console.log("Setting theme to:", nextTheme)
                setTheme(nextTheme)
            }}
            className={cn(
                "relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer active:scale-95",
                className
            )}
            style={{ pointerEvents: 'auto', zIndex: 9999 }}
            aria-label="Toggle theme"
        >
            <Sun className={cn(
                "h-[1.2rem] w-[1.2rem] transition-all text-white dark:text-foreground",
                mounted && theme === "dark" ? "-rotate-90 scale-0" : "rotate-0 scale-100"
            )} />
            <Moon className={cn(
                "absolute h-[1.2rem] w-[1.2rem] transition-all text-white dark:text-foreground",
                mounted && theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"
            )} />
        </button>
    )
}

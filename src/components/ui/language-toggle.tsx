'use client'

import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import { Globe } from "lucide-react"

export function LanguageToggle() {
    const { language, toggleLanguage } = useLanguage()

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => {
                console.log("Toggling language from:", language)
                toggleLanguage()
            }}
            className="flex items-center gap-1 font-black cursor-pointer active:scale-95 text-white dark:text-foreground bg-white/10 hover:bg-white/20 dark:hover:bg-accent h-10 px-3 rounded-full"
            style={{ pointerEvents: 'auto', zIndex: 9999 }}
            title="Switch Language"
        >
            <Globe className="h-5 w-5 text-white dark:text-foreground" strokeWidth={2.2} />
            <span className="uppercase tracking-widest text-[13px]">{language}</span>
        </Button>
    )
}

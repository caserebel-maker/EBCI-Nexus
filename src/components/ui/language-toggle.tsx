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
            className="flex items-center gap-1.5 font-black cursor-pointer active:scale-95 text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-accent h-11 px-3 rounded-lg"
            style={{ pointerEvents: 'auto', zIndex: 9999 }}
            title="Switch Language"
        >
            <Globe className="h-[26px] w-[26px] text-white dark:text-foreground" strokeWidth={2.2} />
            <span className="uppercase tracking-widest text-[15px]">{language}</span>
        </Button>
    )
}

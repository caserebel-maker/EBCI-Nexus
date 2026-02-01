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
            className="flex items-center gap-2 font-medium"
            title="Switch Language"
        >
            <Globe className="h-4 w-4" />
            <span className="uppercase">{language}</span>
        </Button>
    )
}

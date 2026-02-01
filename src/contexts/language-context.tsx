'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import thCommon from '../locales/th.json'
import enCommon from '../locales/en.json'

// Type definition for the Translation Object structure (inferred from JSON)
type TranslationStructure = typeof thCommon

type Language = 'th' | 'en'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
    toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
    // Default to 'th' but try to read from storage on mount
    const [language, setLanguageState] = useState<Language>('th')
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        // Hydrate from localStorage
        const storedLang = localStorage.getItem('app-language') as Language
        if (storedLang && (storedLang === 'th' || storedLang === 'en')) {
            setLanguageState(storedLang)
        }
        setIsLoaded(true)
    }, [])

    const setLanguage = (lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem('app-language', lang)
        document.cookie = `APP_LANGUAGE=${lang}; path=/; max-age=31536000` // Sync to cookie for potential server use
    }

    const toggleLanguage = () => {
        setLanguage(language === 'th' ? 'en' : 'th')
    }

    // Translation function
    const t = (path: string): string => {
        const keys = path.split('.')
        let current: any = language === 'th' ? thCommon : enCommon

        for (const key of keys) {
            if (current[key] === undefined) {
                console.warn(`Translation key missing: ${path} for language ${language}`)
                return path // Fallback to key
            }
            current = current[key]
        }

        return current as string
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}

export function useTranslation() {
    const { t } = useLanguage()
    return { t }
}

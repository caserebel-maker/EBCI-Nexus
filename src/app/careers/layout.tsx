import Link from 'next/link'
import { Kanit } from 'next/font/google'
import { getDictionary } from '@/config/i18n'

const kanit = Kanit({
    subsets: ['thai', 'latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-kanit',
    display: 'swap',
})

export default async function CareersLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className={`min-h-screen bg-brand-gradient dark:bg-background text-foreground flex flex-col font-sans ${kanit.variable} transition-colors duration-300`}>
            {/* Public Header */}
            <header className="bg-white/5 dark:bg-card/80 backdrop-blur-md border-b border-white/10 dark:border-border sticky top-0 z-50 transition-colors">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <Link href="/careers" className="inline-flex items-center gap-3 shrink-0" aria-label="EBCI Careers">
                        {/* Silver variant for the maroon header; w-auto preserves the ~3.4:1 wordmark ratio */}
                        <img
                            src="/brand/ebci-logo-silver.png"
                            alt="EBCI"
                            className="h-9 md:h-11 w-auto dark:hidden"
                        />
                        {/* Dark-mode fallback uses the maroon variant on the neutral card bg */}
                        <img
                            src="/brand/ebci-logo-maroon.png"
                            alt="EBCI"
                            className="hidden dark:block h-9 md:h-11 w-auto"
                        />
                        <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-[0.28em] text-white/55 dark:text-primary border-l border-white/20 dark:border-border pl-3">
                            Careers
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/login" className="text-sm text-white/80 hover:text-white dark:text-muted-foreground dark:hover:text-foreground transition-colors">
                            Staff Login
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
                {children}
            </main>

            {/* Public Footer */}
            <footer className="bg-black/10 dark:bg-muted/30 border-t border-white/10 dark:border-border py-8 text-center text-white/60 dark:text-muted-foreground text-sm">
                <p>&copy; 2026 EBCI Group. All rights reserved.</p>
            </footer>
        </div>
    )
}

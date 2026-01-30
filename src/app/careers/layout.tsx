import Link from 'next/link'
import { Kanit } from 'next/font/google'
import { getDictionary } from '@/config/i18n'
import { ModeToggle } from '@/components/mode-toggle'

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
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-white/20 dark:bg-primary rounded flex items-center justify-center font-bold text-white dark:text-primary-foreground shadow-sm">N</div>
                        <span className="text-lg font-bold tracking-wide text-white dark:text-foreground">
                            EBCI NEXUS <span className="text-white/80 dark:text-primary">CAREERS</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <ModeToggle className="text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-accent" />
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

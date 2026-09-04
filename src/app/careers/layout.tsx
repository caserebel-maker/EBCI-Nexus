import Link from 'next/link'
import { Kanit } from 'next/font/google'
import { getSession } from '@/lib/auth'
import { ROLE_CONFIG, type UserRole } from '@/config/roles'

const kanit = Kanit({
    subsets: ['thai', 'latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-kanit',
    display: 'swap',
})

const NAV_ITEMS = [
    { label: 'Home', href: 'https://ebcinext.com/' },
    { label: 'About', href: 'https://ebcinext.com/about' },
    { label: 'Services', href: 'https://ebcinext.com/services' },
    { label: 'Achievements', href: 'https://ebcinext.com/work' },
    { label: 'News & Articles', href: 'https://ebcinext.com/ebci-articles' },
    { label: 'Seminar', href: 'https://ebcinext.com/seminar' },
    { label: 'Rakdi', href: 'https://ebcinext.com/rakdi' },
    { label: 'Career', href: 'https://ebcinext.com/career', active: true },
]

export default async function CareersLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()
    const role = session?.role as UserRole | undefined
    const homePath = role && ROLE_CONFIG[role] ? ROLE_CONFIG[role].homePath : '/login'
    const linkText = session ? 'Portal' : 'Staff'

    return (
        <div className={`min-h-screen bg-brand-gradient dark:bg-background text-foreground flex flex-col font-sans ${kanit.variable} transition-colors duration-300`}>
            {/* Public Header */}
            <header className="bg-[#211015]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 transition-colors shadow-[0_10px_28px_rgba(0,0,0,0.24)]">
                <div className="w-full px-5 md:px-10 lg:px-14 h-[70px] flex items-center gap-6">
                    <a href="https://ebcinext.com/" className="inline-flex items-center shrink-0" aria-label="EBCI Home">
                        <img
                            src="/brand/ebci-logo-silver.png"
                            alt="EBCI"
                            className="h-8 md:h-10 w-auto"
                        />
                    </a>
                    <nav aria-label="Main Menu" className="hidden xl:block ml-auto min-w-0">
                        <ul className="flex items-center justify-end gap-5 lg:gap-7 whitespace-nowrap">
                            {NAV_ITEMS.map(item => (
                                <li key={item.label}>
                                    <a
                                        href={item.href}
                                        className={`text-[12px] lg:text-[13px] uppercase tracking-[0.16em] transition-colors ${
                                            item.active ? 'text-[#ff2727]' : 'text-white/78 hover:text-white'
                                        }`}
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            ))}
                            <li>
                                <a
                                    href="https://ebcinext.com/tracking"
                                    className="inline-flex min-h-[42px] items-center justify-center rounded-md bg-[#e21b23] px-5 text-[12px] lg:text-[13px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_12px_24px_rgba(226,27,35,0.30)] transition-colors hover:bg-[#f02129]"
                                >
                                    EBCI Tracking
                                </a>
                            </li>
                        </ul>
                    </nav>
                    <details className="xl:hidden ml-auto group relative">
                        <summary
                            className="flex h-[42px] w-[46px] cursor-pointer list-none flex-col items-center justify-center gap-[5px] rounded-lg border border-white/20 bg-white/10 [&::-webkit-details-marker]:hidden"
                            aria-label="เปิดเมนู"
                        >
                            <span className="block h-0.5 w-5 rounded-full bg-white" />
                            <span className="block h-0.5 w-5 rounded-full bg-white" />
                            <span className="block h-0.5 w-5 rounded-full bg-white" />
                        </summary>
                        <div className="absolute right-0 top-[56px] w-[min(82vw,320px)] rounded-xl border border-white/15 bg-[#211015]/98 p-3 shadow-[0_20px_44px_rgba(0,0,0,0.42)]">
                            {NAV_ITEMS.map(item => (
                                <a
                                    key={item.label}
                                    href={item.href}
                                    className={`flex min-h-[42px] items-center rounded-lg px-3 text-[13px] uppercase tracking-[0.14em] transition-colors ${
                                        item.active ? 'bg-white/[0.08] text-white' : 'text-white/82 hover:bg-white/[0.08] hover:text-white'
                                    }`}
                                >
                                    {item.label}
                                </a>
                            ))}
                            <a
                                href="https://ebcinext.com/tracking"
                                className="mt-2 flex min-h-[44px] items-center justify-center rounded-md bg-[#e21b23] px-4 text-[13px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_12px_24px_rgba(226,27,35,0.30)] transition-colors hover:bg-[#f02129]"
                            >
                                EBCI Tracking
                            </a>
                            <Link
                                href={homePath}
                                className="mt-2 flex min-h-[40px] items-center rounded-lg px-3 text-[12px] uppercase tracking-[0.14em] text-white/55 hover:bg-white/[0.08] hover:text-white/85 transition-colors"
                            >
                                {linkText}
                            </Link>
                        </div>
                    </details>
                    <div className="hidden xl:flex items-center border-l border-white/10 pl-4">
                        <Link href={homePath} className="text-[12px] uppercase tracking-[0.16em] text-white/52 hover:text-white/85 transition-colors">
                            {linkText}
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full">
                {children}
            </main>

            {/* Public Footer */}
            <footer className="bg-black/10 dark:bg-muted/30 border-t border-white/10 dark:border-border py-8 text-center text-white/60 dark:text-muted-foreground text-sm">
                <p>&copy; 2026 EBCI Group. All rights reserved.</p>
            </footer>
        </div>
    )
}

import React from 'react'
import type { Metadata, Viewport } from 'next'
import { Kanit } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { RoleProvider } from '@/contexts/role-context'
import { getSession } from '@/lib/auth'

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-kanit',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'EBCI Nexus | HR System',
  description: 'Internal HR System for EBCI',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EBCI Nexus',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#561e23" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{
          __html: `
          window.onerror = function(msg, url, lineNo, columnNo, error) {
            console.log('GLOBAL ERROR:', msg, url, lineNo);
            return false;
          };
          console.log('Layout Bootstrapped');
        `}} />
      </head>
      <body className={cn(kanit.variable, "font-sans bg-background text-foreground min-h-screen")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <RoleProvider role={session?.role ?? 'employee'}>
              {children}
            </RoleProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}

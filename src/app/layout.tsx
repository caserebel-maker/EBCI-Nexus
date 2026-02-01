import React from 'react'
import type { Metadata } from 'next'
import { Kanit } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-kanit',
})

export const metadata: Metadata = {
  title: 'EBCI Nexus | HR System',
  description: 'Internal HR System for EBCI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}

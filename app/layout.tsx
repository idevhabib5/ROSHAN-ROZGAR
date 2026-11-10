import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Nastaliq_Urdu } from 'next/font/google'
import { AuthProvider } from '@/components/AuthProvider'
import { SessionProvider } from '@/components/SessionProvider'
import { AppShell } from '@/components/AppShell'
import { SiteHeader } from '@/components/SiteHeader'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const urdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-urdu',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Roshan Rozgar',
  description: 'Trusted nearby tradespeople for home services in Islamabad.',
  icons: { icon: '/favicon.svg' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#006B46',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${urdu.variable}`}>
      <body className={inter.className}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AuthProvider>
          <SessionProvider>
            <AppShell>
              <SiteHeader />
              <main id="main-content" className="app-main" tabIndex={-1}>
                {children}
              </main>
            </AppShell>
          </SessionProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

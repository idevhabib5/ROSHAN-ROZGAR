import type { Metadata } from 'next'
import { Inter, Noto_Nastaliq_Urdu } from 'next/font/google'
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
  description: 'Ghar ke Kaam ke Liye Bharosemand Hunarmand — Hackathon MVP',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${urdu.variable}`}>
      <body className={inter.className}>
        <SessionProvider>
          <AppShell>
            <SiteHeader />
            <main className="app-main">{children}</main>
          </AppShell>
        </SessionProvider>
      </body>
    </html>
  )
}

import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import ConfirmDialogProvider from '@/components/ConfirmDialog'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: {
    default: 'SI Terintegrasi',
    template: '%s · SI Terintegrasi',
  },
  description:
    'Sistem Informasi Terintegrasi — manajemen keuangan, aset, utilitas, dan perencanaan anggaran.',
  manifest: '/manifest.json',
  applicationName: 'SI Terintegrasi',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  themeColor: '#0c1e3e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[var(--color-navy-900)] focus:text-white focus:shadow-lg focus:text-sm"
        >
          Lompat ke konten utama
        </a>
        {children}
        <ConfirmDialogProvider />
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: 'rounded-xl border border-[var(--color-surface-200)] shadow-lg',
            },
          }}
        />
      </body>
    </html>
  )
}

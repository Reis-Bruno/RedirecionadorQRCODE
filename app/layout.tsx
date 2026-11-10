import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Placas Inteligentes', template: '%s · Placas Inteligentes' },
  description: 'Placas NFC + QR Code dinâmico para avaliações no Google, Instagram e WhatsApp.',
  applicationName: 'Placas Inteligentes',
  appleWebApp: { capable: true, title: 'Placas', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
  icons: { icon: '/icons/192', apple: '/icons/apple' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1f63b8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
